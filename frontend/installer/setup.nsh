!macro customUnInit
  ${ifNot} ${isUpdated}
    ; Reads $PROGRAMDATA\CodeMyLife\anti-evasion-uninstall.json with DateTimeOffset and allows uninstall only until 5 minutes after unlockAvailableAt.
    ExecWait 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand aQBmACAAKAAhACgAVABlAHMAdAAtAFAAYQB0AGgAIAAiACQAZQBuAHYAOgBQAHIAbwBnAHIAYQBtAEQAYQB0AGEAXABDAG8AZABlAE0AeQBMAGkAZgBlAFwAYQBuAHQAaQAtAGUAdgBhAHMAaQBvAG4ALQB1AG4AaQBuAHMAdABhAGwAbAAuAGoAcwBvAG4AIgApACkAIAB7ACAAZQB4AGkAdAAgADAAIAB9ADsAIAB0AHIAeQAgAHsAIAAkAGcAIAA9ACAARwBlAHQALQBDAG8AbgB0AGUAbgB0ACAAIgAkAGUAbgB2ADoAUAByAG8AZwByAGEAbQBEAGEAdABhAFwAQwBvAGQAZQBNAHkATABpAGYAZQBcAGEAbgB0AGkALQBlAHYAYQBzAGkAbwBuAC0AdQBuAGkAbgBzAHQAYQBsAGwALgBqAHMAbwBuACIAIAAtAFIAYQB3ACAAfAAgAEMAbwBuAHYAZQByAHQARgByAG8AbQAtAEoAcwBvAG4AOwAgAGkAZgAgACgAJABnAC4AZQBuAGEAYgBsAGUAZAAgAC0AZQBxACAAJABmAGEAbABzAGUAKQAgAHsAIABlAHgAaQB0ACAAMAAgAH0AOwAgAGkAZgAgACgALQBuAG8AdAAgACQAZwAuAHUAbgBsAG8AYwBrAEEAdgBhAGkAbABhAGIAbABlAEEAdAApACAAewAgAGUAeABpAHQAIAAxACAAfQA7ACAAJAB1ACAAPQAgAFsARABhAHQAZQBUAGkAbQBlAE8AZgBmAHMAZQB0AF0AOgA6AFAAYQByAHMAZQAoAFsAcwB0AHIAaQBuAGcAXQAkAGcALgB1AG4AbABvAGMAawBBAHYAYQBpAGwAYQBiAGwAZQBBAHQAKQAuAFUAdABjAEQAYQB0AGUAVABpAG0AZQA7ACAAJABuACAAPQAgAFsARABhAHQAZQBUAGkAbQBlAF0AOgA6AFUAdABjAE4AbwB3ADsAIABpAGYAIAAoACQAbgAgAC0AbAB0ACAAJAB1ACkAIAB7ACAAZQB4AGkAdAAgADEAIAB9ADsAIABpAGYAIAAoACQAbgAgAC0AZwB0ACAAJAB1AC4AQQBkAGQATQBpAG4AdQB0AGUAcwAoADUAKQApACAAewAgAGUAeABpAHQAIAAxACAAfQA7ACAAZQB4AGkAdAAgADAAIAB9ACAAYwBhAHQAYwBoACAAewAgAGUAeABpAHQAIAAxACAAfQA=' $0
    ${if} $0 != 0
      MessageBox MB_ICONEXCLAMATION|MB_OK "CodeMyLife tiene proteccion antievasion activa. Abre la app, elige 'Salir y desactivar bloqueos' y espera a que termine el temporizador antes de desinstalar."
      Abort
    ${endif}
  ${endif}
!macroend

!macro customUnInstall
  ExecWait 'schtasks.exe /Delete /TN "CodeMyLife Watchdog" /F'
  ExecWait 'reg.exe DELETE HKLM\Software\Policies\Google\Chrome\URLBlocklist /v 9001 /F'
  ExecWait 'reg.exe DELETE HKLM\Software\Policies\Google\Chrome\URLBlocklist /v 9002 /F'
  ExecWait 'reg.exe DELETE HKLM\Software\Policies\Google\Chrome\URLBlocklist /v 9003 /F'
  ExecWait 'reg.exe DELETE HKLM\Software\Policies\Microsoft\Edge\URLBlocklist /v 9001 /F'
  ExecWait 'reg.exe DELETE HKLM\Software\Policies\Microsoft\Edge\URLBlocklist /v 9002 /F'
  ExecWait 'reg.exe DELETE HKLM\Software\Policies\Microsoft\Edge\URLBlocklist /v 9003 /F'
  ExecWait 'reg.exe DELETE HKCU\Software\Policies\Google\Chrome\URLBlocklist /v 9001 /F'
  ExecWait 'reg.exe DELETE HKCU\Software\Policies\Google\Chrome\URLBlocklist /v 9002 /F'
  ExecWait 'reg.exe DELETE HKCU\Software\Policies\Google\Chrome\URLBlocklist /v 9003 /F'
  ExecWait 'reg.exe DELETE HKCU\Software\Policies\Microsoft\Edge\URLBlocklist /v 9001 /F'
  ExecWait 'reg.exe DELETE HKCU\Software\Policies\Microsoft\Edge\URLBlocklist /v 9002 /F'
  ExecWait 'reg.exe DELETE HKCU\Software\Policies\Microsoft\Edge\URLBlocklist /v 9003 /F'
  ExecWait 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand UgBlAG0AbwB2AGUALQBJAHQAZQBtACAAIgAkAGUAbgB2ADoAUAByAG8AZwByAGEAbQBEAGEAdABhAFwAQwBvAGQAZQBNAHkATABpAGYAZQBcAGEAbgB0AGkALQBlAHYAYQBzAGkAbwBuAC0AdQBuAGkAbgBzAHQAYQBsAGwALgBqAHMAbwBuACIAIAAtAEYAbwByAGMAZQAgAC0ARQByAHIAbwByAEEAYwB0AGkAbwBuACAAUwBpAGwAZQBuAHQAbAB5AEMAbwBuAHQAaQBuAHUAZQA7ACAAZQB4AGkAdAAgADAA'
!macroend