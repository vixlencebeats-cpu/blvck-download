[Setup]
AppName=BLVCK-DOWNLOAD
AppVersion=1.0
DefaultDirName={autopf}\BLVCK-DOWNLOAD
DefaultGroupName=BLVCK-DOWNLOAD
OutputDir=C:\Users\A\Desktop
OutputBaseFilename=BLVCK-DOWNLOAD-Setup
Compression=lzma2/ultra
SolidCompression=yes
SetupIconFile=C:\Users\A\Documents\Visual Studio\youtube-downloader\blvckicon.ico
PrivilegesRequired=lowest

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; Copy all project source files to target PC
Source: "C:\Users\A\Documents\Visual Studio\youtube-downloader\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Create desktop icon pointing to run.vbs using wscript.exe
Name: "{autodesktop}\BLVCK-DOWNLOAD"; Filename: "wscript.exe"; Parameters: """{app}\run.vbs"""; IconFilename: "{app}\blvckicon.ico"; WorkingDir: "{app}"

[Run]
; Automatically run 'npm install' on the user's PC after files are copied
Filename: "cmd.exe"; Parameters: "/c cd /d ""{app}"" && npm install"; StatusMsg: "Installing dependencies (npm install)... Please wait"; Flags: runhidden