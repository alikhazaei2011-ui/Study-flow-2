
"use strict";

/* StudyFlow 2.0 - Jalali Edition */

const $ = id => document.getElementById(id);

function load(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem("sf_" + key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem("sf_" + key, JSON.stringify(value));
}

let tasks = load("tasks");
let exams = load("exams");
let grades = load("grades");
let studies = load("studies");
let settings = load("settings", { name: "" });

/* ابزارهای عمومی */

function createElement(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}

function faNumber(value) {
  return Number(value).toLocaleString("fa-IR");
}

function normalizeDigits(value) {
  return String(value)
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

/* تبدیل تاریخ میلادی و شمسی */

const persianFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  year: "numeric",
  month: "numeric",
  day: "numeric"
});

function gregorianToJalali(date) {
  const parts = persianFormatter.formatToParts(date);
  const get = type => Number(parts.find(p => p.type === type).value);

  return [
    get("year"),
    get("month"),
    get("day")
  ];
}

function jalaliToGregorian(value) {
  if (!value) return null;

  const normalized = normalizeDigits(value);
  const match = normalized.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);

  if (!match) return null;

  const jy = Number(match[1]);
  const jm = Number(match[2]);
  const jd = Number(match[3]);

  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;

  const start = new Date(jy + 621, 1, 15);
  const end = new Date(jy + 622, 3, 10);

  for (
    let date = new Date(start);
    date <= end;
    date.setDate(date.getDate() + 1)
  ) {
    const [year, month, day] = gregorianToJalali(date);

    if (year === jy && month === jm && day === jd) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
  }

  return null;
}

function todayJalali() {
  const [y, m, d] = gregorianToJalali(new Date());
  return `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
}

function formatDate(value) {
  if (!value) return "بدون تاریخ";

  const normalized = normalizeDigits(value);

  // تاریخ‌های قدیمی میلادی را هم پشتیبانی می‌کنیم
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [y, m, d] = normalized.split("-").map(Number);
    const [jy, jm, jd] = gregorianToJalali(new Date(y, m - 1, d));
    return `${faNumber(jy)}/${faNumber(String(jm).padStart(2, "0"))}/${faNumber(String(jd).padStart(2, "0"))}`;
  }

  return normalized.replace(/\//g, "/").replace(/\d+/g, n => faNumber(n));
}

function dateTimestamp(value) {
  if (!value) return null;

  const normalized = normalizeDigits(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [y, m, d] = normalized.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
  }

  const date = jalaliToGregorian(normalized);
  return date ? date.getTime() : null;
}

function daysUntil(value) {
  const target = dateTimestamp(value);
  if (target === null) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round((target - today.getTime()) / 86400000);
}

function createAction(text, callback) {
  const button = createElement("button", text, "primary-btn");
  button.type = "button";
  button.addEventListener("click", callback);
  return button;
}

/* تبدیل تاریخ‌های قدیمی ذخیره‌شده */

function migrateDates(items, key) {
  let changed = false;

  items.forEach(item => {
    if (item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      const [y, m, d] = item.date.split("-").map(Number);
      const [jy, jm, jd] = gregorianToJalali(new Date(y, m - 1, d));

      item.date = `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
      changed = true;
    }
  });

  if (changed) save(key, items);
}

migrateDates(tasks, "tasks");
migrateDates(exams, "exams");

/* منوی صفحات */

