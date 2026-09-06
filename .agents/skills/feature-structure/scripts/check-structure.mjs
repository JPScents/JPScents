import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

// This checks observable structure. Responsibility and abstraction reviews remain mandatory.
const kebab = "[a-z][a-z0-9]*(?:-[a-z0-9]+)*";
const named = (suffix) => new RegExp(`^${kebab}${suffix}\\.ts$`);
const fileRules = {
  actions: named("(?:\\.admin)?\\.action"),
  components: /^[A-Z][A-Za-z0-9]*\.(?:tsx|module\.css)$/,
  hooks: /^use[A-Z][A-Za-z0-9]*\.ts$/,
  providers: /^[A-Z][A-Za-z0-9]*Provider\.tsx$/,
  repositories: named("\\.repository"),
  services: named("\\.service"),
  mappers: named("\\.mapper"),
  parsers: named("\\.parser"),
  validators: named("\\.validator"),
  schemas: named("\\.schema"),
  types: named("\\.types"),
  utils: named(""),
  constants: named(""),
  storage: named("-storage"),
  server: named(""),
};
const rootFiles = new Set(["index.ts", "server.ts", "client.ts", "README.md", "AGENTS.md"]);
const vagueNames = new Set(["helpers.ts", "common.ts", "utils.ts"]);
const prismaSymbols = new Set(["Prisma", "PrismaClient", "TransactionClient"]);
const prismaOperations = new Set([
  "$transaction",
  "$queryRaw",
  "$queryRawUnsafe",
  "$queryRawTyped",
  "$executeRaw",
  "$executeRawUnsafe",
  "$connect",
  "$disconnect",
  "$extends",
  "$on",
]);

function prismaImportIsForbidden(moduleName, bindings) {
  const name = moduleName.replace(/\\/g, "/").replace(/\.[cm]?[jt]s$/, "");
  if (/(?:^|\/)db\/prisma$/.test(name) || name.startsWith("@prisma/adapter-")) return true;

  const generatedClient =
    /^@prisma\/client(?:\/|$)/.test(name) || /(?:^|\/)db\/generated(?:\/|$)/.test(name);
  if (!generatedClient) return false;

  // Named generated models/enums remain usable as data contracts outside repositories.
  if (!bindings || (!ts.isNamedImports(bindings) && !ts.isNamedExports(bindings))) return true;
  return bindings.elements.some((binding) =>
    prismaSymbols.has((binding.propertyName ?? binding.name).text),
  );
}

function prismaBoundaryViolations(file) {
  const violations = new Set();
  function inspect(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      let bindings;
      if (ts.isImportDeclaration(node) && !node.importClause?.name) {
        bindings = node.importClause?.namedBindings;
      } else if (ts.isExportDeclaration(node)) {
        bindings = node.exportClause;
      }
      if (prismaImportIsForbidden(node.moduleSpecifier.text, bindings)) {
        violations.add("Prisma client/namespace imports and exports belong only in repositories");
      }
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0]) &&
      prismaImportIsForbidden(node.arguments[0].text)
    ) {
      violations.add("loading a Prisma client belongs only in repositories");
    }
    let member;
    if (ts.isPropertyAccessExpression(node)) {
      member = node.name.text;
    } else if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) {
      member = node.argumentExpression.text;
    }
    if (prismaOperations.has(member)) {
      violations.add(`${member} access belongs only in repositories`);
    }
    ts.forEachChild(node, inspect);
  }
  inspect(file);
  return violations;
}

async function inspectFeature(directory) {
  const errors = [];
  const report = (relative, message) => errors.push(`${relative}: ${message}`);

  function inspectEntryPoint(relative, file) {
    const isServerMarker = (statement) =>
      ts.isImportDeclaration(statement) &&
      !statement.importClause &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === "server-only";

    for (const statement of file.statements) {
      const reexport =
        ts.isExportDeclaration(statement) &&
        statement.moduleSpecifier &&
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause);
      const clientMarker =
        ts.isExpressionStatement(statement) &&
        ts.isStringLiteral(statement.expression) &&
        statement.expression.text === "use client";
      if (!reexport && !clientMarker && !isServerMarker(statement)) {
        report(relative, "entry points allow explicit re-exports and runtime markers only");
        break;
      }
    }
    if (relative === "server.ts" && !file.statements.some(isServerMarker)) {
      report(relative, 'server.ts must import "server-only"');
    }
  }

  async function inspectSource(relative, category) {
    const source = await readFile(path.join(directory, relative), "utf8");
    const file = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true);
    if (file.parseDiagnostics.length) report(relative, "invalid TypeScript source");
    if (category !== "repositories") {
      for (const violation of prismaBoundaryViolations(file)) report(relative, violation);
    }
    if (!category && rootFiles.has(relative)) inspectEntryPoint(relative, file);
  }

  async function visit(relative = "", category) {
    const entries = await readdir(path.join(directory, relative), { withFileTypes: true });
    if (!entries.length) report(relative || ".", "remove empty folders");

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) {
        report(child, "symlinks cannot bypass feature ownership checks");
      } else if (entry.isDirectory()) {
        if (!relative && !Object.hasOwn(fileRules, entry.name)) {
          report(child, "folder is not a defined responsibility; inspect its contents");
        } else if (relative && !new RegExp(`^${kebab}$`).test(entry.name)) {
          report(child, "subfolders must use descriptive kebab-case names");
        } else {
          await visit(child, category ?? entry.name);
        }
      } else if (!relative) {
        if (!rootFiles.has(entry.name)) {
          report(
            child,
            "implementation belongs in its responsibility folder, not the feature root",
          );
        }
      } else if (
        child !== "types/index.ts" &&
        (!fileRules[category].test(entry.name) || vagueNames.has(entry.name))
      ) {
        report(child, `name does not follow the ${category}/ responsibility convention`);
      }
      if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name) && !entry.name.startsWith(".")) {
        await inspectSource(child, category);
      }
    }
  }

  await visit();
  return errors;
}

const features = process.argv.slice(2);
if (!features.length) {
  console.error("Usage: node check-structure.mjs <feature-directory> [...feature-directories]");
  process.exitCode = 2;
} else {
  for (const feature of features) {
    try {
      const errors = await inspectFeature(path.resolve(feature));
      if (errors.length) {
        console.error(`${feature}:\n${errors.map((error) => `  ${error}`).join("\n")}`);
        process.exitCode = 1;
      } else {
        console.log(`${feature}: structure passed; semantic responsibility review still required`);
      }
    } catch (error) {
      console.error(`${feature}: could not inspect structure (${error.code ?? error.name})`);
      process.exitCode = 1;
    }
  }
}
