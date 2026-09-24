const updateStatus = document.getElementById('update-status');
const updateButton = document.getElementById('check-updates');

async function checkUpdates() {
  updateButton.disabled = true;
  if (updateStatus) updateStatus.textContent = 'Comprobando actualización...';
  try {
    await window.codeMyLife.checkForUpdates();
  } catch {
    if (updateStatus) updateStatus.textContent = 'No se pudo comprobar la actualización';
  } finally {
    updateButton.disabled = false;
  }
}

if (updateButton) {
  updateButton.addEventListener('click', () => {
    void checkUpdates();
  });
}

window.codeMyLife.onUpdateChecking(() => {
  if (updateStatus) updateStatus.textContent = 'Comprobando actualización...';
});
window.codeMyLife.onUpdateAvailable((version) => {
  if (updateStatus) updateStatus.textContent = `Actualización disponible: ${version}`;
});
window.codeMyLife.onUpdateNotAvailable(() => {
  if (updateStatus) updateStatus.textContent = 'Ya tienes la última versión';
});
window.codeMyLife.onUpdateDownloaded((version) => {
  if (updateStatus) updateStatus.textContent = `Actualización descargada: ${version}`;
});
window.codeMyLife.onUpdateError((message) => {
  if (updateStatus) updateStatus.textContent = message || 'Error al comprobar la actualización';
});

function lockEnd() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(8, 0, 0, 0);
  if (now >= end) end.setDate(end.getDate() + 1);
  return end;
}

function renderCountdown() {
  const remaining = Math.max(0, lockEnd().getTime() - Date.now());
  const totalSeconds = Math.ceil(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  document.getElementById('sleep-countdown').textContent =
    `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

renderCountdown();
setInterval(renderCountdown, 1000);
