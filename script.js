
const $ = (id) => document.getElementById(id);

const STORAGE = {
  tasks: "sf_tasks",
  exams: "sf_exams",
  grades: "sf_grades",
  settings: "sf_settings",
  studies: "sf_studies"
};

function load(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let tasks = load(STORAGE.tasks);
let exams = load(STORAGE.exams);
let grades = load(STORAGE.grades);
let settings = load(STORAGE.settings, {});
let studies = load(STORAGE.studies);

let timerDuration = 25 * 60;
let timerRemaining = timerDuration;
let timerInterval = null;
let timerRunning = false;

const faNumber = (value) =>
  Number(value || 0).toLocaleString("fa-IR");

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toPersianDate(value) {
  if (!value) return "بدون تاریخ";
  const date = new Date(value + "T12:00:00");
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function emptyState(icon, message) {
  return `
    <div class="empty-state">
      <i class="fa-solid ${icon}"></i>
      <p>${message}</p>
    </div>`;
}

/* Navigation */

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === pageId);
  });

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.page === pageId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.go);
  });
});

/* Theme */

function applyTheme() {
  const dark = settings.theme === "dark";
  document.body.classList.toggle("dark", dark);

  const icon = $("themeToggle")?.querySelector("i");
  if (icon) {
    icon.className = dark
      ? "fa-solid fa-sun"
      : "fa-solid fa-moon";
  }
}

$("themeToggle")?.addEventListener("click", () => {
  settings.theme = settings.theme === "dark" ? "light" : "dark";
  save(STORAGE.settings, settings);
  applyTheme();
});

/* Dashboard */

