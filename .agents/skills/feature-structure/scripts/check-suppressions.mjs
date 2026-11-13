import ts from "typescript";

const assetsModule = "src/app/(public)/_lib/scent-character-content.ts";
const approvedAssets = {
  FRESH: "/scent-characters/scent-fresh-natural.png",
  WARM: "/scent-characters/scent-warm-natural.png",
  SWEET: "/scent-characters/scent-sweet-natural.png",
  WOODY: "/scent-characters/scent-woody-natural.png",
};

// EXC-001 and EXC-002 approve one decorative element in each named component.
const imageExceptions = new Map([
  [
    "src/app/(public)/_components/ScentCharacterBrowse.tsx",
    {
      component: "ScentCharacterBrowse",
      container: "Link",
      assetImport: "../_lib/scent-character-content",
    },
  ],
  [
    "src/app/(public)/help-me-choose/_components/ScentCharacterSelect.tsx",
    {
      component: "ScentCharacterSelect",
      container: "button",
      assetImport: "../../_lib/scent-character-content",
    },
  ],
]);

function descendants(node, predicate) {
  const matches = [];
  function visit(child) {
    if (predicate(child)) {
      matches.push(child);
    }
    ts.forEachChild(child, visit);
  }
  visit(node);
  return matches;
}

function comments(file) {
  const ranges = new Map();
  const jsxText = [];
  function visit(node) {
    if (ts.isJsxText(node)) {
      jsxText.push(node);
    } else {
      const leading = ts.getLeadingCommentRanges(file.text, node.pos) ?? [];
      const trailing = ts.getTrailingCommentRanges(file.text, node.end) ?? [];
      for (const range of [...leading, ...trailing]) {
        ranges.set(range.pos, range);
      }
    }
    for (const child of node.getChildren(file)) {
      visit(child);
    }
  }
  visit(file);
  return [...ranges.values()]
    .filter((range) => !jsxText.some((node) => range.pos >= node.pos && range.end <= node.end))
    .sort((a, b) => a.pos - b.pos);
}

function objectFields(node) {
  if (
    !node ||
    !ts.isObjectLiteralExpression(node) ||
    node.properties.some((entry) => !ts.isPropertyAssignment(entry) || !ts.isIdentifier(entry.name))
  ) {
    return undefined;
  }
  const fields = new Map(node.properties.map((entry) => [entry.name.text, entry.initializer]));
  return fields.size === node.properties.length ? fields : undefined;
}

function hasApprovedAssets(file) {
  if (!file) {
    return false;
  }
  const [declaration, duplicate] = descendants(
    file,
    (node) => ts.isVariableDeclaration(node) && node.name.getText(file) === "scentCharacterContent",
  );
  const fields = objectFields(declaration?.initializer);
  return (
    !duplicate &&
    fields?.size === Object.keys(approvedAssets).length &&
    Object.entries(approvedAssets).every(([key, path]) => {
      const image = objectFields(fields.get(key))?.get("image");
      return image && ts.isStringLiteral(image) && image.text === path;
    })
  );
}

function isApprovedAssetLookup(declaration, file) {
  if (
    !declaration ||
    !ts.isVariableDeclaration(declaration) ||
    declaration.name.getText(file) !== "item"
  ) {
    return false;
  }
  const initializer = declaration.initializer;
  return (
    initializer &&
    ts.isElementAccessExpression(initializer) &&
    initializer.expression.getText(file) === "scentCharacterContent" &&
    initializer.argumentExpression?.getText(file) === "value"
  );
}

