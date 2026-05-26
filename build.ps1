# Forex Market Hours - build script
# -----------------------------------------------------------------------------
# Produces a clean, store-ready ZIP package that can be uploaded directly to
# the Chrome Web Store (https://chrome.google.com/webstore/devconsole).
#
# Usage (from anywhere):
#   powershell -ExecutionPolicy Bypass -File .\build.ps1
#
# Output:
#   .\dist\forex-market-hours-<version>.zip   <- upload this to the Web Store
#   .\dist\forex-market-hours-<version>\      <- the unpacked tree (for sanity)
# -----------------------------------------------------------------------------

[CmdletBinding()]
param(
    [string]$OutputDir = ''
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
if ([string]::IsNullOrEmpty($root)) { $root = (Get-Location).Path }
if ([string]::IsNullOrEmpty($OutputDir)) { $OutputDir = Join-Path $root 'dist' }

Write-Host "==> Forex Market Hours - build" -ForegroundColor Cyan

# 1. Read version from manifest.
$manifestPath = Join-Path $root 'manifest.json'
if (-not (Test-Path $manifestPath)) {
    throw "manifest.json not found at $manifestPath"
}
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version  = $manifest.version
$name     = $manifest.name
Write-Host "    Name    : $name"
Write-Host "    Version : $version"

# 2. Quick sanity checks.
$requiredFiles = @(
    'manifest.json',
    'background\service-worker.js',
    'popup\popup.html',
    'popup\popup.css',
    'popup\popup.js',
    'options\options.html',
    'options\options.css',
    'options\options.js',
    'options\welcome.html',
    'lib\markets.js',
    'lib\session.js',
    'lib\storage.js',
    'lib\holidays.js',
    'lib\country-paths.js',
    'lib\country-maps.js',
    'lib\tradinghours.js',
    'icons\icon16.png',
    'icons\icon32.png',
    'icons\icon48.png',
    'icons\icon128.png'
)
foreach ($f in $requiredFiles) {
    $p = Join-Path $root $f
    if (-not (Test-Path $p)) { throw "Missing required file: $f" }
}
$reqCount = $requiredFiles.Count
Write-Host "    Required files: OK ($reqCount files)"

# 3. Prepare staging directory.
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$slug      = ($name -replace '[^a-zA-Z0-9]+', '-').ToLower().Trim('-')
$buildName = "{0}-{1}" -f $slug, $version
$stageDir  = Join-Path $OutputDir $buildName
$zipPath   = Join-Path $OutputDir ("{0}.zip" -f $buildName)

if (Test-Path $stageDir) { Remove-Item $stageDir -Recurse -Force }
if (Test-Path $zipPath)  { Remove-Item $zipPath  -Force }
New-Item -ItemType Directory -Path $stageDir | Out-Null

# 4. Copy production files (skip dev/build artifacts).
$includeDirs  = @('background', 'popup', 'options', 'lib', 'icons')
$includeFiles = @('manifest.json', 'README.md', 'PRIVACY.md')

foreach ($dir in $includeDirs) {
    $src = Join-Path $root $dir
    if (Test-Path $src) {
        $dst = Join-Path $stageDir $dir
        Copy-Item -Path $src -Destination $dst -Recurse -Force
    }
}
foreach ($file in $includeFiles) {
    $src = Join-Path $root $file
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination (Join-Path $stageDir $file) -Force
    }
}

# 5. Strip files that should NOT ship to users.
$stripPatterns = @(
    'icons\generate-icons.ps1',
    'store-assets'
)
foreach ($pat in $stripPatterns) {
    $p = Join-Path $stageDir $pat
    if (Test-Path $p) { Remove-Item $p -Recurse -Force }
}

# 6. Create the ZIP package.
Write-Host "==> Creating ZIP package..." -ForegroundColor Cyan
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    $stageDir, $zipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
)

# 7. Report.
$zipSizeKb = [math]::Round((Get-Item $zipPath).Length / 1KB, 1)
Write-Host ""
Write-Host "Build succeeded." -ForegroundColor Green
Write-Host "    Staging : $stageDir"
Write-Host ("    Package : {0} ({1} KB)" -f $zipPath, $zipSizeKb)
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1) Upload the ZIP to https://chrome.google.com/webstore/devconsole"
Write-Host "     (one-time `$5 developer registration fee applies)"
Write-Host ""
Write-Host "  OR, for local sideload installation:"
Write-Host "  2) Visit chrome://extensions, enable Developer mode,"
Write-Host "     click 'Pack extension' and select this staging folder:"
Write-Host "     $stageDir"
Write-Host ""
