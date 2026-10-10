
const ME = {
  name: "you",
  dedication: "made by me, for future me (who will thank me)",
  motto: "everything i have to hand in. closest deadline on top.",
  footer: "built at 11pm with way too much snack"
};

let tasks = [];
let currentFilter = "all";
let deletedTask = null;
let undoTimer = null;

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const subjectInput = document.getElementById("task-subject");
const priorityInput = document.getElementById("task-priority");
const dateInput = document.getElementById("task-date");
const formError = document.getElementById("form-error");
const taskList = document.getElementById("task-list");
const subjectFilter = document.getElementById("filter-subject");
const themeButton = document.getElementById("theme-toggle");
const toast = document.getElementById("toast");

function saveTasks() {
  localStorage.setItem("studyflow-tasks", JSON.stringify(tasks));
}

function loadTasks() {
  const saved = localStorage.getItem("studyflow-tasks");
  tasks = saved ? JSON.parse(saved) : [];
}

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

function daysLeft(dateString) {
  const due = new Date(dateString + "T00:00:00");
  const today = new Date(todayString() + "T00:00:00");
  return Math.round((due - today) / 86400000);
}

function formatDate(dateString) {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function dueHint(task) {
  if (task.completed) return { text: "", css: "" };

  const days = daysLeft(task.date);
  if (days < -1) return { text: "late by " + -days + " days \ud83d\ude2c", css: "due-overdue" };
  if (days === -1) return { text: "late by 1 day \ud83d\ude2c", css: "due-overdue" };
  if (days === 0) return { text: "due today!!", css: "due-soon" };
  if (days === 1) return { text: "due tomorrow", css: "due-soon" };
  if (days <= 3) return { text: "due in " + days + " days", css: "due-soon" };
  return { text: "", css: "" };
}

function addTask(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  if (title === "") {
    formError.textContent = "you forgot to write the task lol";
    return;
  }
  if (subjectInput.value === "") {
    formError.textContent = "which class is this for?";
    return;
  }
  if (priorityInput.value === "") {
    formError.textContent = "how bad is it? pick a priority";
    return;
  }
  if (dateInput.value === "") {
    formError.textContent = "when is it due?";
    return;
  }

  tasks.push({
    id: Date.now(),
    title: title,
    subject: subjectInput.value,
    priority: priorityInput.value,
    date: dateInput.value,
    completed: false
  });

  localStorage.setItem("studyflow-last", JSON.stringify({
    subject: subjectInput.value,
    priority: priorityInput.value
  }));

  saveTasks();
  renderTasks();
  updateStats();

  form.reset();
  formError.textContent = "";
  setFormDefaults();
  titleInput.focus();
}

function setFormDefaults() {
  dateInput.value = todayString();

  const last = JSON.parse(localStorage.getItem("studyflow-last") || "null");
  if (last) {
    subjectInput.value = last.subject;
    priorityInput.value = last.priority;
  }
}

function toggleTask(id) {
  const task = tasks.find(function (t) { return t.id === id; });
  task.completed = !task.completed;
  saveTasks();
  renderTasks();
  updateStats();
}

function deleteTask(id) {
  const index = tasks.findIndex(function (t) { return t.id === id; });
  deletedTask = tasks[index];
  tasks.splice(index, 1);
  saveTasks();
  renderTasks();
  updateStats();

  document.getElementById("toast-text").textContent = 'deleted "' + deletedTask.title + '"';
  toast.hidden = false;
  clearTimeout(undoTimer);
  undoTimer = setTimeout(function () {
    toast.hidden = true;
    deletedTask = null;
  }, 6000);
}

function undoDelete() {
  if (!deletedTask) return;
  tasks.push(deletedTask);
  deletedTask = null;
  toast.hidden = true;
  saveTasks();
  renderTasks();
  updateStats();
}

function filterTasks() {
  const shown = [];
  for (const task of tasks) {
    if (currentFilter === "active" && task.completed) continue;
    if (currentFilter === "completed" && !task.completed) continue;
    if (subjectFilter.value !== "all" && task.subject !== subjectFilter.value) continue;
    shown.push(task);
  }

  shown.sort(function (a, b) {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.date.localeCompare(b.date);
  });
  return shown;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderTasks() {
  const shown = filterTasks();

  if (shown.length === 0) {
    const message = tasks.length === 0 ? "nothing here yet. add your first task, i believe in you." : "nothing matches that filter.";
    taskList.innerHTML = '<p class="card empty">' + message + "</p>";
    return;
  }

  let html = "";
  for (const task of shown) {
    const hint = dueHint(task);

    let cardClass = "card task prio-" + task.priority.toLowerCase();
    if (task.completed) cardClass += " completed";
    if (hint.css === "due-overdue") cardClass += " overdue";

    html += '<article class="' + cardClass + '">';
    html += "<div>";
    html += '<div class="task-title">' + escapeHtml(task.title) + "</div>";
    html += '<div class="task-meta">';
    html += "<span>" + escapeHtml(task.subject) + "</span>";
    html += '<span class="badge priority-' + task.priority.toLowerCase() + '">' + task.priority + "</span>";
    html += "<span>" + formatDate(task.date) + "</span>";
    if (hint.text) html += '<span class="' + hint.css + '">' + hint.text + "</span>";
    html += "</div></div>";
    html += '<div class="task-actions">';
    html += '<button type="button" data-action="toggle" data-id="' + task.id + '">' + (task.completed ? "oops, not done" : "Complete") + "</button>";
    html += '<button type="button" class="delete-btn" data-action="delete" data-id="' + task.id + '">bin it</button>';
    html += "</div></article>";
  }
  taskList.innerHTML = html;
}

function updateStats() {
  let completed = 0;
  for (const task of tasks) {
    if (task.completed) completed++;
  }
  const percent = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);

  document.getElementById("stat-total").textContent = tasks.length;
  document.getElementById("stat-completed").textContent = completed;
  document.getElementById("stat-remaining").textContent = tasks.length - completed;
  document.getElementById("stat-percent").textContent = percent + "%";

  let note = tasks.length - completed + " left. you have done harder things.";
  if (tasks.length === 0) note = "add something. future you is counting on it.";
  if (tasks.length > 0 && completed === tasks.length) note = "all done. go touch grass.";
  document.getElementById("completion-note").textContent = note;
}

function showPersonalText() {
  document.getElementById("greeting").textContent = "hey " + ME.name + ", here is the plan";
  document.getElementById("dedication").textContent = ME.dedication;
  document.getElementById("motto").textContent = ME.motto;
  document.getElementById("footer-text").textContent = ME.footer;
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeButton.textContent = theme === "dark" ? "day mode" : "night mode";
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const newTheme = isDark ? "light" : "dark";
  localStorage.setItem("studyflow-theme", newTheme);
  applyTheme(newTheme);
}

form.addEventListener("submit", addTask);
themeButton.addEventListener("click", toggleTheme);
subjectFilter.addEventListener("change", renderTasks);
document.getElementById("toast-undo").addEventListener("click", undoDelete);

for (const button of document.querySelectorAll(".filter-btn")) {
  button.addEventListener("click", function () {
    currentFilter = button.dataset.filter;
    for (const other of document.querySelectorAll(".filter-btn")) {
      other.classList.remove("active");
    }
    button.classList.add("active");
    renderTasks();
  });
}

taskList.addEventListener("click", function (event) {
  const button = event.target.closest("button");
  if (!button) return;

  const id = Number(button.dataset.id);
  if (button.dataset.action === "toggle") toggleTask(id);
  if (button.dataset.action === "delete") deleteTask(id);
});

showPersonalText();
applyTheme(localStorage.getItem("studyflow-theme") || "light");
loadTasks();
setFormDefaults();
renderTasks();
updateStats();