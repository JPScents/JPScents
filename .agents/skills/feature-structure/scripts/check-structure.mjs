import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

import { checkSuppressions } from "./check-suppressions.mjs";

// This checks observable structure and dependencies. Semantic review remains mandatory.
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
const sourceExtension = /\.(?:[cm]?[jt]s|[jt]sx)$/;
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

function sourceTarget(filename, specifier) {
  if (specifier.startsWith("@/")) {
    return path.posix.normalize(`src/${specifier.slice(2)}`);
  }
  if (specifier.startsWith(".")) {
    return path.posix.normalize(path.posix.join(path.posix.dirname(filename), specifier));
  }
  return specifier;
}

function location(file, position) {
  const { line, character } = file.getLineAndCharacterOfPosition(position);
  return `${file.fileName}:${line + 1}:${character + 1}`;
}

function moduleReferences(file) {
  const references = [];
  function visit(node) {
    let literal;
    let bindings;
    let typeOnly = false;
    if (ts.isImportDeclaration(node)) {
      literal = node.moduleSpecifier;
      bindings = node.importClause?.name ? undefined : node.importClause?.namedBindings;
      typeOnly = node.importClause?.isTypeOnly ?? false;
    } else if (ts.isExportDeclaration(node)) {
      literal = node.moduleSpecifier;
      bindings = node.exportClause;
      typeOnly = node.isTypeOnly;
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      literal = node.moduleReference.expression;
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      literal = node.argument.literal;
      bindings = node.qualifier;
      typeOnly = true;
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      literal = node.arguments[0];
    }
    if (literal && ts.isStringLiteralLike(literal)) {
      references.push({
        target: sourceTarget(file.fileName, literal.text),
        location: location(file, literal.getStart(file)),
        bindings,
        typeOnly,
        reexport: ts.isExportDeclaration(node),
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return references;
}

function generatedSymbols(bindings, typeOnly) {
  if (!bindings) {
    return undefined;
  }
  if (ts.isNamedImports(bindings) || ts.isNamedExports(bindings)) {
    return bindings.elements.map((binding) => ({
      name: (binding.propertyName ?? binding.name).text,
      typeOnly: typeOnly || binding.isTypeOnly,
    }));
  }
  while (ts.isQualifiedName(bindings)) {
    bindings = bindings.left;
  }
  return ts.isIdentifier(bindings) ? [{ name: bindings.text, typeOnly }] : undefined;
}

function prismaBoundaryViolations(file, references) {
  const violations = [];
  const seed = file.fileName === "prisma/seed.ts";
  const lifecycle = seed || file.fileName === "src/db/prisma.ts";
  const repository =
    /^(?:src\/features\/[^/]+|prisma|scripts)\/repositories\//.test(file.fileName) &&
    fileRules.repositories.test(path.posix.basename(file.fileName));
  for (const reference of references) {
    const name = reference.target.replace(sourceExtension, "");
    const shared = /(?:^|\/)db\/prisma$/.test(name);
    const generated =
      /^@prisma\/client(?:\/|$)/.test(name) || /(?:^|\/)db\/generated(?:\/|$)/.test(name);
    const symbols = generatedSymbols(reference.bindings, reference.typeOnly);
    const allowed = symbols?.every((symbol) =>
      repository
        ? symbol.name !== "PrismaClient" || symbol.typeOnly
        : !prismaSymbols.has(symbol.name),
    );
    if (
      (shared && (!repository || reference.reexport)) ||
      (!lifecycle && name.startsWith("@prisma/adapter-")) ||
      (!lifecycle && generated && !allowed)
    ) {
      violations.push(
        `${reference.location} [ARC-09] Forbidden Prisma client access. Use the shared client in an owning repository and construct clients only in lifecycle modules.`,
      );
    }
  }
  if (repository) {
    return violations;
  }
  function inspect(node) {
    let member;
    if (ts.isPropertyAccessExpression(node)) {
      member = node.name.text;
    } else if (
      ts.isElementAccessExpression(node) &&
      node.argumentExpression &&
      ts.isStringLiteralLike(node.argumentExpression)
    ) {
      member = node.argumentExpression.text;
    }
    const lifecycleOperation =
      (lifecycle && ["$connect", "$on", "$extends"].includes(member)) ||
      (seed && member === "$disconnect");
    if (prismaOperations.has(member) && !lifecycleOperation) {
      violations.push(
        `${location(file, node.getStart(file))} [ARC-09] ${member} access belongs only in repositories. Keep database operations in the owning repository.`,
      );
    }
    ts.forEachChild(node, inspect);
  }
  inspect(file);
  return violations;
}

async function inspectFeature(directory, scoped) {
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
        report(
          relative,
          "[ARC-02] entry points allow explicit re-exports and runtime markers only",
        );
        break;
      }
    }
    if (relative === "server.ts" && !file.statements.some(isServerMarker)) {
      report(relative, '[ARC-08] server.ts must import "server-only"');
    }
  }

  async function inspectSource(relative, category) {
    const source = await readFile(path.join(directory, relative), "utf8");
    const file = ts.createSourceFile(
      `${directory}/${relative}`,
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    if (file.parseDiagnostics.length) {
      report(relative, "[ARC-02] invalid TypeScript source. Fix syntax before checking structure.");
    }
    if (scoped) {
      errors.push(...prismaBoundaryViolations(file, moduleReferences(file)));
    }
    if (!category && rootFiles.has(relative)) {
      inspectEntryPoint(relative, file);
    }
  }

  async function visit(relative = "", category) {
    const entries = await readdir(path.join(directory, relative), { withFileTypes: true });
    if (!entries.length) {
      report(relative || ".", "[ARC-02] remove empty folders");
    }

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) {
        report(child, "[ARC-02] symlinks cannot bypass feature ownership checks");
      } else if (entry.isDirectory()) {
        if (!relative && !Object.hasOwn(fileRules, entry.name)) {
          report(child, "[ARC-02] folder is not a defined responsibility; inspect its contents");
        } else if (relative && !new RegExp(`^${kebab}$`).test(entry.name)) {
          report(child, "[STD-001] subfolders must use descriptive kebab-case names");
        } else {
          await visit(child, category ?? entry.name);
        }
      } else if (!relative) {
        if (!rootFiles.has(entry.name)) {
          report(
            child,
            "[ARC-02] implementation belongs in its responsibility folder, not the feature root",
          );
        }
      } else if (
        child !== "types/index.ts" &&
        (!fileRules[category].test(entry.name) || vagueNames.has(entry.name))
      ) {
        report(child, `[STD-001] name does not follow the ${category}/ responsibility convention`);
      }
      if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name) && !entry.name.startsWith(".")) {
        await inspectSource(child, category);
      }
    }
  }

  await visit();
  return errors;
}

