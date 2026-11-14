
"use strict";

/* StudyFlow 2.0 */

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

function faNumber(value) {
  return Number(value).toLocaleString("fa-IR");
}

function createElement(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}

function createAction(text, callback) {
  const button = createElement("button", text, "primary-btn");
  button.type = "button";
  button.addEventListener("click", callback);
  return button;
}

/* تبدیل تاریخ میلادی به شمسی */

function gregorianToJalali(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";

  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);

  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const jalaliYear = parts.find(p => p.type === "year").value;
  const jalaliMonth = parts.find(p => p.type === "month").value;
  const jalaliDay = parts.find(p => p.type === "day").value;

  return `${jalaliYear}/${jalaliMonth}/${jalaliDay}`;
}

function taskDateText(date) {
  if (!date) return "بدون مهلت";

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return "مهلت: " + gregorianToJalali(date);
  }

  return "مهلت: " + date;
}

/* ابزارهای تاریخ امتحانات */

function getExamGregorianDate(exam) {
  if (exam.dateGregorian) return exam.dateGregorian;

  if (/^\d{4}-\d{2}-\d{2}$/.test(exam.date || "")) {
    return exam.date;
  }

  return "";
}

function getExamJalaliDate(exam) {
  if (exam.dateJalali) return exam.dateJalali;

  const gregorianDate = getExamGregorianDate(exam);

  if (gregorianDate) {
    return gregorianToJalali(gregorianDate);
  }

  return exam.date || "";
}

function getTodayJalali() {
  const now = new Date();
  const iso = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");

  return gregorianToJalali(iso);
}

function examSortValue(exam) {
  const gregorian = getExamGregorianDate(exam);

  if (gregorian) return gregorianToJalali(gregorian);

  return getExamJalaliDate(exam).replace(/-/g, "/");
}

function getUpcomingExams() {
  const today = getTodayJalali();

  return exams
    .filter(exam => {
      const date = examSortValue(exam);
      return date && date >= today;
    })
    .sort((a, b) => examSortValue(a).localeCompare(examSortValue(b)));
}

/* منوی صفحات */

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === pageId);
  });

  document.querySelectorAll(".bottom-nav button").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".bottom-nav button").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.go));
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
  icon.className = dark ? "fa-solid fa-sun" : "fa-solid fa-moon";
}

$("themeToggle").addEventListener("click", () => {
  const dark = document.body.classList.toggle("dark");
  localStorage.setItem("sf_dark", String(dark));
  applyTheme();
});

applyTheme();

/* تکالیف */

