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

async function inspectFeature(directory) {
  const errors = [];
  const report = (relative, message) => errors.push(`${relative}: ${message}`);

  async function inspectEntryPoint(relative) {
    const source = await readFile(path.join(directory, relative), "utf8");
    const file = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true);
    const isServerMarker = (statement) =>
      ts.isImportDeclaration(statement) &&
      !statement.importClause &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === "server-only";

    if (file.parseDiagnostics.length) report(relative, "invalid TypeScript entry point");
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
        } else if (entry.name.endsWith(".ts")) {
          await inspectEntryPoint(child);
        }
      } else if (
        child !== "types/index.ts" &&
        (!fileRules[category].test(entry.name) || vagueNames.has(entry.name))
      ) {
        report(child, `name does not follow the ${category}/ responsibility convention`);
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
