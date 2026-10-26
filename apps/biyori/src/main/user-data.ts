import { existsSync, mkdirSync, renameSync } from "node:fs";
import path from "node:path";
import { app } from "electron";

// imported first in index.ts: other modules read userData at load time
const legacyDir = app.isPackaged ? app.getPath("userData") : `${app.getPath("userData")}-dev`;
const userDataDir = path.join(app.getPath("appData"), "venipa.net", app.isPackaged ? "biyori" : "biyori.dev");

// one-time move from the old <appData>/<productName> location; on failure keep using the old folder
if (!existsSync(userDataDir) && existsSync(legacyDir)) {
	try {
		mkdirSync(path.dirname(userDataDir), { recursive: true });
		renameSync(legacyDir, userDataDir);
	} catch (error) {
		console.error("userData move failed, staying on legacy folder", error);
	}
}

app.setPath("userData", existsSync(legacyDir) && !existsSync(userDataDir) ? legacyDir : userDataDir);