function renderTasks() {
  const list = $("taskList");
  list.replaceChildren();

  if (!tasks.length) {
    list.textContent = "هنوز تکلیفی ثبت نکردی.";
  }

  tasks.forEach(task => {
    const card = createElement("div", undefined, "stat-card");

    card.append(
      createElement("h3", task.title),
      createElement("p", task.subject || "بدون درس"),
      createElement("p", taskDateText(task.date)),
      createElement("p", task.completed ? "انجام‌شده ✅" : "باقی‌مانده ⏳")
    );

    card.appendChild(createAction(
      task.completed ? "برگرداندن" : "تکمیل",
      () => {
        task.completed = !task.completed;
        save("tasks", tasks);
        renderAll();
      }
    ));

    card.appendChild(createAction("حذف", () => {
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
  const gregorianDate = $("taskDatePicker").value;

  if (!title) {
    alert("عنوان تکلیف را وارد کن.");
    return;
  }

  const jalaliDate = gregorianToJalali(gregorianDate);

  tasks.push({
    id: Date.now(),
    title,
    subject: $("taskSubject").value.trim(),
    date: jalaliDate,
    priority: $("taskPriority").value,
    completed: false
  });

  $("taskInput").value = "";
  $("taskSubject").value = "";
  $("taskDatePicker").value = "";
  $("taskDate").value = "";

  save("tasks", tasks);
  renderAll();
});

/* شمارش معکوس امتحان */

function renderExamCountdown() {
  const container = $("nextExamCountdown");
  if (!container) return;

  container.replaceChildren();

  const next = getUpcomingExams()[0];

  if (!next) {
    container.appendChild(createElement(
      "p",
      "امتحان آینده‌ای ثبت نشده است."
    ));
    return;
  }

  const examDate = getExamGregorianDate(next);
  const card = createElement("div", undefined, "stat-card");

  card.appendChild(createElement("h3", "امتحان بعدی: " + next.subject));

  card.appendChild(createElement(
    "p",
    "تاریخ: " + getExamJalaliDate(next)
  ));

  if (!examDate) {
    card.appendChild(createElement(
      "p",
      "برای این امتحان تاریخ میلادی قابل محاسبه نیست."
    ));
    container.appendChild(card);
    return;
  }

  const [year, month, day] = examDate.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  target.setHours(0, 0, 0, 0);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (target.getTime() === today.getTime()) {
    card.appendChild(createElement(
      "h3",
      "🎉 امروز امتحانته! موفق باشی."
    ));
  } else if (target < today) {
    card.appendChild(createElement(
      "p",
      "این امتحان گذشته است."
    ));
  } else {
    const difference = target.getTime() - now.getTime();

    const days = Math.floor(difference / 86400000);
    const hours = Math.floor((difference % 86400000) / 3600000);
    const minutes = Math.floor((difference % 3600000) / 60000);

    const countdown = createElement(
      "h2",
      `${faNumber(days)} روز و ${faNumber(hours)} ساعت و ${faNumber(minutes)} دقیقه`
    );

    countdown.style.marginTop = "15px";
    countdown.style.lineHeight = "2";
    countdown.style.textAlign = "center";

    card.appendChild(countdown);
    card.appendChild(createElement("p", "تا شروع روز امتحان باقی مانده"));
  }

  container.appendChild(card);
}

/* امتحانات */

function renderExams() {
  const list = $("examList");
  list.replaceChildren();

  const sorted = [...exams].sort((a, b) =>
    examSortValue(a).localeCompare(examSortValue(b))
  );

  if (!sorted.length) {
    list.textContent = "هنوز امتحانی ثبت نکردی.";
  }

  sorted.forEach(exam => {
    const card = createElement("div", undefined, "stat-card");

    const dateText = getExamJalaliDate(exam) || "بدون تاریخ";

    card.append(
      createElement("h3", exam.subject),
      createElement("p", "تاریخ: " + dateText),
      createElement("p", exam.description || "بدون توضیحات")
    );

    card.appendChild(createAction("حذف امتحان", () => {
      exams = exams.filter(e => e.id !== exam.id);
      save("exams", exams);
      renderAll();
    }));

    list.appendChild(card);
  });

  const upcoming = $("upcomingExams");
  upcoming.replaceChildren();

  const next = getUpcomingExams().slice(0, 3);

  if (!next.length) {
    upcoming.textContent = "امتحان آینده‌ای ثبت نشده است.";
  } else {
    next.forEach(exam => {
      upcoming.appendChild(createElement(
        "p",
        `${exam.subject} - ${getExamJalaliDate(exam)}`
      ));
    });
  }

  renderExamCountdown();
}

$("addExamBtn").addEventListener("click", () => {
  const subject = $("examSubject").value.trim();
  const gregorianDate = $("examDatePicker").value;

  if (!subject || !gregorianDate) {
    alert("نام درس و تاریخ امتحان را وارد کن.");
    return;
  }

  const jalaliDate = gregorianToJalali(gregorianDate);

  exams.push({
    id: Date.now(),
    subject,
    date: gregorianDate,
    dateGregorian: gregorianDate,
    dateJalali: jalaliDate,
    description: $("examDescription").value.trim()
  });

  $("examSubject").value = "";
  $("examDatePicker").value = "";
  $("examDescription").value = "";

  save("exams", exams);
  renderAll();

  alert("امتحان با موفقیت ثبت شد.");
});

/* نمرات */

function renderGrades() {
  const list = $("gradeList");
  list.replaceChildren();

  if (!grades.length) {
    list.textContent = "هنوز نمره‌ای ثبت نکردی.";
  }

  grades.forEach(grade => {
    const card = createElement("div", undefined, "stat-card");

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

  if (!subject || $("gradeValue").value === "" || value < 0 || value > 20) {
    alert("نام درس و نمره معتبر از ۰ تا ۲۰ وارد کن.");
    return;
  }

  grades.push({ id: Date.now(), subject, value });

  $("gradeSubject").value = "";
  $("gradeValue").value = "";

  save("grades", grades);
  renderAll();
});

/* مطالعه */

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addStudy(subject, duration) {
  const now = new Date();

  studies.push({
    id: Date.now(),
    subject: subject || "مطالعه آزاد",
    duration,
    date: now.toLocaleDateString("fa-IR"),
    dayKey: todayKey(now),
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

function renderStudies() {
  const list = $("studyHistory");
  list.replaceChildren();

  if (!studies.length) {
    list.textContent = "هنوز جلسه‌ای ثبت نکردی.";
  }

  studies.slice().reverse().forEach(item => {
    const card = createElement("div", undefined, "stat-card");

    card.append(
      createElement("h3", item.subject),
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

  const today = todayKey();

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

/* نمودار شنبه تا جمعه */

function renderStudyChart() {
  const chart = $("studyChart");
  chart.replaceChildren();

  chart.style.display = "grid";
  chart.style.gridTemplateColumns = "repeat(7, minmax(0, 1fr))";
  chart.style.gap = "4px";
  chart.style.width = "100%";
  chart.style.minWidth = "0";
  chart.style.overflow = "hidden";
  chart.style.alignItems = "end";
  chart.style.justifyItems = "center";

  const names = [
    "شنبه", "یکشنبه", "دوشنبه",
    "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const offset = (today.getDay() + 1) % 7;
  const saturday = new Date(today);
  saturday.setDate(today.getDate() - offset);

  const days = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(saturday);
    date.setDate(saturday.getDate() + i);

    const total = studies
      .filter(s => s.dayKey === todayKey(date))
      .reduce((sum, s) => sum + Number(s.duration), 0);

    days.push({ label: names[i], total });
  }

  const max = Math.max(60, ...days.map(d => d.total));

  days.forEach(day => {
    const column = createElement("div", undefined, "chart-column");
    const value = createElement("small", faNumber(day.total));
    const bar = createElement("div", undefined, "chart-bar");
    const label = createElement("span", day.label);

    column.style.width = "100%";
    column.style.minWidth = "0";
    column.style.display = "flex";
    column.style.flexDirection = "column";
    column.style.alignItems = "center";
    column.style.justifyContent = "flex-end";
    column.style.gap = "5px";
    column.style.overflow = "hidden";

    value.style.fontSize = "9px";
    label.style.fontSize = "clamp(7px, 2.2vw, 10px)";
    label.style.whiteSpace = "nowrap";
    label.style.maxWidth = "100%";

    bar.style.width = "75%";
    bar.style.maxWidth = "30px";
    bar.style.height = `${Math.max(4, day.total / max * 85)}px`;

    column.append(value, bar, label);
    chart.appendChild(column);
  });
}

/* تایمر */

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
  clearInterval(timerInterval);
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

      addStudy(
        $("studySubject").value.trim() || "مطالعه با تایمر",
        Math.round(timerDuration / 60)
      );

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

/* بروزرسانی همه بخش‌ها */

function renderAll() {
  renderTasks();
  renderExams();
  renderGrades();
  renderStudies();
}

renderAll();

/* بروزرسانی شمارش معکوس هر دقیقه */

setInterval(renderExamCountdown, 60000);

console.log("StudyFlow 2.0 is ready!");