function approvedImage(file, exception) {
  const images = descendants(
    file,
    (node) =>
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      node.tagName.getText(file) === "img",
  );
  const [image, additional] = images;
  if (!image || additional || !ts.isJsxSelfClosingElement(image)) {
    return undefined;
  }
  const attributes = image.attributes.properties;
  if (attributes.some(ts.isJsxSpreadAttribute)) {
    return undefined;
  }
  const sources = attributes.filter((attribute) => attribute.name.getText(file) === "src");
  const alternatives = attributes.filter((attribute) => attribute.name.getText(file) === "alt");
  const source = sources[0]?.initializer;
  const alt = alternatives[0]?.initializer;
  if (
    sources.length !== 1 ||
    alternatives.length !== 1 ||
    !source ||
    !ts.isJsxExpression(source) ||
    source.expression?.getText(file) !== "item.image" ||
    !alt ||
    !ts.isStringLiteral(alt) ||
    alt.text !== ""
  ) {
    return undefined;
  }

  const container = image.parent;
  if (
    !ts.isJsxElement(container) ||
    container.openingElement.tagName.getText(file) !== exception.container
  ) {
    return undefined;
  }
  const hasLabel =
    descendants(
      container,
      (node) => ts.isJsxExpression(node) && node.expression?.getText(file) === "item.label",
    ).length > 0;
  if (!hasLabel) {
    return undefined;
  }
  let owner = container.parent;
  while (owner && !(ts.isFunctionDeclaration(owner) && owner.name?.text === exception.component)) {
    owner = owner.parent;
  }
  if (!owner) {
    return undefined;
  }
  const itemDeclarations = descendants(
    owner,
    (node) => ts.isVariableDeclaration(node) && node.name.getText(file) === "item",
  );
  const importedMap = file.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === exception.assetImport &&
      statement.importClause?.namedBindings &&
      ts.isNamedImports(statement.importClause.namedBindings) &&
      statement.importClause.namedBindings.elements.some(
        (entry) => !entry.propertyName && entry.name.text === "scentCharacterContent",
      ),
  );
  if (
    !importedMap ||
    itemDeclarations.length !== 1 ||
    !isApprovedAssetLookup(itemDeclarations[0], file)
  ) {
    return undefined;
  }
  return image;
}

function report(file, position, message) {
  const { line, character } = file.getLineAndCharacterOfPosition(position);
  return `${file.fileName}:${line + 1}:${character + 1} [STD-025] ${message}`;
}

function matchesScopedDirective(file, range, directive, image) {
  const match = /^eslint-disable-(next-line|line) @next\/next\/no-img-element(?:\s+--\s+.+)?$/.exec(
    directive,
  );
  if (!match) {
    return false;
  }
  const imageLine = file.getLineAndCharacterOfPosition(image.getStart(file)).line;
  const directiveLine = file.getLineAndCharacterOfPosition(range.end).line;
  if (match[1] === "line") {
    return directiveLine === imageLine;
  }
  const between = file.text.slice(range.end, image.getStart(file)).trim();
  return directiveLine + 1 === imageLine && (between === "" || between === "}");
}

export function checkSuppressions(sources) {
  const errors = [];
  const assetsApproved = hasApprovedAssets(sources.get(assetsModule));
  for (const [filename, file] of sources) {
    const exception = imageExceptions.get(filename);
    const approved = exception && assetsApproved ? approvedImage(file, exception) : undefined;
    let usedScopedException = false;
    for (const range of comments(file)) {
      const raw = file.text.slice(range.pos, range.end);
      const directive = raw.slice(2, raw.startsWith("/*") ? -2 : undefined).trim();
      if (
        !/^(?:eslint(?:-disable(?:-next-line|-line)?|-enable|-env)?(?=\s|$)|@ts-(?:ignore|expect-error|nocheck)\b)/.test(
          directive,
        )
      ) {
        continue;
      }
      if (
        approved &&
        !usedScopedException &&
        matchesScopedDirective(file, range, directive, approved)
      ) {
        usedScopedException = true;
        continue;
      }
      errors.push(
        report(
          file,
          range.pos,
          "Suppression or inline rule override is outside the approved scope. Remove it or obtain a documented exception.",
        ),
      );
    }
  }
  return errors;
}
