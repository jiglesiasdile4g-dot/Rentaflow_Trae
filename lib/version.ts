import pkg from "../package.json"

export const APP_CHANNEL = process.env.NEXT_PUBLIC_APP_CHANNEL || ""
const baseVersion = process.env.NEXT_PUBLIC_APP_VERSION || (pkg as any).version || ""
export const APP_VERSION = baseVersion ? `${baseVersion}${APP_CHANNEL ? ` (${APP_CHANNEL})` : ""}` : ""
export const APP_NAME = "Dashboard Básico Alfa"
