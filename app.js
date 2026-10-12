(() => {
  const KEY = "deadline-pro-v1";
  const defaultState = () => ({
    petName: "Mochi", happiness: 80, growth: 0, stage: 1,
    tasks: [], totalCompleted: 0, currentStreak: 0, bestStreak: 0,
    lastCompletedDay: null, activeDays: []
  });
  let state = loadState();
  const $ = (id) => document.getElementById(id);
  const taskForm = $("task-form");
  let editingId = null;
  let toastTimer;

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed, tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [] };
    } catch { return defaultState(); }
  }
  function saveState() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { showToast("Couldn't save here. Your browser storage may be full or blocked."); }
  }
  function showToast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  function localDay(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  }
  function prettyDate(date) {
    return new Intl.DateTimeFormat(undefined, { weekday:"short", month:"short", day:"numeric" }).format(date);
  }
  function safeText(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  }
  function taskStats() {
    const today = localDay();
    const todays = state.tasks.filter(t => !t.createdDay || t.createdDay === today);
    const completed = todays.filter(t => t.done).length;
    return { todays, completed, remaining: todays.length - completed, pct: todays.length ? Math.round(completed/todays.length*100) : 0 };
  }
  function stageForGrowth(growth) { return growth >= 100 ? 4 : growth >= 65 ? 3 : growth >= 30 ? 2 : 1; }
  function stageName(stage) { return ["", "Tiny sprout", "Little grower", "Brave buddy", "Blooming star"][stage] || "Tiny sprout"; }
  function render() {
    const stats = taskStats();
    $("date-label").textContent = new Intl.DateTimeFormat(undefined, { weekday:"long", month:"long", day:"numeric" }).format(new Date()).toUpperCase();
    $("pet-name-heading").textContent = state.petName;
    $("pet-name-input").value = state.petName;
    $("pet-stage").textContent = `${stageName(state.stage)} · Stage ${state.stage}`;
    $("happiness-value").textContent = `${state.happiness}%`;
    $("happiness-bar").style.width = `${state.happiness}%`;
    $("growth-value").textContent = `${state.growth}%`;
    $("growth-bar").style.width = `${state.growth}%`;
    $("progress-number").textContent = `${stats.pct}%`;
    $("progress-ring").style.setProperty("--progress", `${stats.pct}%`);
    $("completed-count").textContent = stats.completed;
    $("remaining-count").textContent = stats.remaining;
    $("daily-bar").style.width = `${stats.pct}%`;
    $("greeting").textContent = getGreeting();
    renderPetMessage(stats);
    const list = $("task-list");
    list.innerHTML = "";
    const sorted = [...state.tasks].sort((a,b) => Number(a.done)-Number(b.done) || (a.deadline || "9999").localeCompare(b.deadline || "9999"));
    sorted.forEach(task => list.appendChild(makeTaskElement(task)));
    $("empty-state").classList.toggle("hidden", state.tasks.length !== 0);
    $("task-list").classList.toggle("hidden", state.tasks.length === 0);
  }
  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "A fresh start, just for you and your buddy.";
    if (h < 17) return "Take a breath. One little step at a time.";
    return "You showed up today. That counts, too.";
  }
  function renderPetMessage(stats) {
    let msg = "I'm glad we're doing this together 🌼";
    if (state.tasks.length && stats.remaining === 0) msg = "Look at us go! We did it together ✨";
    else if (stats.completed > 0) msg = "Every little win helps us grow 🌱";
    else if (state.tasks.some(t => t.deadline && new Date(t.deadline) < new Date() && !t.done)) msg = "It's okay. Let's choose one small next step 💚";
    $("pet-message").textContent = msg;
    const pet = $("pet-character");
    pet.setAttribute("aria-label", `${state.petName}, your ${stageName(state.stage).toLowerCase()} companion`);
    pet.classList.toggle("celebrate", stats.remaining === 0 && state.tasks.length > 0);
  }
  function makeTaskElement(task) {
    const item = document.createElement("article");
    item.className = `task-item${task.done ? " done" : ""}`;
    const deadline = task.deadline ? new Date(task.deadline) : null;
    const overdue = deadline && deadline < new Date() && !task.done;
    const deadlineLabel = deadline && !Number.isNaN(deadline.getTime())
      ? `${overdue ? "Overdue · " : "Due "}${new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(deadline)}`
      : "No deadline";
    const priorityLabel = { gentle:"Gentle", normal:"Important", high:"Very important" }[task.priority] || "Important";
    item.innerHTML = `
      <button class="check-button" aria-label="${task.done ? "Mark incomplete" : "Complete task"}" data-action="toggle" data-id="${task.id}">${task.done ? "✓" : ""}</button>
      <div class="task-content">
        <div class="task-name">${safeText(task.title)}</div>
        <div class="task-meta"><span class="priority ${task.priority}">${priorityLabel}</span><span>${safeText(deadlineLabel)}</span></div>
      </div>
      <div class="task-actions">
        <button class="small-action" aria-label="Edit task" title="Edit" data-action="edit" data-id="${task.id}">✎</button>
        <button class="small-action" aria-label="Delete task" title="Delete" data-action="delete" data-id="${task.id}">×</button>
      </div>`;
    if (overdue) item.querySelector(".task-meta span:last-child").style.color = "#b76b4c";
    return item;
  }
  function openTaskForm(task = null) {
    editingId = task ? task.id : null;
    taskForm.classList.remove("hidden");
    $("task-title").value = task ? task.title : "";
    $("task-deadline").value = task ? task.deadline : "";
    $("task-priority").value = task ? task.priority : "normal";
    taskForm.querySelector("button[type=submit]").textContent = task ? "Save changes" : "Save little goal";
    $("add-open").classList.toggle("hidden", !task);
    taskForm.scrollIntoView({ behavior:"smooth", block:"center" });
    $("task-title").focus({preventScroll:true});
  }
  function closeTaskForm() {
    taskForm.reset(); taskForm.classList.add("hidden"); editingId = null;
    $("add-open").classList.remove("hidden");
  }
  $("add-open").addEventListener("click", () => openTaskForm());
  $("empty-add").addEventListener("click", () => openTaskForm());
  $("task-cancel").addEventListener("click", closeTaskForm);
  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = $("task-title").value.trim();
    if (!title) { showToast("Give your little goal a name first."); return; }
    const deadline = $("task-deadline").value;
    if (deadline && Number.isNaN(new Date(deadline).getTime())) { showToast("Please choose a valid deadline."); return; }
    if (deadline && new Date(deadline) < new Date() && !editingId) {
      if (!confirm("That deadline is in the past. Add it anyway?")) return;
    }
    if (editingId) {
      const task = state.tasks.find(t => t.id === editingId);
      if (task) Object.assign(task, { title, deadline, priority: $("task-priority").value });
      showToast("Your little goal has been updated ✨");
    } else {
      state.tasks.push({ id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`), title, deadline, priority: $("task-priority").value, done:false, createdDay:localDay(), completedAt:null });
      showToast("One little goal added 🌷");
    }
    saveState(); closeTaskForm(); render();
  });
  $("task-list").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const task = state.tasks.find(t => t.id === button.dataset.id);
    if (!task) return;
    const action = button.dataset.action;
    if (action === "toggle") {
      task.done = !task.done;
      if (task.done) {
        task.completedAt = new Date().toISOString();
        state.totalCompleted += 1;
        state.happiness = Math.min(100, state.happiness + 7);
        state.growth = Math.min(100, state.growth + 12);
        state.stage = stageForGrowth(state.growth);
        const today = localDay();
        if (!state.activeDays.includes(today)) {
          state.activeDays.push(today);
          const yesterday = localDay(new Date(Date.now() - 86400000));
          state.currentStreak = state.lastCompletedDay === yesterday ? state.currentStreak + 1 : 1;
          state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
          state.lastCompletedDay = today;
        }
        showToast(state.stage === 4 && state.growth === 100 ? "Your buddy has fully bloomed! ✨" : "A little win! Your buddy is growing 🌱");
      } else {
        task.completedAt = null;
        state.totalCompleted = Math.max(0, state.totalCompleted - 1);
        state.happiness = Math.max(10, state.happiness - 3);
        state.growth = Math.max(0, state.growth - 12);
        state.stage = stageForGrowth(state.growth);
        showToast("Task moved back to your list.");
      }
      saveState(); render();
    } else if (action === "edit") {
      openTaskForm(task);
    } else if (action === "delete") {
      if (confirm(`Delete "${task.title}"?`)) {
        state.tasks = state.tasks.filter(t => t.id !== task.id);
        saveState(); render(); showToast("Task removed.");
      }
    }
  });
  $("rename-open").addEventListener("click", () => {
    $("pet-name-input").value = state.petName;
    $("rename-dialog").showModal();
  });
  $("rename-form").addEventListener("submit", (event) => {
    if (event.submitter && event.submitter.value === "cancel") return;
    const name = $("pet-name-input").value.trim();
    if (!name) { event.preventDefault(); showToast("Your buddy needs a name."); return; }
    state.petName = name; saveState(); render(); showToast(`Hello, ${name}! 🌼`);
  });
  $("settings-open").addEventListener("click", () => $("settings-dialog").showModal());
  $("reset-data").addEventListener("click", () => {
    if (confirm("Reset all tasks and pet progress? This cannot be undone.")) {
      state = defaultState(); saveState(); closeTaskForm(); render();
      $("settings-dialog").close(); showToast("A fresh start. Your buddy is ready 🌷");
    }
  });
  // A gentle daily recovery: happiness may drift down, but growth and earned stages never disappear.
  function applyNewDayRecovery() {
    const today = localDay();
    const lastOpened = localStorage.getItem(`${KEY}-last-opened`);
    if (lastOpened && lastOpened !== today) {
      const daysAway = Math.min(7, Math.max(1, Math.round((new Date(today) - new Date(lastOpened))/86400000)));
      if (daysAway >= 2) state.happiness = Math.max(35, state.happiness - Math.min(8, daysAway));
    }
    try { localStorage.setItem(`${KEY}-last-opened`, today); } catch {}
  }
  applyNewDayRecovery();
  saveState();
  render();
})();