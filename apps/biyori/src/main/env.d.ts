/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
	readonly VITE_ANILIST_CLIENT_ID: string;
	readonly VITE_DISCORD_CLIENT_ID: string;
	readonly VITE_APP_UPDATE_CHANNEL?: string;
	readonly VITE_APP_GIT_HASH?: string;
	readonly VITE_REPO_OWNER?: string;
	readonly VITE_REPO_NAME?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