function inspectDependencies(file, references, graph) {
  const errors = [];
  const owner = /^src\/features\/([^/]+)\//.exec(file.fileName)?.[1];
  for (const { target, location } of references) {
    const feature = /^src\/features\/([^/]+)(.*)$/.exec(target);
    if (feature) {
      const [, targetOwner, subpath] = feature;
      const entry = subpath.replace(/\/$/, "").replace(sourceExtension, "");
      const publicEntry = ["", "/index", "/client", "/server"].includes(entry);
      if (owner !== targetOwner && !publicEntry) {
        errors.push(`${location} [ARC-07] consume ${targetOwner} through its public entry points`);
      }
      if (owner === targetOwner && publicEntry) {
        errors.push(
          `${location} [ARC-07] feature internals must not import their own barrel. Import the owning module directly.`,
        );
      }
      if (/^src\/(?:components|shared|lib|db|config)\//.test(file.fileName)) {
        errors.push(
          `${location} [ARC-07] generic shared code must not depend on features. Compose features at the route.`,
        );
      }
      if (owner !== targetOwner && graph.has(targetOwner)) {
        graph.get(owner)?.set(targetOwner, location);
      }
    }
    if (owner && (target === "src/app" || target.startsWith("src/app/"))) {
      errors.push(
        `${location} [ARC-07] features must not depend on routes. Move shared behavior to its owning feature.`,
      );
    }
  }
  return errors;
}

