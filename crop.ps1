Add-Type -AssemblyName System.Drawing

$srcPath = "images/SENSECRAFT1.png"
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Host "Original Width:" $bmp.Width "Height:" $bmp.Height

# Find non-dark bounding box (left and right black bars)
$left = $bmp.Width
$right = 0

for ($x = 0; $x -lt $bmp.Width; $x += 2) {
    for ($y = 0; $y -lt $bmp.Height; $y += 5) {
        $pixel = $bmp.GetPixel($x, $y)
        # If pixel is not dark black background (R > 30 or G > 30 or B > 30)
        if ($pixel.R -gt 35 -or $pixel.G -gt 35 -or $pixel.B -gt 35) {
            if ($x -lt $left) { $left = $x }
            if ($x -gt $right) { $right = $x }
        }
    }
}

Write-Host "Detected content left:" $left "right:" $right

$cropWidth = $right - $left
$cropHeight = $bmp.Height

if ($cropWidth -gt 50) {
    $rect = [System.Drawing.Rectangle]::FromLTRB($left, 0, $right, $cropHeight)
    $cropped = $bmp.Clone($rect, $bmp.PixelFormat)
    $bmp.Dispose()
    $cropped.Save("images/SENSECRAFT1_cropped.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
    Write-Host "Successfully saved cropped image to images/SENSECRAFT1_cropped.png"
} else {
    $bmp.Dispose()
}