document.querySelectorAll(".bottom-nav button").forEach(button => {
  button.addEventListener("click", () => {
    const pageId = button.dataset.page;

    document.querySelectorAll(".page").forEach(page => {
      page.classList.toggle("active", page.id === pageId);
    });

    document.querySelectorAll(".bottom-nav button").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    const pageId = button.dataset.go;

    document.querySelectorAll(".page").forEach(page => {
      page.classList.toggle("active", page.id === pageId);
    });

    document.querySelectorAll(".bottom-nav button").forEach(item => {
      item.classList.toggle("active", item.dataset.page === pageId);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

/* تاریخ امروز */

$("todayDate").textContent = new Date().toLocaleDateString("fa-IR", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric"
});

/* تم تاریک و روشن */

function applyTheme() {
  const dark = localStorage.getItem("sf_dark") === "true";
  document.body.classList.toggle("dark", dark);

  const icon = $("themeToggle").querySelector("i");
  if (icon) {
    icon.className = dark
      ? "fa-solid fa-sun"
      : "fa-solid fa-moon";
  }
}

$("themeToggle").addEventListener("click", () => {
  const dark = document.body.classList.toggle("dark");
  localStorage.setItem("sf_dark", String(dark));
  applyTheme();
});

applyTheme();

/* راه‌اندازی تقویم شمسی */

function setupJalaliPicker(inputId, hiddenId) {
  const input = $(inputId);
  const hidden = $(hiddenId);

  if (!input || !hidden) return;

  if (window.jQuery && typeof jQuery.fn.pDatepicker === "function") {
    jQuery(input).pDatepicker({
      calendarType: "persian",
      initialValue: false,
      format: "YYYY/MM/DD",
      autoClose: true,
      onSelect: function (unixDate) {
        const date = new Date(unixDate);
        const [jy, jm, jd] = gregorianToJalali(date);

        hidden.value =
          `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
      }
    });
  } else {
    input.placeholder = "تقویم بارگذاری نشد؛ اتصال اینترنت را بررسی کن";
  }
}

setupJalaliPicker("taskDatePicker", "taskDate");
setupJalaliPicker("examDatePicker", "examDate");

/* تکالیف */

function renderTasks() {
  const list = $("taskList");
  list.replaceChildren();

  tasks.forEach(task => {
    const card = createElement("div", undefined, "card");

    card.append(
      createElement("h3", task.title),
      createElement("p", `${task.subject || "بدون درس"} | ${task.priority || "معمولی"}`),
      createElement("p", "موعد: " + formatDate(task.date)),
      createElement("p", task.completed ? "✅ انجام‌شده" : "⏳ باقی‌مانده")
    );

    card.appendChild(createAction(
      task.completed ? "برگرداندن" : "تکمیل",
      () => {
        task.completed = !task.completed;
        save("tasks", tasks);
        renderAll();
      }
    ));

    card.appendChild(createAction("ویرایش عنوان", () => {
      const newTitle = prompt("عنوان جدید تکلیف:", task.title);
      if (newTitle === null || !newTitle.trim()) return;

      task.title = newTitle.trim();
      save("tasks", tasks);
      renderAll();
    }));

    card.appendChild(createAction("حذف", () => {
      if (!confirm("این تکلیف حذف شود؟")) return;

      tasks = tasks.filter(t => t.id !== task.id);
      save("tasks", tasks);
      renderAll();
    }));

    list.appendChild(card);
  });

  $("totalTasks").textContent = faNumber(tasks.length);
  $("completedTasks").textContent = faNumber(tasks.filter(t => t.completed).length);
  $("remainingTasks").textContent = faNumber(tasks.filter(t => !t.completed).length);
}

$("addTaskBtn").addEventListener("click", () => {
  const title = $("taskInput").value.trim();
  const date = $("taskDate").value;

  if (!title) {
    alert("عنوان تکلیف را وارد کن.");
    return;
  }

  if ($("taskDatePicker").value && !date) {
    alert("لطفاً تاریخ را از تقویم انتخاب کن.");
    return;
  }

  tasks.push({
    id: Date.now(),
    title,
    subject: $("taskSubject").value.trim(),
    date,
    priority: $("taskPriority").value,
    completed: false
  });

  $("taskInput").value = "";
  $("taskSubject").value = "";
  $("taskDate").value = "";
  $("taskDatePicker").value = "";

  save("tasks", tasks);
  renderAll();
});

/* امتحانات */

function renderExams() {
  const list = $("examList");
  list.replaceChildren();

  const sorted = [...exams].sort((a, b) => {
    return (dateTimestamp(a.date) ?? Infinity) -
           (dateTimestamp(b.date) ?? Infinity);
  });

  sorted.forEach(exam => {
    const card = createElement("div", undefined, "card");
    const days = daysUntil(exam.date);

    card.append(
      createElement("h3", exam.subject),
      createElement("p", "📅 " + formatDate(exam.date)),
      createElement(
        "p",
        days === null ? "تاریخ مشخص نشده" :
        days < 0 ? "این امتحان گذشته است" :
        days === 0 ? "امتحان امروز است!" :
        `${faNumber(days)} روز تا امتحان`
      ),
      createElement("p", exam.description || "بدون توضیحات")
    );

    card.appendChild(createAction("حذف امتحان", () => {
      if (!confirm("این امتحان حذف شود؟")) return;

      exams = exams.filter(e => e.id !== exam.id);
      save("exams", exams);
      renderAll();
    }));

    list.appendChild(card);
  });

  const upcoming = $("upcomingExams");
  upcoming.replaceChildren();

  const next = sorted.filter(e => {
    const days = daysUntil(e.date);
    return days !== null && days >= 0;
  }).slice(0, 3);

  if (!next.length) {
    upcoming.textContent = "امتحان آینده‌ای ثبت نشده است.";
  } else {
    next.forEach(e => {
      upcoming.appendChild(
        createElement("p", `${e.subject} - ${formatDate(e.date)}`)
      );
    });
  }
}

$("addExamBtn").addEventListener("click", () => {
  const subject = $("examSubject").value.trim();
  const date = $("examDate").value;

  if (!subject || !date) {
    alert("نام درس و تاریخ امتحان را از تقویم شمسی انتخاب کن.");
    return;
  }

  exams.push({
    id: Date.now(),
    subject,
    date,
    description: $("examDescription").value.trim()
  });

  $("examSubject").value = "";
  $("examDate").value = "";
  $("examDatePicker").value = "";
  $("examDescription").value = "";

  save("exams", exams);
  renderAll();
});

/* نمرات */

function renderGrades() {
  const list = $("gradeList");
  list.replaceChildren();

  grades.forEach(grade => {
    const card = createElement("div", undefined, "card");

    card.append(
      createElement("h3", grade.subject),
      createElement("p", "نمره: " + Number(grade.value).toLocaleString("fa-IR"))
    );

    card.appendChild(createAction("حذف", () => {
      grades = grades.filter(g => g.id !== grade.id);
      save("grades", grades);
      renderAll();
    }));

    list.appendChild(card);
  });

  const average = grades.length
    ? grades.reduce((sum, g) => sum + Number(g.value), 0) / grades.length
    : 0;

  $("averageGrade").textContent = average.toLocaleString("fa-IR", {
    maximumFractionDigits: 2
  });
}

$("addGradeBtn").addEventListener("click", () => {
  const subject = $("gradeSubject").value.trim();
  const value = Number($("gradeValue").value);

  if (!subject || $("gradeValue").value === "" ||
      !Number.isFinite(value) || value < 0 || value > 20) {
    alert("نام درس و نمره معتبر از ۰ تا ۲۰ وارد کن.");
    return;
  }

  grades.push({
    id: Date.now(),
    subject,
    value
  });

  $("gradeSubject").value = "";
  $("gradeValue").value = "";

  save("grades", grades);
  renderAll();
});

/* مطالعه و ثبت جلسات */

function todayGregorianKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function renderStudies() {
  const list = $("studyHistory");
  list.replaceChildren();

  studies.slice().reverse().forEach(item => {
    const card = createElement("div", undefined, "card");

    card.append(
      createElement("h3", item.subject || "مطالعه آزاد"),
      createElement("p", `${faNumber(item.duration)} دقیقه مطالعه`),
      createElement("p", item.date || "")
    );

    card.appendChild(createAction("حذف جلسه", () => {
      studies = studies.filter(s => s.id !== item.id);
      save("studies", studies);
      renderAll();
    }));

    list.appendChild(card);
  });

  if (!studies.length) {
    list.textContent = "هنوز جلسه‌ای ثبت نکردی.";
  }

  const today = todayGregorianKey();
  const todayMinutes = studies
    .filter(s => s.dayKey === today)
    .reduce((sum, s) => sum + Number(s.duration), 0);

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const weeklyMinutes = studies
    .filter(s => s.timestamp >= weekStart.getTime())
    .reduce((sum, s) => sum + Number(s.duration), 0);

  $("dailyStudyTotal").textContent = faNumber(todayMinutes);
  $("weeklyStudyTotal").textContent = faNumber(weeklyMinutes);
  $("todayStudyTime").textContent = faNumber(todayMinutes);

  renderStudyChart();
}

function addStudy(subject, duration) {
  const now = new Date();

  studies.push({
    id: Date.now(),
    subject: subject || "مطالعه آزاد",
    duration,
    date: now.toLocaleDateString("fa-IR"),
    dayKey: todayGregorianKey(),
    timestamp: now.getTime()
  });

  save("studies", studies);
  renderAll();
}

$("addStudyBtn").addEventListener("click", () => {
  const subject = $("studySubject").value.trim();
  const duration = Number($("studyDuration").value);

  if (!Number.isFinite(duration) || duration < 1) {
    alert("مدت مطالعه را به دقیقه وارد کن.");
    return;
  }

  addStudy(subject, duration);

  $("studySubject").value = "";
  $("studyDuration").value = "";

  alert("جلسه مطالعه ثبت شد.");
});

/* نمودار هفت روز اخیر */

function renderStudyChart() {
  const chart = $("studyChart");
  chart.replaceChildren();

  const days = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const total = studies
      .filter(s => s.dayKey === key)
      .reduce((sum, s) => sum + Number(s.duration), 0);

    days.push({
      label: date.toLocaleDateString("fa-IR", { weekday: "short" }),
      total
    });
  }

  const max = Math.max(60, ...days.map(d => d.total));

  days.forEach(day => {
    const column = createElement("div", undefined, "chart-column");
    const bar = createElement("div", undefined, "chart-bar");
    const label = createElement("span", day.label, "chart-label");
    const value = createElement("small", faNumber(day.total));

    bar.style.height = `${Math.max(4, day.total / max * 100)}px`;
    column.append(value, bar, label);
    chart.appendChild(column);
  });
}

/* تایمر مطالعه */

let timerInterval = null;
let timerDuration = 25 * 60;
let timerRemaining = timerDuration;
let timerRunning = false;

function updateTimerDisplay() {
  const minutes = Math.floor(timerRemaining / 60);
  const seconds = timerRemaining % 60;

  $("timerDisplay").textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  $("timerProgress").style.width =
    `${((timerDuration - timerRemaining) / timerDuration) * 100}%`;
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
}

function startTimer() {
  if (timerRunning) {
    stopTimer();
    $("startTimerBtn").innerHTML = '<i class="fa-solid fa-play"></i> ادامه';
    $("timerStatus").textContent = "تایمر متوقف شد.";
    return;
  }

  timerRunning = true;
  $("startTimerBtn").innerHTML = '<i class="fa-solid fa-pause"></i> توقف';
  $("timerStatus").textContent = "با تمرکز ادامه بده 💪";

  timerInterval = setInterval(() => {
    timerRemaining--;
    updateTimerDisplay();

    if (timerRemaining <= 0) {
      stopTimer();

      const subject = $("studySubject").value.trim() || "مطالعه با تایمر";
      addStudy(subject, Math.round(timerDuration / 60));

      $("timerStatus").textContent = "آفرین! جلسه مطالعه تموم شد 🎉";
      $("startTimerBtn").innerHTML = '<i class="fa-solid fa-play"></i> شروع';
      alert("آفرین! زمان مطالعه‌ات تمام شد.");
    }
  }, 1000);
}

$("startTimerBtn").addEventListener("click", startTimer);

$("resetTimerBtn").addEventListener("click", () => {
  stopTimer();
  timerRemaining = timerDuration;
  updateTimerDisplay();
  $("startTimerBtn").innerHTML = '<i class="fa-solid fa-play"></i> شروع';
  $("timerStatus").textContent = "تایمر آماده شروع است.";
});

document.querySelectorAll(".preset-btn").forEach(button => {
  button.addEventListener("click", () => {
    stopTimer();

    timerDuration = Number(button.dataset.minutes) * 60;
    timerRemaining = timerDuration;

    document.querySelectorAll(".preset-btn").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    $("startTimerBtn").innerHTML = '<i class="fa-solid fa-play"></i> شروع';
    $("timerStatus").textContent = "زمان تمرکز انتخاب شد.";
    updateTimerDisplay();
  });
});

updateTimerDisplay();

/* تنظیمات */

$("displayName").value = settings.name || "";

function updateWelcomeName() {
  $("welcomeName").textContent = settings.name
    ? `سلام ${settings.name}! 👋`
    : "دانش‌آموز پرتلاش!";
}

$("saveSettingsBtn").addEventListener("click", () => {
  settings.name = $("displayName").value.trim();
  save("settings", settings);
  updateWelcomeName();
  alert("تنظیمات ذخیره شد.");
});

updateWelcomeName();

/* نمایش همه بخش‌ها */

function renderAll() {
  renderTasks();
  renderExams();
  renderGrades();
  renderStudies();
}

renderAll();

console.log("StudyFlow 2.0 is ready!");
