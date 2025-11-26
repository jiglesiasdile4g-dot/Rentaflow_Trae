export const APP_CHANNEL = process.env.NEXT_PUBLIC_APP_CHANNEL || ""
export const APP_VERSION = (process.env.NEXT_PUBLIC_APP_VERSION
  ? `${process.env.NEXT_PUBLIC_APP_VERSION}${APP_CHANNEL ? ` (${APP_CHANNEL})` : ""}`
  : "0.2.4")
export const APP_NAME = "Dashboard Básico Alfa"
