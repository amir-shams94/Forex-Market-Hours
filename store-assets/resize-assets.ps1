# Resizes the source promo image to the exact dimensions required by the
# Chrome Web Store developer console.
#
# Outputs (placed in store-assets/):
#   promo-tile-440x280.png   (small promo tile, REQUIRED)
#   screenshot-1280x800.png  (screenshot, at least one REQUIRED)
#   marquee-1400x560.png     (large promo, OPTIONAL but recommended)

Add-Type -AssemblyName System.Drawing

$dir = $PSScriptRoot
$source = Join-Path $dir 'promo-tile-source.png'
if (-not (Test-Path $source)) {
    Write-Host "Source image not found: $source" -ForegroundColor Red
    exit 1
}

function Resize-Image {
    param(
        [string]$srcPath,
        [string]$dstPath,
        [int]$width,
        [int]$height
    )
    $src = [System.Drawing.Image]::FromFile($srcPath)
    $dst = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($dst)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    # Letterbox-style fit: preserves aspect ratio, fills background with dark navy.
    $bg = [System.Drawing.Color]::FromArgb(255, 5, 20, 39)
    $g.Clear($bg)
    $srcRatio = $src.Width / $src.Height
    $dstRatio = $width / $height
    if ($srcRatio -gt $dstRatio) {
        $newW = $width
        $newH = [int]($width / $srcRatio)
    } else {
        $newH = $height
        $newW = [int]($height * $srcRatio)
    }
    $offX = [int](($width - $newW) / 2)
    $offY = [int](($height - $newH) / 2)
    $g.DrawImage($src, $offX, $offY, $newW, $newH)
    $g.Dispose()
    $dst.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dst.Dispose()
    $src.Dispose()
    Write-Host "Saved $dstPath ($width x $height)"
}

Resize-Image -srcPath $source -dstPath (Join-Path $dir 'promo-tile-440x280.png')   -width 440  -height 280
Resize-Image -srcPath $source -dstPath (Join-Path $dir 'screenshot-1280x800.png')  -width 1280 -height 800
Resize-Image -srcPath $source -dstPath (Join-Path $dir 'marquee-1400x560.png')     -width 1400 -height 560

Write-Host ""
Write-Host "All store assets are ready in: $dir"