function renderDashboard() {
  const completed = tasks.filter(task => task.completed).length;

  if ($("totalTasks")) $("totalTasks").textContent = faNumber(tasks.length);
  if ($("completedTasks")) $("completedTasks").textContent = faNumber(completed);
  if ($("remainingTasks")) $("remainingTasks").textContent = faNumber(tasks.length - completed);

  const todayMinutes = studies
    .filter(item => item.date === todayISO())
    .reduce((sum, item) => sum + Number(item.duration || 0), 0);

  if ($("todayStudyTime")) {
    $("todayStudyTime").textContent = faNumber(todayMinutes);
  }

  if ($("todayDate")) {
    $("todayDate").textContent = new Intl.DateTimeFormat("fa-IR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(new Date());
  }

  if ($("welcomeName")) {
    $("welcomeName").textContent = settings.name || "دانش‌آموز پرتلاش!";
  }

  renderUpcomingExams();
}

function renderUpcomingExams() {
  const container = $("upcomingExams");
  if (!container) return;

  const upcoming = exams
    .filter(exam => exam.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  if (!upcoming.length) {
    container.innerHTML = emptyState(
      "fa-calendar-check",
      "هنوز امتحان پیش‌رو ثبت نکردی"
    );
    return;
  }

  container.innerHTML = upcoming.map(exam => `
    <div class="list-item">
      <div>
        <strong>${escapeHTML(exam.subject)}</strong>
        <small>${toPersianDate(exam.date)}</small>
      </div>
      <span>${daysUntil(exam.date)}</span>
    </div>
  `).join("");
}

function daysUntil(date) {
  const start = new Date(todayISO() + "T00:00:00");
  const end = new Date(date + "T00:00:00");
  const days = Math.ceil((end - start) / 86400000);

  if (days === 0) return "امروز";
  if (days === 1) return "فردا";
  return `${faNumber(days)} روز دیگر`;
}

/* Tasks */

function addTask() {
  const title = $("taskInput")?.value.trim();
  const subject = $("taskSubject")?.value.trim();
  const date = $("taskDate")?.value;
  const priority = $("taskPriority")?.value || "medium";

  if (!title) {
    alert("عنوان تکلیف رو وارد کن.");
    return;
  }

  tasks.push({
    id: Date.now(),
    title,
    subject,
    date,
    priority,
    completed: false
  });

  save(STORAGE.tasks, tasks);

  $("taskInput").value = "";
  $("taskSubject").value = "";
  $("taskDate").value = "";

  renderAll();
}

function renderTasks() {
  const container = $("taskList");
  if (!container) return;

  if (!tasks.length) {
    container.innerHTML = emptyState("fa-clipboard-list", "هنوز تکلیفی ثبت نکردی");
    return;
  }

  container.innerHTML = tasks.map(task => {
    const priorityText = {
      low: "کم",
      medium: "متوسط",
      high: "زیاد"
    }[task.priority] || "متوسط";

    return `
      <div class="list-item ${task.completed ? "completed" : ""}">
        <div>
          <strong>${escapeHTML(task.title)}</strong>
          <small>${escapeHTML(task.subject || "بدون درس")} · ${toPersianDate(task.date)}</small>
          <small>اولویت: ${priorityText}</small>
        </div>
        <div class="item-actions">
          <button data-task-action="toggle" data-id="${task.id}" aria-label="تکمیل">
            <i class="fa-solid ${task.completed ? "fa-rotate-left" : "fa-check"}"></i>
          </button>
          <button data-task-action="delete" data-id="${task.id}" aria-label="حذف">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>`;
  }).join("");
}

$("addTaskBtn")?.addEventListener("click", addTask);

$("taskList")?.addEventListener("click", event => {
  const button = event.target.closest("button[data-task-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  if (button.dataset.taskAction === "toggle") {
    task.completed = !task.completed;
  } else {
    if (!confirm("این تکلیف حذف بشه؟")) return;
    tasks = tasks.filter(item => item.id !== id);
  }

  save(STORAGE.tasks, tasks);
  renderAll();
});

/* Exams */

function addExam() {
  const subject = $("examSubject")?.value.trim();
  const date = $("examDate")?.value;
  const description = $("examDescription")?.value.trim();

  if (!subject || !date) {
    alert("نام درس و تاریخ امتحان رو وارد کن.");
    return;
  }

  exams.push({
    id: Date.now(),
    subject,
    date,
    description
  });

  save(STORAGE.exams, exams);

  $("examSubject").value = "";
  $("examDate").value = "";
  $("examDescription").value = "";

  renderAll();
}

function renderExams() {
  const container = $("examList");
  if (!container) return;

  if (!exams.length) {
    container.innerHTML = emptyState("fa-calendar-check", "هنوز امتحانی ثبت نکردی");
    return;
  }

  container.innerHTML = [...exams]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(exam => `
      <div class="list-item">
        <div>
          <strong>${escapeHTML(exam.subject)}</strong>
          <small>${toPersianDate(exam.date)}</small>
          <small>${escapeHTML(exam.description || "")}</small>
          <small>${daysUntil(exam.date)}</small>
        </div>
        <button data-exam-delete="${exam.id}" aria-label="حذف امتحان">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `).join("");
}

$("addExamBtn")?.addEventListener("click", addExam);

$("examList")?.addEventListener("click", event => {
  const button = event.target.closest("[data-exam-delete]");
  if (!button) return;

  if (!confirm("این امتحان حذف بشه؟")) return;

  exams = exams.filter(item => item.id !== Number(button.dataset.examDelete));
  save(STORAGE.exams, exams);
  renderAll();
});

/* Grades */

function addGrade() {
  const subject = $("gradeSubject")?.value.trim();
  const value = Number($("gradeValue")?.value);

  if (!subject || $("gradeValue")?.value === "" || !Number.isFinite(value) || value < 0 || value > 20) {
    alert("نام درس و نمره معتبر از ۰ تا ۲۰ وارد کن.");
    return;
  }

  grades.push({
    id: Date.now(),
    subject,
    value
  });

  save(STORAGE.grades, grades);

  $("gradeSubject").value = "";
  $("gradeValue").value = "";

  renderAll();
}

function renderGrades() {
  const container = $("gradeList");
  if (!container) return;

  const average = grades.length
    ? grades.reduce((sum, item) => sum + Number(item.value), 0) / grades.length
    : 0;

  if ($("averageGrade")) {
    $("averageGrade").textContent = faNumber(average.toFixed(2));
  }

  if (!grades.length) {
    container.innerHTML = emptyState("fa-award", "هنوز نمره‌ای ثبت نکردی");
    return;
  }

  container.innerHTML = grades.map(grade => `
    <div class="list-item">
      <div>
        <strong>${escapeHTML(grade.subject)}</strong>
        <small>نمره ثبت‌شده</small>
      </div>
      <strong>${faNumber(grade.value)} از ۲۰</strong>
      <button data-grade-delete="${grade.id}" aria-label="حذف نمره">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `).join("");
}

$("addGradeBtn")?.addEventListener("click", addGrade);

$("gradeList")?.addEventListener("click", event => {
  const button = event.target.closest("[data-grade-delete]");
  if (!button) return;

  if (!confirm("این نمره حذف بشه؟")) return;

  grades = grades.filter(item => item.id !== Number(button.dataset.gradeDelete));
  save(STORAGE.grades, grades);
  renderAll();
});

/* Study sessions */

function addStudySession(subject, duration) {
  const cleanSubject = String(subject || "").trim() || "مطالعه آزاد";
  const minutes = Number(duration);

  if (!Number.isFinite(minutes) || minutes < 1) return false;

  studies.push({
    id: Date.now(),
    subject: cleanSubject,
    duration: Math.round(minutes),
    date: todayISO(),
    createdAt: new Date().toISOString()
  });

  save(STORAGE.studies, studies);
  renderStudy();
  renderDashboard();
  return true;
}

$("addStudyBtn")?.addEventListener("click", () => {
  const subject = $("studySubject")?.value.trim();
  const duration = Number($("studyDuration")?.value);

  if (!subject || !$("studyDuration")?.value || !Number.isFinite(duration) || duration < 1) {
    alert("نام درس و مدت مطالعه معتبر رو وارد کن.");
    return;
  }

  if (addStudySession(subject, duration)) {
    $("studySubject").value = "";
    $("studyDuration").value = "";
  }
});

function renderStudy() {
  const container = $("studyHistory");
  if (!container) return;

  const sorted = [...studies].sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || "")
  );

  if (!sorted.length) {
    container.innerHTML = emptyState("fa-book-open", "هنوز جلسه‌ای ثبت نکردی");
  } else {
    container.innerHTML = sorted.map(item => `
      <div class="list-item">
        <div>
          <strong>${escapeHTML(item.subject)}</strong>
          <small>${toPersianDate(item.date)}</small>
        </div>
        <strong>${faNumber(item.duration)} دقیقه</strong>
        <button data-study-delete="${item.id}" aria-label="حذف جلسه">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `).join("");
  }

  const today = todayISO();
  const todayTotal = studies
    .filter(item => item.date === today)
    .reduce((sum, item) => sum + Number(item.duration || 0), 0);

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartISO = [
    weekStart.getFullYear(),
    String(weekStart.getMonth() + 1).padStart(2, "0"),
    String(weekStart.getDate()).padStart(2, "0")
  ].join("-");

  const weeklyTotal = studies
    .filter(item => item.date >= weekStartISO && item.date <= today)
    .reduce((sum, item) => sum + Number(item.duration || 0), 0);

  if ($("dailyStudyTotal")) {
    $("dailyStudyTotal").textContent = faNumber(todayTotal);
  }

  if ($("weeklyStudyTotal")) {
    $("weeklyStudyTotal").textContent = faNumber(weeklyTotal);
  }

  renderStudyChart();
}

