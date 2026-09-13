const tasks = [
  { name: 'Run 3k', targetMinutes: 20, status: 'pending', startedAt: null, elapsed: 0 },
  { name: 'Desayunar', targetMinutes: 15, status: 'pending', startedAt: null, elapsed: 0 },
  { name: 'Cold shower', targetMinutes: 15, status: 'pending', startedAt: null, elapsed: 0 },
  { name: 'Gym', targetMinutes: 90, status: 'pending', startedAt: null, elapsed: 0 },
  { name: 'Backtesting', targetMinutes: 60, status: 'pending', startedAt: null, elapsed: 0 }
];

const previewEndsAt = Date.now() + 30_000;
const list = document.getElementById('focus-list');
const remaining = document.getElementById('preview-remaining');

function elapsedSeconds(task) {
  if (task.status !== 'active' || !task.startedAt) return task.elapsed;
  return task.elapsed + Math.floor((Date.now() - task.startedAt) / 1000);
}

function formatTaskTime(task) {
  const left = Math.max(0, task.targetMinutes * 60 - elapsedSeconds(task));
  return `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
}

function render() {
  const activeTask = tasks.find((task) => task.status === 'active');
  list.replaceChildren();

  tasks.forEach((task) => {
    const row = document.createElement('li');
    row.className = 'focus-row';
    const info = document.createElement('div');
    info.className = 'focus-task';
    const title = document.createElement('strong');
    title.textContent = task.name;
    const timer = document.createElement('span');
    timer.textContent = formatTaskTime(task);
    info.append(title, timer);

    const actions = document.createElement('div');
    actions.className = 'focus-actions';
    const status = document.createElement('span');
    status.className = `focus-status ${task.status}`;
    status.textContent = task.status === 'pending' ? 'Pendiente' : task.status === 'active' ? 'En curso' : 'Completada';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = task.status === 'pending' ? 'Empezar' : task.status === 'active' ? 'Completar' : 'Hecho';
    button.disabled = task.status === 'done' || Boolean(activeTask && activeTask !== task) || (task.status === 'active' && elapsedSeconds(task) < task.targetMinutes * 60);
    button.addEventListener('click', () => {
      if (task.status === 'pending') {
        task.status = 'active';
        task.startedAt = Date.now();
        if (task.name === 'Backtesting') {
          void window.codeMyLife.allowComputerDuringDailyFocusPreview();
        }
      } else if (task.status === 'active') {
        task.elapsed = task.targetMinutes * 60;
        task.startedAt = null;
        task.status = 'done';
      }
      render();
    });
    actions.append(status, button);
    row.append(info, actions);
    list.append(row);
  });
}

function tick() {
  const seconds = Math.ceil(Math.max(0, previewEndsAt - Date.now()) / 1000);
  remaining.textContent = `00:${String(seconds).padStart(2, '0')}`;
  tasks.forEach((task) => {
    if (task.status === 'active' && elapsedSeconds(task) >= task.targetMinutes * 60) {
      task.elapsed = task.targetMinutes * 60;
      task.startedAt = null;
      task.status = 'done';
    }
  });
  render();
  if (seconds === 0) {
    clearInterval(timer);
    void window.codeMyLife.closeDailyFocusPreview();
  }
}

render();
const timer = setInterval(tick, 1000);
tick();
