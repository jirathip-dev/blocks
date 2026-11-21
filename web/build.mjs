import { build, transform } from "esbuild";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const web = dirname(fileURLToPath(import.meta.url));
const at = (...parts) => join(web, ...parts);

const bundles = new Map(
  readdirSync(at("bundle"))
    .filter((file) => file.endsWith(".json"))
    .map((file) => [file.slice(0, -".json".length), JSON.parse(readFileSync(at("bundle", file), "utf8"))]),
);

const linked = (uses) => {
  const byEntry = new Map(uses.map((name) => [resolve(web, bundles.get(name).entry), `./${name}.js`]));
  return {
    name: "uses",
    setup(on) {
      on.onResolve({ filter: /^\./ }, (args) => {
        const path = byEntry.get(resolve(args.resolveDir, args.path));
        return path === undefined ? undefined : { path, external: true };
      });
    },
  };
};

for (const [name, bundle] of bundles) {
  const { outputFiles } = await build({
    absWorkingDir: web,
    entryPoints: [bundle.entry],
    bundle: true,
    format: "esm",
    minify: bundle.minify,
    legalComments: "none",
    external: bundle.external,
    plugins: [linked(bundle.uses)],
    write: false,
  });
  writeFileSync(at("dist", `${name}.js`), outputFiles[0].contents);
}

const css = ["base", "kind", "shell", "look"]
  .flatMap((dir) =>
    readdirSync(at("src/css", dir))
      .filter((file) => file.endsWith(".css"))
      .sort()
      .map((file) => readFileSync(at("src/css", dir, file), "utf8")),
  )
  .join("");
const minified = async (source) => (await transform(source, { loader: "css", minify: true })).code;

writeFileSync(at("dist/blocks.css"), await minified(`@layer blocks{\n${css}}\n`));
const scoped = `@layer blocks{@scope (.b-view) to (:is(.b-island, .b-app):not([data-fallback]) > *){\n${css
  .replaceAll(":root", ":scope")
  .replace(/^html\{/gm, ":scope{")}}}\n`;
writeFileSync(at("src/gen/scoped.css"), scoped);
writeFileSync(at("dist/blocks.scoped.css"), await minified(scoped));

rmSync(at("dist/types"), { recursive: true, force: true });
execFileSync(at("node_modules/.bin/tsc"), ["-p", "tsconfig.types.json"], { cwd: web, stdio: "inherit" });
