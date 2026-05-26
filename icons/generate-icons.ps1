# Generates the four PNG icon sizes the manifest references (16, 32, 48, 128)
# from the high-resolution source logo at store-assets/logo-source-1024.png.
#
# Run:
#   powershell -ExecutionPolicy Bypass -File .\icons\generate-icons.ps1

Add-Type -AssemblyName System.Drawing

$here   = $PSScriptRoot
$root   = Split-Path $here -Parent
$source = Join-Path $root 'store-assets\logo-source-1024.png'
if (-not (Test-Path $source)) {
    Write-Host "Source logo missing: $source" -ForegroundColor Red
    exit 1
}

# Find the tightest opaque bounding box so the icon fills each target size.
$src = [System.Drawing.Image]::FromFile($source)
$srcBmp = New-Object System.Drawing.Bitmap($src)
$src.Dispose()

# Center-crop a square that captures the entire rounded-square logo.
# Logo is rendered to fill the canvas edge-to-edge in the shorter dimension,
# so we use that dimension as the side length and center the crop.
[int]$side = [Math]::Min($srcBmp.Width, $srcBmp.Height)
[int]$cropX = [int](($srcBmp.Width  - $side) / 2)
[int]$cropY = [int](($srcBmp.Height - $side) / 2)
$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $side, $side)
Write-Host ("Cropping source to {0}x{0} at ({1},{2})" -f $side, $cropX, $cropY)

$cropBmp = New-Object System.Drawing.Bitmap($side, $side, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$cropG = [System.Drawing.Graphics]::FromImage($cropBmp)
$cropG.DrawImage($srcBmp, 0, 0, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
$cropG.Dispose()
$srcBmp.Dispose()

$sizes = @(16, 32, 48, 128)
foreach ($size in $sizes) {
    [int]$s = $size
    $bmp = New-Object System.Drawing.Bitmap($s, $s, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($cropBmp, 0, 0, $s, $s)
    $g.Dispose()
    $outPath = Join-Path $here ("icon{0}.png" -f $s)
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host ("Generated {0}" -f $outPath)
}

$cropBmp.Dispose()
