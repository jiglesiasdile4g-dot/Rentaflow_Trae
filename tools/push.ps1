param(
  [string]$Message,
  [string]$Branch = "main",
  [string]$Tag
)

$ErrorActionPreference = "Stop"

function Run-Git {
  param([string[]]$GitArgs)
  Write-Host ("git " + ($GitArgs -join " ")) -ForegroundColor Cyan
  & git @GitArgs
  if ($LASTEXITCODE -ne 0) { throw ("git " + ($GitArgs -join " ") + " failed ($LASTEXITCODE)") }
}

$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

if (-not $Message -or $Message.Trim().Length -eq 0) {
  $Message = Read-Host "Commit message"
}

Run-Git @('status')
Run-Git @('add','-A')

$staged = & git diff --cached --name-only
if ($staged -and $staged.Count -gt 0) {
  Run-Git @('commit','-m',"$Message")
} else {
  Write-Host "No hay cambios para commitear" -ForegroundColor Yellow
}

try {
  & git rev-parse --abbrev-ref --symbolic-full-name "HEAD@{u}" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "no-upstream" }
  Run-Git @('push','origin',$Branch)
} catch {
  Run-Git @('push','-u','origin',$Branch)
}

if ($Tag -and $Tag.Trim().Length -gt 0) {
  Run-Git @('tag',$Tag)
  Run-Git @('push','origin',$Tag)
}

Write-Host "Push completado" -ForegroundColor Green