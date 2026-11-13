
"use strict";

// StudyFlow 2.0
const StudyFlow = {
  tasks: JSON.parse(localStorage.getItem("sf_tasks") || "[]"),

  save() {
    localStorage.setItem("sf_tasks", JSON.stringify(this.tasks));
  },

  addTask(title) {
    if (!title || !title.trim()) return false;

    this.tasks.push({
      id: Date.now(),
      title: title.trim(),
      completed: false
    });

    this.save();
    return true;
  },

  completeTask(id) {
    const task = this.tasks.find(item => item.id === id);
    if (!task) return;

    task.completed = !task.completed;
    this.save();
  },

  deleteTask(id) {
    this.tasks = this.tasks.filter(item => item.id !== id);
    this.save();
  },

  getStats() {
    return {
      total: this.tasks.length,
      completed: this.tasks.filter(t => t.completed).length,
      remaining: this.tasks.filter(t => !t.completed).length
    };
  }
};

window.StudyFlow = StudyFlow;

console.log("StudyFlow 2.0 loaded successfully!");
