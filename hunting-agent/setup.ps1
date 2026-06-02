# AntiSyphon workshop - one-shot setup for Windows (PowerShell).
# Ensures a supported Node (via Volta if needed), then installs dependencies.
# Run from the project folder:  powershell -ExecutionPolicy Bypass -File setup.ps1
$ErrorActionPreference = "Stop"
$NodePin = "22.12.0"
Write-Host "== AntiSyphon workshop setup (Windows) =="

function Test-NodeOk {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { return $false }
  $parts = (node -v).TrimStart("v").Split(".")
  $a = [int]$parts[0]; $b = [int]$parts[1]
  return (($a -eq 20 -and $b -ge 19) -or ($a -eq 22 -and $b -ge 12) -or ($a -ge 24))
}

if (Test-NodeOk) {
  Write-Host "OK: Node $(node -v) is already supported - skipping version setup."
} else {
  Write-Host "-> Node missing or unsupported. Setting up Volta + Node $NodePin..."
  if (-not (Get-Command volta -ErrorAction SilentlyContinue)) {
    Write-Host "  Installing Volta (cross-platform Node version manager)..."
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
      throw "winget not found. Install Volta manually from https://volta.sh (MSI), reopen PowerShell, then re-run this script."
    }
    winget install Volta.Volta --silent --accept-source-agreements --accept-package-agreements
  }
  # Make Volta usable in THIS shell. The Windows MSI installs volta.exe under
  # Program Files and its shims under %LOCALAPPDATA%\Volta, and updates the
  # registry PATH — none of which the current session sees yet. Refresh PATH
  # from the registry and prepend Volta's own dirs so `volta` + its managed
  # node/npm resolve immediately, without opening a new terminal.
  if (-not $env:VOLTA_HOME) { $env:VOLTA_HOME = "$env:LOCALAPPDATA\Volta" }
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$env:ProgramFiles\Volta;$env:VOLTA_HOME\bin;$machinePath;$userPath"
  volta install "node@$NodePin"
  Write-Host "OK: Now using Node $(node -v)."
}

Write-Host "-> Installing dependencies (npm install)..."
npm install

Write-Host ""
Write-Host "== Setup complete. Next steps =="
Write-Host "  1) copy .env.example to .env"
Write-Host "  2) Edit .env - set LLM_PROVIDER and add your key / pick a model"
Write-Host "  3) npm run dev - then open the http://localhost URL it prints"
