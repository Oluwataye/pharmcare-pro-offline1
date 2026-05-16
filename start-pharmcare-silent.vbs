Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
strPath = FSO.GetParentFolderName(WScript.ScriptFullName)

' 1. Start PharmCare Pro Backend Silently
' 0 = Hide window, False = Don't wait for exit
WshShell.Run "cmd /c cd /d """ & strPath & "\server"" && node index.js", 0, False

' 2. Wait for server to initialize
WScript.Sleep 3000

' 3. Open Browser
WshShell.Run "http://localhost:3100", 9, False

Set WshShell = Nothing
Set FSO = Nothing
