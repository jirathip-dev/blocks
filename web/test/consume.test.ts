import { strictEqual } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repo = fileURLToPath(new URL("../..", import.meta.url));
const tsc = fileURLToPath(new URL("../node_modules/typescript/bin/tsc", import.meta.url));
const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  strictEqual(r.status, 0, `${cmd} ${args.join(" ")}\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
};

test("an app installs the packed repo root, imports choose, the CSS writer and the shell by package path, and type-checks strict", () => {
  const app = mkdtempSync(join(tmpdir(), "blocks-consume-"));
  run("npm", ["pack", "--silent", "--pack-destination", app], repo);
  const tgz = readdirSync(app).find((f) => f.endsWith(".tgz"));
  writeFileSync(join(app, "package.json"), JSON.stringify({ name: "app", private: true, type: "module" }));
  run("npm", ["install", "--offline", "--no-audit", "--no-fund", "--ignore-scripts", `./${tgz}`], app);
  writeFileSync(
    join(app, "page.ts"),
    [
      'import { choose, css, defaultPair, tiles, type Scheme } from "@jirathip-dev/blocks";',
      'import { adopt, mount, render } from "@jirathip-dev/blocks/shell";',
      "const s: Scheme = choose(null, true, {});",
      "const sheet: string = tiles + css(s) + css(defaultPair, { space: 1.25 });",
      "export const page = { sheet, adopt: adopt satisfies () => boolean, mount, render };",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(app, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { strict: true, noEmit: true, target: "ES2020", module: "NodeNext", moduleResolution: "NodeNext", lib: ["ES2020", "DOM"] }, files: ["page.ts"] }),
  );
  run(process.execPath, [tsc, "-p", "."], app);
  writeFileSync(
    join(app, "use.mjs"),
    'import { choose, css } from "@jirathip-dev/blocks"; import * as shell from "@jirathip-dev/blocks/shell"; console.log(choose(null, true).label, css(choose("x", false)).slice(0, 12), typeof shell.mount);\n',
  );
  strictEqual(run(process.execPath, ["use.mjs"], app).trim(), "Default dark :root{--bg:# function");
});
