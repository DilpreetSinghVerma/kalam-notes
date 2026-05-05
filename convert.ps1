Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("d:\Dilpreet Singh\My Projects\Notes\build\installerSidebar.png")
$img.Save("d:\Dilpreet Singh\My Projects\Notes\build\installerSidebar.bmp", [System.Drawing.Imaging.ImageFormat]::Bmp)
$img.Dispose()
