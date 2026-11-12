import { execFileSync } from "node:child_process";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

async function checkStagedFormat() {
  const records = git([
    "diff",
    "--cached",
    "--raw",
    "-z",
    "--no-abbrev",
    "--no-ext-diff",
    "--no-renames",
    "--diff-filter=AMT",
  ]).split("\0");
  if (records.length === 1) {
    return 0;
  }

  const prettier = await import("prettier");
  let failed = false;
  for (let index = 0; index < records.length - 1; index += 2) {
    const [, mode, , objectId] = records[index].split(" ");
    const file = records[index + 1];
    if (mode !== "100644" && mode !== "100755") {
      continue;
    }
    if (
      file.split("/").some((part) => /^\.env/i.test(part)) ||
      /\.(key|pem|p12|pfx)$/i.test(file)
    ) {
      continue;
    }

    const info = await prettier.getFileInfo(file, {
      ignorePath: [".gitignore", ".prettierignore"],
      resolveConfig: false,
    });
    if (info.ignored || !info.inferredParser) {
      continue;
    }

    try {
      const config = await prettier.resolveConfig(file, { editorconfig: true });
      const content = git(["cat-file", "blob", objectId]);
      if (await prettier.check(content, { ...config, filepath: file })) {
        continue;
      }
    } catch {
      // Parser diagnostics can include staged source. Report only the path.
    }
    console.error(`Format or parse check failed for staged file ${JSON.stringify(file)}.`);
    failed = true;
  }
  if (failed) {
    console.error("Format the affected files and stage the intended changes again.");
  }
  return failed ? 1 : 0;
}

try {
  process.exitCode = await checkStagedFormat();
} catch {
  console.error(
    "The pre-commit format check could not run. Check Git, Node and installed dependencies.",
  );
  process.exitCode = 1;
}
