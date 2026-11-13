
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
let schedules = load("schedules");
let exams = load("exams");
let grades = load("grades");
let settings = load("settings", { name: "" });

/* ابزارهای عمومی */

function createElement(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}

function formatDate(value) {
  if (!value) return "بدون تاریخ";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fa-IR");
}

function daysUntil(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

function createAction(text, callback) {
  const button = createElement("button", text, "primary-btn");
  button.type = "button";
  button.addEventListener("click", callback);
  return button;
}

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

/* تاریخ امروز */

$("todayDate").textContent =
  new Date().toLocaleDateString("fa-IR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

/* تم تاریک و روشن */

function applyTheme() {
  const dark = localStorage.getItem("sf_dark") === "true";
  document.body.classList.toggle("dark", dark);
  $("themeToggle").textContent = dark ? "☀️" : "🌙";
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

  tasks.forEach(task => {
    const card = createElement("div", undefined, "card");
    const title = createElement("h3", task.title);
    const info = createElement(
      "p",
      `${task.subject || "بدون درس"} | ${task.priority || "معمولی"}`
    );

    const date = createElement("p", "موعد: " + formatDate(task.date));
    const status = createElement(
      "p",
      task.completed ? "✅ انجام‌شده" : "⏳ باقی‌مانده"
    );

    const complete = createAction(
      task.completed ? "برگرداندن" : "تکمیل",
      () => {
        task.completed = !task.completed;
        save("tasks", tasks);
        renderAll();
      }
    );

    const edit = createAction("ویرایش", () => {
      const newTitle = prompt("عنوان جدید تکلیف:", task.title);
      if (newTitle === null || !newTitle.trim()) return;
      task.title = newTitle.trim();
      save("tasks", tasks);
      renderAll();
    });

    const remove = createAction("حذف", () => {
      if (!confirm("این تکلیف حذف شود؟")) return;
      tasks = tasks.filter(t => t.id !== task.id);
      save("tasks", tasks);
      renderAll();
    });

    card.append(title, info, date, status, complete, edit, remove);
    list.appendChild(card);
  });

  $("totalTasks").textContent = tasks.length.toLocaleString("fa-IR");
  $("completedTasks").textContent =
    tasks.filter(t => t.completed).length.toLocaleString("fa-IR");
  $("remainingTasks").textContent =
    tasks.filter(t => !t.completed).length.toLocaleString("fa-IR");
}

$("addTaskBtn").addEventListener("click", () => {
  const title = $("taskInput").value.trim();

  if (!title) {
    alert("عنوان تکلیف را وارد کن.");
    return;
  }

  tasks.push({
    id: Date.now(),
    title,
    subject: $("taskSubject").value.trim(),
    date: $("taskDate").value,
    priority: $("taskPriority").value,
    completed: false
  });

  $("taskInput").value = "";
  $("taskSubject").value = "";
  $("taskDate").value = "";

  save("tasks", tasks);
  renderAll();
});

/* برنامه هفتگی */

function renderSchedules() {
  const list = $("scheduleList");
  list.replaceChildren();

  schedules.forEach(item => {
    const card = createElement("div", undefined, "card");
    card.append(
      createElement("h3", item.day),
      createElement("p", "📚 " + item.subject),
      createElement("p", "🕒 " + (item.time || "ساعت مشخص نشده"))
    );

    card.appendChild(createAction("حذف", () => {
      schedules = schedules.filter(s => s.id !== item.id);
      save("schedules", schedules);
      renderAll();
    }));

    list.appendChild(card);
  });

  const today = new Date().toLocaleDateString("fa-IR", {
    weekday: "long"
  });

  const todayItems = schedules.filter(s => s.day === today);
  const todayList = $("todaySchedule");
  todayList.replaceChildren();

  if (!todayItems.length) {
    todayList.textContent = "برای امروز برنامه‌ای ثبت نشده است.";
  } else {
    todayItems.forEach(item => {
      todayList.appendChild(
        createElement("p", `${item.time || ""} - ${item.subject}`)
      );
    });
  }
}

$("addScheduleBtn").addEventListener("click", () => {
  const day = $("scheduleDay").value.trim();
  const subject = $("scheduleSubject").value.trim();

  if (!day || !subject) {
    alert("روز و نام درس را وارد کن.");
    return;
  }

  schedules.push({
    id: Date.now(),
    day,
    subject,
    time: $("scheduleTime").value
  });

  $("scheduleDay").value = "";
  $("scheduleSubject").value = "";
  $("scheduleTime").value = "";

  save("schedules", schedules);
  renderAll();
});

/* امتحانات */

function renderExams() {
  const list = $("examList");
  list.replaceChildren();

  const sorted = [...exams].sort((a, b) =>
    (a.date || "9999").localeCompare(b.date || "9999")
  );

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
        `${days.toLocaleString("fa-IR")} روز تا امتحان`
      ),
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

  if (!subject || !$("examDate").value) {
    alert("نام درس و تاریخ امتحان را وارد کن.");
    return;
  }

  exams.push({
    id: Date.now(),
    subject,
    date: $("examDate").value,
    description: $("examDescription").value.trim()
  });

  $("examSubject").value = "";
  $("examDate").value = "";
  $("examDescription").value = "";

  save("exams", exams);
  renderAll();
});

/* نمرات و معدل */

function renderGrades() {
  const list = $("gradeList");
  list.replaceChildren();

  grades.forEach(grade => {
    const card = createElement("div", undefined, "card");

    card.append(
      createElement("h3", grade.subject),
      createElement("p", "نمره: " + grade.value.toLocaleString("fa-IR"))
    );

    card.appendChild(createAction("حذف", () => {
      grades = grades.filter(g => g.id !== grade.id);
      save("grades", grades);
      renderAll();
    }));

    list.appendChild(card);
  });

  const average = grades.length
    ? grades.reduce((sum, g) => sum + g.value, 0) / grades.length
    : 0;

  $("averageGrade").textContent =
    average.toLocaleString("fa-IR", {
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

/* تنظیمات */

$("displayName").value = settings.name || "";

$("saveSettingsBtn").addEventListener("click", () => {
  settings.name = $("displayName").value.trim();
  save("settings", settings);

  const heading = document.querySelector(".welcome h2");
  heading.textContent = settings.name
    ? `سلام ${settings.name}! 👋`
    : "سلام، خوش اومدی! 👋";

  alert("تنظیمات ذخیره شد.");
});

/* نمایش همه بخش‌ها */

function renderAll() {
  renderTasks();
  renderSchedules();
  renderExams();
  renderGrades();
}

if (settings.name) {
  document.querySelector(".welcome h2").textContent =
    `سلام ${settings.name}! 👋`;
}

renderAll();

console.log("StudyFlow 2.0 is ready!");
