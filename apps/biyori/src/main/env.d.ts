/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
  readonly VITE_ANILIST_CLIENT_ID: string
  readonly VITE_DISCORD_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

