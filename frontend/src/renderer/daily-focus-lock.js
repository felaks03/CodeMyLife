let tasks = [];
let progress = [];
const list = document.getElementById('focus-list');
const tradingViewButton = document.getElementById('open-tradingview');
const tradovateButton = document.getElementById('open-tradovate');
const notionButton = document.getElementById('open-notion');

document.getElementById('focus-mode-label').textContent = 'CodeMyLife · Bloqueo diario';
document.getElementById('focus-note').textContent = 'Solo puedes usar los controles de esta pantalla hasta completar tus tareas.';
document.title = 'CodeMyLife - Bloqueo diario';

tradingViewButton.addEventListener('click', () => {
  tradingViewButton.disabled = true;
  void window.codeMyLife.openTradingView().finally(() => {
    tradingViewButton.disabled = false;
  });
});

tradovateButton.addEventListener('click', () => {
  tradovateButton.disabled = true;
  void window.codeMyLife.openTradovate().finally(() => {
    tradovateButton.disabled = false;
  });
});

notionButton.addEventListener('click', () => {
  notionButton.disabled = true;
  void window.codeMyLife.openNotion().finally(() => {
    notionButton.disabled = false;
  });
});

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
    const meta = document.createElement('div');
    meta.className = 'focus-task-meta';
    const timer = document.createElement('span');
    timer.className = 'focus-timer';
    timer.textContent = formatTaskTime(task);
    const reward = document.createElement('span');
    reward.className = 'focus-reward';
    reward.textContent = `+${task.rewardCoins} monedas`;
    meta.append(timer, reward);
    info.append(title, meta);

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
          progress = await window.codeMyLife.startDailyFocusTask(task.id);
        } else if (status === 'active') {
          progress = await window.codeMyLife.completeDailyFocusTask(task.id);
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
  void window.codeMyLife.tickDailyFocus().then((nextProgress) => {
    progress = nextProgress;
    render();
  });
}

async function initialize() {
  const data = await window.codeMyLife.getDailyFocus();
  tasks = data.tasks;
  progress = data.progress;
  render();
  tick();
}

setInterval(tick, 1000);
void initialize();
