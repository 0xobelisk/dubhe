param(
  [ValidateSet("auto", "pnpm", "npm")]
  [string]$Manager = "auto",

  [string]$Version = "latest",

  [switch]$InstallDeps,

  [switch]$DryRun,

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$CreateArgs
)

$ErrorActionPreference = "Stop"
$RequiredNodeMajor = 22
$DefaultPnpmVersion = "9.12.3"

function Write-Info {
  param([string]$Message)
  Write-Host "[dubhe-install] $Message"
}

function Fail {
  param([string]$Message)
  throw "[dubhe-install] ERROR: $Message"
}

function Has-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-External {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [switch]$AllowFailure
  )

  $printable = if ($Arguments.Count -gt 0) { "$FilePath $($Arguments -join ' ')" } else { $FilePath }

  if ($DryRun) {
    Write-Info "(dry-run) $printable"
    return $true
  }

  & $FilePath @Arguments
  $ok = ($LASTEXITCODE -eq 0)
  if (-not $ok -and -not $AllowFailure) {
    Fail "Command failed with exit code $LASTEXITCODE: $printable"
  }
  return $ok
}

function Get-NodeMajor {
  if (-not (Has-Command "node")) {
    return $null
  }
  try {
    return [int](node -p "process.versions.node.split('.')[0]")
  } catch {
    return $null
  }
}

function Refresh-Path {
  $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
  if (-not [string]::IsNullOrWhiteSpace($machinePath) -or -not [string]::IsNullOrWhiteSpace($userPath)) {
    $segments = @()
    if (-not [string]::IsNullOrWhiteSpace($machinePath)) { $segments += $machinePath }
    if (-not [string]::IsNullOrWhiteSpace($userPath)) { $segments += $userPath }
    $env:Path = ($segments -join ';')
  }
}

function Ensure-Node {
  $nodeMajor = Get-NodeMajor
  if ($nodeMajor -ne $null -and $nodeMajor -ge $RequiredNodeMajor) {
    return
  }

  if (-not $InstallDeps) {
    if ($nodeMajor -eq $null) {
      Fail "Node.js is required. Re-run with -InstallDeps or install Node.js >= $RequiredNodeMajor."
    }
    $nodeVersion = node -v
    Fail "Detected Node.js $nodeVersion. Re-run with -InstallDeps or upgrade to Node.js >= $RequiredNodeMajor."
  }

  if (-not $IsWindows) {
    Fail "Automatic dependency install in install.ps1 currently supports Windows only. Use scripts/install.sh on macOS/Linux."
  }

  Write-Info "Installing Node.js >= $RequiredNodeMajor..."

  if (Has-Command "winget") {
    Invoke-External "winget" @(
      "install",
      "--id",
      "OpenJS.NodeJS.LTS",
      "-e",
      "--accept-package-agreements",
      "--accept-source-agreements"
    ) | Out-Null
  } elseif (Has-Command "choco") {
    Invoke-External "choco" @("install", "nodejs-lts", "-y") | Out-Null
  } elseif (Has-Command "scoop") {
    Invoke-External "scoop" @("install", "nodejs-lts") | Out-Null
  } else {
    Fail "No supported installer found (winget/choco/scoop). Install Node.js manually."
  }

  if (-not $DryRun) {
    Refresh-Path
  }

  $nodeMajor = Get-NodeMajor
  if ($nodeMajor -eq $null) {
    Fail "Node.js installation did not expose 'node' in PATH. Open a new shell and retry."
  }
  if ($nodeMajor -lt $RequiredNodeMajor) {
    $nodeVersion = node -v
    Fail "Installed Node.js is still below $RequiredNodeMajor (current: $nodeVersion)."
  }
}

function Try-ActivatePnpmWithCorepack {
  if (-not (Has-Command "corepack")) {
    return $false
  }

  Invoke-External "corepack" @("enable") -AllowFailure | Out-Null
  Invoke-External "corepack" @("prepare", "pnpm@$DefaultPnpmVersion", "--activate") -AllowFailure | Out-Null
  return (Has-Command "pnpm")
}

function Try-InstallPnpmWithNpm {
  if (-not (Has-Command "npm")) {
    return $false
  }
  return (Invoke-External "npm" @("install", "-g", "pnpm@$DefaultPnpmVersion") -AllowFailure)
}

Ensure-Node

if ($Manager -eq "auto") {
  if (Has-Command "pnpm") {
    $Manager = "pnpm"
  } elseif (Try-ActivatePnpmWithCorepack) {
    $Manager = "pnpm"
  } elseif ($InstallDeps -and (Try-InstallPnpmWithNpm)) {
    $Manager = "pnpm"
  } else {
    $Manager = "npm"
  }
}

if ($Manager -eq "pnpm") {
  if (-not (Has-Command "pnpm")) {
    Try-ActivatePnpmWithCorepack | Out-Null
  }
  if (-not (Has-Command "pnpm") -and $InstallDeps) {
    Try-InstallPnpmWithNpm | Out-Null
  }
  if (-not (Has-Command "pnpm")) {
    Fail "pnpm is not installed. Re-run with -InstallDeps or install pnpm manually."
  }
  $command = "pnpm"
  $commandArgs = @("dlx", "create-dubhe@$Version")
} else {
  if (-not (Has-Command "npx")) {
    Fail "npx is required but not found in PATH."
  }
  $command = "npx"
  $commandArgs = @("--yes", "create-dubhe@$Version")
}

$nodeVersion = node -v
Write-Info "Node.js $nodeVersion detected."
Write-Info "Using package manager: $Manager"
Write-Info "Running: $command $($commandArgs -join ' ') $($CreateArgs -join ' ')"

if ($DryRun) {
  Write-Info "(dry-run) Create command skipped."
  exit 0
}

$finalArgs = @($commandArgs + $CreateArgs)
Invoke-External $command $finalArgs | Out-Null
