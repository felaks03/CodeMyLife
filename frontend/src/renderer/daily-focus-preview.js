let tasks = [];
let progress = [];
const isLiveLock = new URLSearchParams(window.location.search).get('mode') === 'lock';

const previewEndsAt = isLiveLock ? null : Date.now() + 30_000;
const list = document.getElementById('focus-list');
const remaining = document.getElementById('preview-remaining');

if (isLiveLock) {
  document.getElementById('focus-mode-label').textContent = 'CodeMyLife · Bloqueo diario';
  document.getElementById('focus-note').textContent = 'Solo puedes usar los controles de esta pantalla hasta completar tus tareas.';
  document.title = 'CodeMyLife - Bloqueo diario';
}

function elapsedSeconds(task) {
  const item = progress.find((entry) => entry.taskId === task.id);
  if (!item) return 0;
  const storedElapsed = Math.floor(Number(item.elapsedMs ?? 0) / 1000);
  if (!item.startedAt || item.completed) return storedElapsed;
  return storedElapsed + Math.floor((Date.now() - new Date(item.startedAt).getTime()) / 1000);
}

function formatTaskTime(task) {
  const left = Math.max(0, task.durationMinutes * 60 - elapsedSeconds(task));
  return `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
}

function render() {
  const activeTask = progress.find((item) => item.startedAt && !item.completed);
  list.replaceChildren();

  tasks.forEach((task) => {
    const item = progress.find((entry) => entry.taskId === task.id);
    const status = item?.completed ? 'done' : item?.startedAt ? 'active' : 'pending';
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
    const statusLabel = document.createElement('span');
    statusLabel.className = `focus-status ${status}`;
    statusLabel.textContent = status === 'pending' ? 'Pendiente' : status === 'active' ? 'En curso' : 'Completada';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = status === 'pending' ? 'Empezar' : status === 'active' ? 'Completar' : 'Hecho';
    button.disabled = status === 'done' || Boolean(activeTask && activeTask.taskId !== task.id) || (status === 'active' && elapsedSeconds(task) < task.durationMinutes * 60);
    button.addEventListener('click', async () => {
      try {
        if (status === 'pending') {
          if (isLiveLock) {
            progress = await window.codeMyLife.startDailyFocusTask(task.id);
          } else {
            const previewItem = progress.find((entry) => entry.taskId === task.id);
            previewItem.startedAt = new Date().toISOString();
          }
          if (task.id === 'backtesting') {
            void window.codeMyLife.allowComputerDuringDailyFocusPreview();
          }
        } else if (status === 'active') {
          if (isLiveLock) {
            progress = await window.codeMyLife.completeDailyFocusTask(task.id);
          } else {
            const previewItem = progress.find((entry) => entry.taskId === task.id);
            previewItem.completed = true;
            previewItem.startedAt = null;
          }
        }
        render();
      } catch {
        render();
      }
    });
    actions.append(statusLabel, button);
    row.append(info, actions);
    list.append(row);
  });
}

function tick() {
  const seconds = previewEndsAt === null ? null : Math.ceil(Math.max(0, previewEndsAt - Date.now()) / 1000);
  if (seconds !== null) remaining.textContent = `00:${String(seconds).padStart(2, '0')}`;
  if (isLiveLock) {
    void window.codeMyLife.tickDailyFocus().then((nextProgress) => {
      progress = nextProgress;
      render();
    });
  } else {
    render();
  }
  if (seconds === 0) {
    clearInterval(timer);
    void window.codeMyLife.closeDailyFocusPreview();
  }
}

async function initialize() {
  const data = await (isLiveLock ? window.codeMyLife.getDailyFocus() : window.codeMyLife.getDailyFocusPreview());
  tasks = data.tasks;
  progress = isLiveLock
    ? data.progress
    : data.progress.map((item) => ({ ...item, completed: false, startedAt: null, elapsedMs: 0 }));
  render();
  tick();
}

const timer = setInterval(tick, 1000);
void initialize();
