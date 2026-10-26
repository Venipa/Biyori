const { rmSync } = require("node:fs");
const { join } = require("node:path");

// WebGPU's DirectX 12 shader compiler; the app uses no WebGPU or WebGL
const UNUSED_WIN_FILES = ["dxcompiler.dll", "dxil.dll"];

exports.default = async function afterPack(context) {
	if (context.electronPlatformName !== "win32") {
		return;
	}
	for (const file of UNUSED_WIN_FILES) {
		rmSync(join(context.appOutDir, file), { force: true });
	}
};
