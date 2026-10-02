let tasks = [];
let currentFilter = "all";
let lastDeleted = null; // used by the Undo button
let toastTimer = null;

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

function daysUntil(dateString) {
  const due = new Date(dateString + "T00:00:00");
  const today = new Date(todayString() + "T00:00:00");
  return Math.round((due - today) / 86400000);
}

function formatDate(dateString) {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function getDueHint(task) {
  if (task.completed) return { text: "", css: "" };
  const days = daysUntil(task.date);
  if (days < 0) return { text: "Overdue by " + -days + (days === -1 ? " day" : " days"), css: "due-overdue" };
  if (days === 0) return { text: "Due today", css: "due-soon" };
  if (days === 1) return { text: "Due tomorrow", css: "due-soon" };
  if (days <= 3) return { text: "Due in " + days + " days", css: "due-soon" };
  return { text: "", css: "" };
}

function addTask(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  if (title === "") return showError("Please enter a task name.");
  if (subjectInput.value === "") return showError("Please choose a subject.");
  if (priorityInput.value === "") return showError("Please choose a priority.");
  if (dateInput.value === "") return showError("Please choose a due date.");

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
  resetForm();
}

function showError(message) {
  formError.textContent = message;
}

function resetForm() {
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
  lastDeleted = tasks[index];
  tasks.splice(index, 1);
  saveTasks();
  renderTasks();
  updateStats();
  showToast('Deleted "' + lastDeleted.title + '"');
}

function undoDelete() {
  if (!lastDeleted) return;
  tasks.push(lastDeleted);
  lastDeleted = null;
  saveTasks();
  renderTasks();
  updateStats();
  toast.hidden = true;
}

function showToast(message) {
  document.getElementById("toast-text").textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.hidden = true;
    lastDeleted = null;
  }, 6000);
}

function filterTasks() {
  return tasks.filter(function (task) {
    const statusOk =
      currentFilter === "all" ||
      (currentFilter === "active" && !task.completed) ||
      (currentFilter === "completed" && task.completed);
    const subjectOk = subjectFilter.value === "all" || task.subject === subjectFilter.value;
    return statusOk && subjectOk;
  });
}

function sortTasks(list) {
  return list.sort(function (a, b) {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.date.localeCompare(b.date);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderTasks() {
  const visible = sortTasks(filterTasks());

  if (visible.length === 0) {
    const message = tasks.length === 0 ? "No tasks yet. Add your first task!" : "No tasks found.";
    taskList.innerHTML = '<p class="card empty">' + message + "</p>";
    return;
  }

  taskList.innerHTML = visible.map(function (task) {
    const hint = getDueHint(task);
    const classes = "card task" + (task.completed ? " completed" : "") + (hint.css === "due-overdue" ? " overdue" : "");
    return (
      '<article class="' + classes + '">' +
        "<div>" +
          '<div class="task-title">' + escapeHtml(task.title) + "</div>" +
          '<div class="task-meta">' +
            "<span>" + escapeHtml(task.subject) + "</span>" +
            '<span class="badge priority-' + task.priority.toLowerCase() + '">' + task.priority + "</span>" +
            "<span>" + formatDate(task.date) + "</span>" +
            (hint.text ? '<span class="' + hint.css + '">' + hint.text + "</span>" : "") +
          "</div>" +
        "</div>" +
        '<div class="task-actions">' +
          '<button type="button" data-action="toggle" data-id="' + task.id + '">' + (task.completed ? "Undo" : "Complete") + "</button>" +
          '<button type="button" class="delete-btn" data-action="delete" data-id="' + task.id + '">Delete</button>' +
        "</div>" +
      "</article>"
    );
  }).join("");
}

function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(function (t) { return t.completed; }).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-completed").textContent = completed;
  document.getElementById("stat-remaining").textContent = total - completed;
  document.getElementById("stat-percent").textContent = percent + "%";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeButton.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
}

function toggleTheme() {
  const newTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  localStorage.setItem("studyflow-theme", newTheme);
  applyTheme(newTheme);
}

form.addEventListener("submit", addTask);
themeButton.addEventListener("click", toggleTheme);
subjectFilter.addEventListener("change", renderTasks);
document.getElementById("toast-undo").addEventListener("click", undoDelete);

document.querySelectorAll(".filter-btn").forEach(function (button) {
  button.addEventListener("click", function () {
    currentFilter = button.dataset.filter;
    document.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
    button.classList.add("active");
    renderTasks();
  });
});

taskList.addEventListener("click", function (event) {
  const button = event.target.closest("button");
  if (!button) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === "toggle") toggleTask(id);
  if (button.dataset.action === "delete") deleteTask(id);
});

applyTheme(localStorage.getItem("studyflow-theme") || "light");
loadTasks();
setFormDefaults();
renderTasks();
updateStats();
