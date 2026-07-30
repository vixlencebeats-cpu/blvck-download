Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

strDirectory = fso.GetAbsolutePathName(".")
WshShell.CurrentDirectory = strDirectory

' Open the web browser to http://localhost:5000 (0 = hidden execution)
WshShell.Run "cmd /c start http://localhost:5000", 0, False

' Launch server in background without keeping terminal window open
WshShell.Run "node server.js", 0, False