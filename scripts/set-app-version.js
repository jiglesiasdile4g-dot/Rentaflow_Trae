const fs = require("fs")
const path = require("path")

const pkgPath = path.resolve(__dirname, "..", "package.json")
const envPath = path.resolve(__dirname, "..", ".env.local")

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
const version = pkg.version

let content = ""
if (fs.existsSync(envPath)) {
  content = fs.readFileSync(envPath, "utf8")
}

const lines = content.split(/\r?\n/)
let found = false
const out = lines
  .map((line) => {
    if (line.startsWith("NEXT_PUBLIC_APP_VERSION=")) {
      found = true
      return `NEXT_PUBLIC_APP_VERSION=${version}`
    }
    return line
  })
  .filter((_, i, arr) => !(i === arr.length - 1 && arr[i] === ""))

if (!found) {
  out.push(`NEXT_PUBLIC_APP_VERSION=${version}`)
}

fs.writeFileSync(envPath, out.join("\n"))