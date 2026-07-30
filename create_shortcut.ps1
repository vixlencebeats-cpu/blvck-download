# Paths setup
$DesktopPath = [System.Environment]::GetFolderPath("Desktop")
$ProjectDir = Get-Location
$ShortcutPath = Join-Path $DesktopPath "blvck-download"
$TargetPath = Join-Path $ProjectDir "run.bat"
$IconPath = Join-Path $ProjectDir "blvckicon.ico"

# Create WScript Shell Object
$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)

# Set Shortcut Properties
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = $ProjectDir

# Attach Icon if blvckicon.ico exists
if (Test-Path $IconPath) {
    $Shortcut.IconLocation = $IconPath
} else {
    Write-Host "Warning: blvckicon.ico not found. Using default icon." -ForegroundColor Yellow
}

$Shortcut.Save()
Write-Host "Success: Desktop shortcut 'blvck-download' created with icon!" -ForegroundColor Green