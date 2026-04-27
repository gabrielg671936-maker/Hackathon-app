/* ─── STATE ──────────────────────────────────────────── */
let tasks = loadTasks();
let completedToday = loadCompletedCount();

/* ─── PERSISTENCE ────────────────────────────────────── */
function saveTasks() {
  localStorage.setItem('duenow-tasks', JSON.stringify(tasks));
}

function loadTasks() {
  const raw = localStorage.getItem('duenow-tasks');
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  // Default tasks on first load
  return [
    { id: crypto.randomUUID(), name: "Math Homework", course: "Math", date: today(), priority: "high" },
    { id: crypto.randomUUID(), name: "Bio Lab Report", course: "Biology", date: tomorrow(), priority: "normal" }
  ];
}

function loadCompletedCount() {
  const key = `duenow-done-${today()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

function bumpCompletedCount() {
  completedToday++;
  localStorage.setItem(`duenow-done-${today()}`, completedToday);
  updateStreakBadge();
}

/* ─── DATE HELPERS ───────────────────────────────────── */
function today() {
  return new Date().toISOString().split("T")[0];
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysUntil(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due - now) / 86400000);
}

/* ─── INIT UI ────────────────────────────────────────── */
function initUI() {
  // Date badge
  const now = new Date();
  document.getElementById('dateBadge').textContent =
    now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Set min date on date input
  document.getElementById('date').min = today();

  updateStreakBadge();
}

function updateStreakBadge() {
  document.getElementById('completedCount').textContent = completedToday;
}

/* ─── RENDER ─────────────────────────────────────────── */
function render() {
  const todayTasks    = tasks.filter(t => t.date === today());
  const tomorrowTasks = tasks.filter(t => t.date === tomorrow());
  const upcomingTasks = tasks
    .filter(t => daysUntil(t.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  renderList('todayList', 'todayEmpty', todayTasks);
  renderList('tomorrowList', 'tomorrowEmpty', tomorrowTasks);
  renderList('upcomingList', 'upcomingEmpty', upcomingTasks, true);

  document.getElementById('todayCount').textContent =
    todayTasks.length === 0 ? '' : `${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''}`;
  document.getElementById('tomorrowCount').textContent =
    tomorrowTasks.length === 0 ? '' : `${tomorrowTasks.length} task${tomorrowTasks.length > 1 ? 's' : ''}`;
}

function renderList(listId, emptyId, taskArr, showDate = false) {
  const list  = document.getElementById(listId);
  const empty = document.getElementById(emptyId);
  list.innerHTML = '';

  if (taskArr.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  taskArr.forEach((t, i) => {
    const card = createCard(t, i, showDate);
    list.appendChild(card);
  });
}

/* ─── CARD ───────────────────────────────────────────── */
function createCard(task, i, showDate = false) {
  const card = document.createElement('div');
  card.className = `card priority-${task.priority || 'normal'}`;
  card.setAttribute('data-id', task.id);
  card.style.animationDelay = `${i * 45}ms`;

  const days = daysUntil(task.date);
  let dateLabel = '';
  if (showDate) {
    if (days === 0)      dateLabel = `<span class="meta-chip" style="color:var(--accent);border-color:rgba(58,239,184,0.2)">Today</span>`;
    else if (days === 1) dateLabel = `<span class="meta-chip">Tomorrow</span>`;
    else                 dateLabel = `<span class="meta-chip">${formatDate(task.date)}</span>`;
  }

  const priorityTag = (task.priority === 'high')
    ? `<span class="priority-tag high">Urgent</span>` : '';

  card.innerHTML = `
    <div class="card-body">
      <div class="task-name">${escHtml(task.name)}</div>
      <div class="card-meta">
        ${task.course ? `<span class="meta-chip">${escHtml(task.course)}</span>` : ''}
        ${dateLabel}
        ${priorityTag}
      </div>
    </div>
    <div class="card-right">
      <button class="done-btn" aria-label="Mark complete" onclick="done('${task.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
    </div>
  `;

  return card;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── DONE ───────────────────────────────────────────── */
function done(id) {
  const task = tasks.find(t => t.id === id);
  const el   = document.querySelector(`[data-id="${id}"]`);

  if (el) {
    el.style.transition = 'opacity 0.2s, transform 0.2s';
    el.style.opacity    = '0';
    el.style.transform  = 'translateX(12px) scale(0.97)';
  }

  if (task && task.date === today()) bumpCompletedCount();

  setTimeout(() => {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }, 200);

  showToast('Task completed ✓');
}

/* ─── TOAST ──────────────────────────────────────────── */
let toastTimer = null;

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2000);
}

/* ─── MODAL ──────────────────────────────────────────── */
document.getElementById('addBtn').onclick = openModal;

function openModal() {
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('task').focus();
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  clearFields();
}

function handleModalClick(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

function clearFields() {
  document.getElementById('task').value     = '';
  document.getElementById('course').value   = '';
  document.getElementById('date').value     = '';
  document.getElementById('priority').value = 'normal';
}

function addTask() {
  const name     = document.getElementById('task').value.trim();
  const course   = document.getElementById('course').value.trim();
  const date     = document.getElementById('date').value;
  const priority = document.getElementById('priority').value;

  if (!name || !date) {
    // Shake the empty fields
    if (!name) shake('task');
    if (!date) shake('date');
    return;
  }

  tasks.push({ id: crypto.randomUUID(), name, course, date, priority });
  saveTasks();
  closeModal();
  render();
  showToast('Task added');
}

function shake(id) {
  const el = document.getElementById(id);
  el.style.borderColor = 'var(--red)';
  el.style.animation = 'none';
  setTimeout(() => {
    el.style.borderColor = '';
  }, 800);
}

/* ─── KEYBOARD SHORTCUTS ─────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && !document.getElementById('modal').classList.contains('hidden')) {
    addTask();
  }
  // 'n' to open modal when not typing
  if (e.key === 'n' && document.activeElement.tagName === 'BODY') openModal();
});

/* ─── VIEW SWITCH ────────────────────────────────────── */
function showView(view) {
  ['dashboard', 'upcoming', 'resources'].forEach(v => {
    document.getElementById(v).classList.toggle('hidden', v !== view);
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}

/* ─── BOOT ───────────────────────────────────────────── */
initUI();
render();
