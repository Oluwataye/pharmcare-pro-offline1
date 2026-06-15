Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Resolve the folder this VBS lives in (fixes the "relative path" bug when double-clicked)
strFolder = FSO.GetParentFolderName(WScript.ScriptFullName)
strBat    = strFolder & "\START_PHARMCARE.bat"

' Run the startup bat silently (0 = hidden window, False = don't wait)
WshShell.Run "cmd /c """ & strBat & """", 0, False

Set WshShell = Nothing
Set FSO = Nothing
