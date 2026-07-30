Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get current directory path safely
strDirectory = fso.GetAbsolutePathName(".")

' 1. Run "npm install" in visible console
MsgBox "Installing dependencies for BLVCK-DOWNLOAD... Please wait until the terminal finishes.", 64, "BLVCK-DOWNLOAD Setup"
WshShell.Run "cmd /c cd /d """ & strDirectory & """ && npm install", 1, True

' 2. Create Desktop Shortcut pointing to run.vbs
strDesktop = WshShell.SpecialFolders("Desktop")
Set objShortcut = WshShell.CreateShortcut(strDesktop & "\BLVCK-DOWNLOAD.lnk")

objShortcut.TargetPath = "wscript.exe"
objShortcut.Arguments = """" & strDirectory & "\run.vbs"""
objShortcut.WorkingDirectory = strDirectory
objShortcut.Description = "Launch BLVCK-DOWNLOAD local server"

' Use blvckicon.ico if present, fallback to wscript icon
If fso.FileExists(strDirectory & "\blvckicon.ico") Then
    objShortcut.IconLocation = strDirectory & "\blvckicon.ico"
End If

objShortcut.Save

MsgBox "Installation Complete! A shortcut named 'BLVCK-DOWNLOAD' has been created on your Desktop.", 64, "Success"