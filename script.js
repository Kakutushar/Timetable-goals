// ======================
// DOM ELEMENTS
// ======================
const goalsListEl = document.getElementById('goals-list');
const newGoalInput = document.getElementById('new-goal-input');
const addGoalBtn = document.getElementById('add-goal-btn');
const progressBar = document.getElementById('progress-bar');
const streakCountEl = document.getElementById('streak-count');
const mainHeadingEl = document.getElementById('main-heading');
const timetableBody = document.querySelector('#timetable tbody');
const editTimetableBtn = document.getElementById('edit-timetable-btn');

const timetableStreakCountEl = document.getElementById('timetable-streak-count');
const timetableStreakBtn = document.getElementById('timetable-streak-btn');

// ======================
// DATA
// ======================
let currentData = JSON.parse(localStorage.getItem('dashboardData')) || {
    heading: "My Daily Dashboard",
    goals: [],
    goalsDate: new Date().toDateString(),
    uncompletedArchive: [],
    streak: { count: 0, lastCompleted: null },
    timetableStreak: { count: 0, lastIncrement: null },
    timetable: {},
    imageUrl: ''
};

// ======================
// SAVE + LOAD
// ======================
function saveDataToLocal() {
    localStorage.setItem('dashboardData', JSON.stringify(currentData));
}

// ======================
// GOALS
// ======================
function renderGoals() {
    goalsListEl.innerHTML = '';
    currentData.goals.forEach((goal, index) => {
        const li = document.createElement('li');
        li.textContent = goal.text;
        if (goal.completed) li.classList.add('completed');

        li.addEventListener('click', () => {
            goal.completed = !goal.completed;
            saveDataToLocal();
            renderGoals();
            updateProgress();
        });

        goalsListEl.appendChild(li);
    });
}

function updateProgress() {
    const total = currentData.goals.length;
    const completed = currentData.goals.filter(g => g.completed).length;
    let percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressBar.style.width = percent + '%';

    // If all completed today → increment streak
    const today = new Date().toDateString();
    if (total > 0 && completed === total && currentData.streak.lastCompleted !== today) {
        currentData.streak.count++;
        currentData.streak.lastCompleted = today;
        saveDataToLocal();
    }
    streakCountEl.textContent = currentData.streak.count || 0;
}

// ======================
// STREAK RESET
// ======================
function checkStreakOnLoad() {
    if (!currentData.streak.lastCompleted) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const last = new Date(currentData.streak.lastCompleted); last.setHours(0,0,0,0);

    if (last.getTime() !== today.getTime() && last.getTime() !== yesterday.getTime()) {
        currentData.streak.count = 0;
        currentData.streak.lastCompleted = null;
        saveDataToLocal();
    }
}

// ======================
// TIMETABLE STREAK
// ======================
function updateTimetableStreakUI() {
    const now = new Date();
    const todayString = now.toDateString();
    const last = currentData.timetableStreak.lastIncrement;

    const hour = now.getHours();
    const minute = now.getMinutes();

    const isWindow = (hour === 23 && minute >= 50);
    const alreadyClicked = (last === todayString);

    if (isWindow && !alreadyClicked) {
        timetableStreakBtn.style.display = 'flex';
        timetableStreakCountEl.style.display = 'none';
    } else {
        timetableStreakBtn.style.display = 'none';
        timetableStreakCountEl.style.display = 'block';
        timetableStreakCountEl.textContent = currentData.timetableStreak.count || 0;
    }
}

timetableStreakBtn.addEventListener('click', () => {
    const todayString = new Date().toDateString();
    if (currentData.timetableStreak.lastIncrement !== todayString) {
        currentData.timetableStreak.count++;
        currentData.timetableStreak.lastIncrement = todayString;
        saveDataToLocal();
    }
    updateTimetableStreakUI();
});

function checkTimetableStreakOnLoad() {
    if (!currentData.timetableStreak.lastIncrement) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const lastDate = new Date(currentData.timetableStreak.lastIncrement); lastDate.setHours(0,0,0,0);

    if (lastDate.getTime() !== today.getTime() && lastDate.getTime() !== yesterday.getTime()) {
        currentData.timetableStreak.count = 0;
        currentData.timetableStreak.lastIncrement = null;
        saveDataToLocal();
    }
}

// Update every minute
setInterval(updateTimetableStreakUI, 60 * 1000);

// ======================
// INIT
// ======================
function init() {
    mainHeadingEl.textContent = currentData.heading;
    renderGoals();
    updateProgress();
    checkStreakOnLoad();
    checkTimetableStreakOnLoad();
    updateTimetableStreakUI();
}
init();

// ======================
// EVENTS
// ======================
addGoalBtn.addEventListener('click', () => {
    const text = newGoalInput.value.trim();
    if (text) {
        currentData.goals.push({ text, completed: false });
        newGoalInput.value = '';
        saveDataToLocal();
        renderGoals();
        updateProgress();
    }
});
