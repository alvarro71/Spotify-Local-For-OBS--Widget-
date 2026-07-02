Set WshShell = CreateObject("WScript.Shell")
sCurDir = Replace(WScript.ScriptFullName, WScript.ScriptName, "")
sCommand = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & sCurDir & "installer-gui.ps1"""
WshShell.Run sCommand, 0, False
