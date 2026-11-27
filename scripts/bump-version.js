const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const root = path.resolve(__dirname, "..")
const pkgPath = path.join(root, "package.json")
const lockPath = path.join(root, "package-lock.json")

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
const current = String(pkg.version || "0.0.0")

// Si el commit ya trae un cambio de versión preparado (p. ej. vía `npm version`),
// no la volvemos a incrementar.
let headVersion = null
try {
  const headPkg = execSync("git show HEAD:package.json", {
    cwd: root,
    stdio: ["ignore", "pipe", "ignore"],
  }).toString()
  headVersion = String(JSON.parse(headPkg).version || "")
} catch {
  headVersion = null
}

if (headVersion && headVersion === current) {
  const parts = current.split(".").map((n) => parseInt(n, 10) || 0)
  while (parts.length < 3) parts.push(0)
  parts[2] += 1
  const next = parts.slice(0, 3).join(".")

  pkg.version = next
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n")

  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"))
    lock.version = next
    if (lock.packages && lock.packages[""]) lock.packages[""].version = next
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n")
  }

  console.log(`Versión incrementada: ${current} -> ${next}`)
} else {
  console.log(`Versión ya modificada en este commit (${current}); no se incrementa.`)
}

require("./set-app-version.js")
