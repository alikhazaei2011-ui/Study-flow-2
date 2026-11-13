
"use strict";

const input = document.getElementById("taskInput");
const addButton = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");

let tasks = JSON.parse(localStorage.getItem("sf_tasks") || "[]");

function saveTasks() {
  localStorage.setItem("sf_tasks", JSON.stringify(tasks));
}

function renderTasks() {
  taskList.innerHTML = "";

  tasks.forEach(task => {
    const item = document.createElement("div");
    item.className = "card";

    const title = document.createElement("span");
    title.textContent = task.title;
    title.style.textDecoration = task.completed ? "line-through" : "none";

    const complete = document.createElement("button");
    complete.textContent = task.completed ? "برگرداندن" : "تکمیل";
    complete.className = "primary-btn";

    complete.onclick = () => {
      task.completed = !task.completed;
      saveTasks();
      renderTasks();
    };

    const remove = document.createElement("button");
    remove.textContent = "حذف";
    remove.className = "primary-btn";

    remove.onclick = () => {
      tasks = tasks.filter(t => t.id !== task.id);
      saveTasks();
      renderTasks();
    };

    item.append(title, complete, remove);
    taskList.appendChild(item);
  });

  document.getElementById("totalTasks").textContent = tasks.length;
  document.getElementById("completedTasks").textContent =
    tasks.filter(t => t.completed).length;
  document.getElementById("remainingTasks").textContent =
    tasks.filter(t => !t.completed).length;
}

addButton.addEventListener("click", () => {
  const title = input.value.trim();

  if (!title) {
    alert("لطفاً عنوان تکلیف را وارد کن.");
    return;
  }

  tasks.push({
    id: Date.now(),
    title,
    completed: false
  });

  input.value = "";
  saveTasks();
  renderTasks();
});

renderTasks();