$("studyHistory")?.addEventListener("click", event => {
  const button = event.target.closest("[data-study-delete]");
  if (!button) return;

  if (!confirm("این جلسه مطالعه حذف بشه؟")) return;

  studies = studies.filter(item => item.id !== Number(button.dataset.studyDelete));
  save(STORAGE.studies, studies);
  renderAll();
});

function renderStudyChart() {
  const chart = $("studyChart");
  if (!chart) return;

  const days = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const iso = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");

    const total = studies
      .filter(item => item.date === iso)
      .reduce((sum, item) => sum + Number(item.duration || 0), 0);

    days.push({
      label: new Intl.DateTimeFormat("fa-IR", { weekday: "short" }).format(date),
      total
    });
  }

  const max = Math.max(...days.map(day => day.total), 1);

  chart.innerHTML = days.map(day => `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:120px;">
      <small style="font-size:9px;color:var(--muted);margin-bottom:5px">${faNumber(day.total)}</small>
      <div class="chart-bar" style="height:${Math.max(4, day.total / max * 75)}px"></div>
      <span class="chart-day">${day.label}</span>
    </div>
  `).join("");
}

/* Timer */

function updateTimerDisplay() {
  const minutes = Math.floor(timerRemaining / 60);
  const seconds = timerRemaining % 60;

  if ($("timerDisplay")) {
    $("timerDisplay").textContent =
      `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  const progress = timerDuration > 0
    ? (timerRemaining / timerDuration) * 100
    : 0;

  if ($("timerProgress")) {
    $("timerProgress").style.width = `${progress}%`;
  }
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;

  const button = $("startTimerBtn");
  if (button) {
    button.innerHTML = '<i class="fa-solid fa-play"></i> شروع';
  }
}

function resetTimer() {
  stopTimer();
  timerRemaining = timerDuration;
  updateTimerDisplay();

  if ($("timerStatus")) {
    $("timerStatus").textContent = "برای شروع تمرکز آماده‌ای؟";
  }
}

function finishTimer() {
  stopTimer();
  timerRemaining = 0;
  updateTimerDisplay();

  const subject = $("studySubject")?.value.trim() || "مطالعه آزاد";
  const completedMinutes = Math.round(timerDuration / 60);

  addStudySession(subject, completedMinutes);

  if ($("timerStatus")) {
    $("timerStatus").textContent = "آفرین! جلسه مطالعه تموم شد 🎉";
  }

  alert("آفرین! جلسه تمرکزت تموم شد. زمان مطالعه ثبت شد.");
}

function startTimer() {
  if (timerRunning) {
    stopTimer();
    if ($("timerStatus")) $("timerStatus").textContent = "تایمر متوقف شد.";
    return;
  }

  if (timerRemaining <= 0) {
    timerRemaining = timerDuration;
  }

  timerRunning = true;

  if ($("startTimerBtn")) {
    $("startTimerBtn").innerHTML = '<i class="fa-solid fa-pause"></i> توقف';
  }

  if ($("timerStatus")) {
    $("timerStatus").textContent = "در حال تمرکز... موفق باشی!";
  }

  timerInterval = setInterval(() => {
    timerRemaining--;
    updateTimerDisplay();

    if (timerRemaining <= 0) {
      finishTimer();
    }
  }, 1000);
}

$("startTimerBtn")?.addEventListener("click", startTimer);
$("resetTimerBtn")?.addEventListener("click", resetTimer);

document.querySelectorAll(".preset-btn").forEach(button => {
  button.addEventListener("click", () => {
    if (timerRunning) return;

    document.querySelectorAll(".preset-btn").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    timerDuration = Number(button.dataset.minutes) * 60;
    timerRemaining = timerDuration;
    updateTimerDisplay();

    if ($("timerStatus")) {
      $("timerStatus").textContent = "زمان تمرکز انتخاب شد.";
    }
  });
});

/* Settings */

$("saveSettingsBtn")?.addEventListener("click", () => {
  settings.name = $("displayName")?.value.trim() || "";
  save(STORAGE.settings, settings);

  if ($("welcomeName")) {
    $("welcomeName").textContent = settings.name || "دانش‌آموز پرتلاش!";
  }

  alert("تنظیمات ذخیره شد.");
});

/* Render everything */

function renderAll() {
  renderDashboard();
  renderTasks();
  renderExams();
  renderGrades();
  renderStudy();
}

function init() {
  if ($("displayName")) {
    $("displayName").value = settings.name || "";
  }

  applyTheme();
  updateTimerDisplay();
  renderAll();
}

init();
