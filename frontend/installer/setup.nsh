!macro customUnInstall
  ExecWait 'schtasks.exe /Delete /TN "CodeMyLife Watchdog" /F'
!macroend