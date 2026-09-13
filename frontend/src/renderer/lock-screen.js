function nextEightAM() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(8, 0, 0, 0);
  if (now >= end) end.setDate(end.getDate() + 1);
  return end;
}

function renderCountdown() {
  const remaining = Math.max(0, nextEightAM().getTime() - Date.now());
  const totalSeconds = Math.ceil(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  document.getElementById('sleep-countdown').textContent =
    `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

renderCountdown();
setInterval(renderCountdown, 1000);