function findCycles(graph) {
  const errors = [];
  const visited = new Set();
  const active = new Set();
  function visit(owner) {
    visited.add(owner);
    active.add(owner);
    for (const [target, location] of graph.get(owner)) {
      if (active.has(target)) {
        const chain = [...active];
        const cycle = [...chain.slice(chain.indexOf(target)), target].join(" → ");
        errors.push(
          `${location} [ARC-07] feature dependency cycle: ${cycle}. Remove the reverse dependency or compose the features at a route.`,
        );
      } else if (!visited.has(target)) {
        visit(target);
      }
    }
    active.delete(owner);
  }
  for (const owner of graph.keys()) {
    if (!visited.has(owner)) {
      visit(owner);
    }
  }
  return errors;
}

async function readSources(directory, sources, errors) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".env")) {
      continue;
    }
    const filename = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (filename !== "src/db/generated") {
        await readSources(filename, sources, errors);
      }
    } else if (sourceExtension.test(entry.name)) {
      if (!entry.isFile()) {
        errors.push(
          `${filename} [ARC-02] cannot inspect a non-regular source file. Use an authored file in the owning module.`,
        );
        continue;
      }
      const source = await readFile(filename, "utf8");
      const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
      for (const diagnostic of file.parseDiagnostics) {
        errors.push(
          `${location(file, diagnostic.start)} [ARC-02] invalid source: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`,
        );
      }
      sources.set(filename, file);
    }
  }
}

async function main() {
  const errors = [];
  const entries = await readdir("src/features", { withFileTypes: true });
  const owners = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const args = process.argv.slice(2);
  const scoped = args.length > 0;
  const features = scoped
    ? [
        ...new Set(
          args.map((arg) =>
            path.relative(process.cwd(), path.resolve(arg)).split(path.sep).join("/"),
          ),
        ),
      ]
    : owners.map((name) => `src/features/${name}`);
  for (const directory of features) {
    const owner = /^src\/features\/([^/]+)$/.exec(directory)?.[1];
    if (!owners.includes(owner)) {
      errors.push(
        `${directory} [ARC-02] unsupported scan target. Use a direct child of src/features or omit arguments for the full check.`,
      );
      continue;
    }
    if (!new RegExp(`^${kebab}$`).test(owner)) {
      errors.push(`${directory} [STD-001] feature directories must use kebab-case.`);
      continue;
    }
    const violations = await inspectFeature(directory, scoped);
    if (violations.length) {
      errors.push(`${directory}:\n${violations.map((error) => `  ${error}`).join("\n")}`);
    }
  }
  if (!scoped) {
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        errors.push(
          `src/features/${entry.name} [ARC-02] symlinks cannot bypass feature ownership checks.`,
        );
      }
    }
    const sources = new Map();
    for (const directory of ["src", "scripts", "prisma", "tests"]) {
      await readSources(directory, sources, errors);
    }
    const graph = new Map(owners.map((owner) => [owner, new Map()]));
    for (const file of sources.values()) {
      if (file.fileName.startsWith("tests/")) {
        continue;
      }
      const references = moduleReferences(file);
      errors.push(...prismaBoundaryViolations(file, references));
      errors.push(...inspectDependencies(file, references, graph));
    }
    errors.push(...findCycles(graph));
    errors.push(...(await checkSuppressions(sources)));
  }
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
    return;
  }
  const scope = scoped
    ? `${features.join(", ")}: scoped structure and Prisma checks`
    : "Architecture and suppression checks";
  console.log(`${scope} passed. Semantic responsibility review still required.`);
}

try {
  await main();
} catch (error) {
  console.error(
    `[ARC-02] Architecture check could not complete: ${error.message}. Check the scan paths and source files.`,
  );
  process.exitCode = 1;
}
