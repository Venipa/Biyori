import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });

const cargoBin = join(homedir(), ".cargo", "bin");
const env = { ...process.env, PATH: `${cargoBin}${delimiter}${process.env.PATH ?? ""}` };
const extra = process.argv.slice(2);
const result = spawnSync("napi", ["build", "--platform", "--js=false", "--dts=false", ...extra], {
	stdio: "inherit",
	env,
	shell: true,
	cwd: root,
});
if ((result.status ?? 1) !== 0) {
	process.exit(result.status ?? 1);
}

for (const name of readdirSync(root)) {
	if (!name.endsWith(".node")) {
		continue;
	}
	renameSync(join(root, name), join(dist, name));
}
