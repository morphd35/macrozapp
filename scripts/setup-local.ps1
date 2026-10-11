$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$envExample = Join-Path $root 'backend\.env.example'
$envFile = Join-Path $root 'backend\.env'

if (-not (Test-Path $envExample)) {
  Write-Error "Missing $envExample"
  exit 1
}

if (Test-Path $envFile) {
  Write-Host "backend/.env already exists. No changes made."
} else {
  Copy-Item $envExample $envFile
  Write-Host "Created backend/.env from backend/.env.example"
}

Write-Host "Running local setup..."
Push-Location $root
try {
  npm run setup:local
} finally {
  Pop-Location
}
