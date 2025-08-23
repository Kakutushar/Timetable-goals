// --- Configuration ---
// Your personal Gist ID and GitHub Token are now included.
const GIST_ID = '55a239249b3071a56dceb5ecb632981d';
const GITHUB_TOKEN = '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';
const FILENAME = 'dashboard-data.json'; // The filename you used in your Gist

// --- DOM Element References ---
const profileImage = document.getElementById('profile-image');
const imagePlaceholder = document.getElementById('image-placeholder');
const imageUploadInput = document.getElementById('image-upload-input');
const mainHeading = document.getElementById('main-heading');
const goalsList = document.getElementById('goals-list');
const newGoalInput = document.getElementById('new-goal-input');
const addGoalBtn = document.getElementById('add-goal-btn');
const progressBar = document.getElementById('progress-bar');
const streakCountEl = document.getElementById('streak-count');
const timetableBody = document.querySelector('#timetable tbody');
const editTimetableBtn = document.getElementById('edit-timetable-btn');
const modalOverlay = document.getElementById('timetable-modal');
const modalCellInfo = document.getElementById('modal-cell-info');
const modalTextarea = document.getElementById('modal-textarea');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

// --- Application State ---
let currentData = {
    heading: "My Daily Dashboard",
    goals: [],
    streak: { count: 0, lastCompleted: null },
    timetable: {},
    imageUrl: '' // This will be a long Base64 string
};
let isEditingTimetable = false;
let currentlyEditingCell = null;
const timetableTimes = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
const timetableDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// --- Data Handling with GitHub Gist ---
async function loadDataFromGist() {
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`);
        if (!response.ok) throw new Error('Could not fetch Gist data.');
        
        const gist = await response.json();
        const fileContent = gist.files[FILENAME]?.content;

        if (fileContent && fileContent !== '{}') { // Check if content is not empty
            currentData = JSON.parse(fileContent);
        }
    } catch (error) {
        console.error("Error loading data:", error);
        // If it fails to load (e.g., first time use), it will just use the default data.
    }
    updateUI();
}

async function saveDataToGist() {
    try {
        await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({
                files: {
                    [FILENAME]: {
                        content: JSON.stringify(currentData, null, 2), // Pretty print the JSON
                    },
                },
            }),
        });
    } catch (error) {
        console.error("Error saving data:", error);
    }
}

// --- UI Update Functions ---
function updateUI() {
    updateHeading();
    updateGoals();
    updateStreak();
    updateTimetable();
    updateProfileImage();
}

function updateHeading() {
    mainHeading.textContent = currentData.heading;
}

function updateProfileImage() {
    if (currentData.imageUrl) {
        profileImage.src = currentData.imageUrl;
        profileImage.classList.add('loaded');
        imagePlaceholder.style.display = 'none';
    } else {
        profileImage.src = '';
        profileImage.classList.remove('loaded');
        imagePlaceholder.style.display = 'flex';
    }
}

function updateGoals() {
    goalsList.innerHTML = '';
    if (!currentData.goals || currentData.goals.length === 0) {
        goalsList.innerHTML = '<li>No goals yet. Add one below!</li>';
    } else {
        currentData.goals.forEach((goal, index) => {
            const li = document.createElement('li');
            li.className = goal.completed ? 'completed' : '';
            li.dataset.index = index;
            li.innerHTML = `<div class="checkbox">${goal.completed ? '✔' : ''}</div><span>${goal.text}</span>`;
            goalsList.appendChild(li);
        });
    }
    updateProgressBar();
}

function updateProgressBar() {
    const total = currentData.goals.length;
    if (total === 0) {
        progressBar.style.width = '0%';
        return;
    }
    const completed = currentData.goals.filter(g => g.completed).length;
    progressBar.style.width = `${(completed / total) * 100}%`;
}

function updateStreak() {
    const today = new Date().toDateString();
    const lastCompleted = currentData.streak.lastCompleted;
    if (lastCompleted) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastCompleted !== today && lastCompleted !== yesterday.toDateString()) {
            currentData.streak.count = 0;
        }
    }
    streakCountEl.textContent = currentData.streak.count;
}

function updateTimetable() {
    timetableBody.innerHTML = '';
    timetableTimes.forEach(time => {
        const row = document.createElement('tr');
        row.innerHTML = `<th>${time}</th>`;
        timetableDays.forEach(day => {
            const cell = document.createElement('td');
            cell.dataset.time = time;
            cell.dataset.day = day;
            cell.textContent = currentData.timetable[`${day}-${time}`] || '';
            row.appendChild(cell);
        });
        timetableBody.appendChild(row);
    });
}

// --- Event Listeners ---
mainHeading.addEventListener('blur', () => {
    currentData.heading = mainHeading.textContent;
    saveDataToGist();
});

imageUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        currentData.imageUrl = event.target.result; // The result is the Base64 string
        updateProfileImage();
        saveDataToGist();
    };
    reader.readAsDataURL(file);
});

function handleAddGoal() {
    const text = newGoalInput.value.trim();
    if (text) {
        currentData.goals.push({ text, completed: false });
        newGoalInput.value = '';
        updateGoals();
        saveDataToGist();
    }
}
addGoalBtn.addEventListener('click', handleAddGoal);
newGoalInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleAddGoal());

goalsList.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-index]');
    if (li) {
        const index = parseInt(li.dataset.index, 10);
        currentData.goals[index].completed = !currentData.goals[index].completed;
        const allCompleted = currentData.goals.every(g => g.completed);
        const today = new Date().toDateString();
        if (allCompleted && currentData.streak.lastCompleted !== today) {
            currentData.streak.count++;
            currentData.streak.lastCompleted = today;
        }
        updateGoals();
        updateStreak();
        saveDataToGist();
    }
});

editTimetableBtn.addEventListener('click', () => {
    isEditingTimetable = !isEditingTimetable;
    document.getElementById('timetable').classList.toggle('editable', isEditingTimetable);
    editTimetableBtn.textContent = isEditingTimetable ? 'Done' : 'Edit';
    editTimetableBtn.classList.toggle('editing', isEditingTimetable);
});

timetableBody.addEventListener('click', (e) => {
    if (isEditingTimetable && e.target.tagName === 'TD') {
        currentlyEditingCell = e.target;
        modalCellInfo.textContent = `${currentlyEditingCell.dataset.day} at ${currentlyEditingCell.dataset.time}`;
        modalTextarea.value = currentlyEditingCell.textContent;
        modalOverlay.style.display = 'flex';
        modalTextarea.focus();
    }
});

function closeModal() {
    modalOverlay.style.display = 'none';
    currentlyEditingCell = null;
}
    
modalSaveBtn.addEventListener('click', () => {
    if (currentlyEditingCell) {
        const cellId = `${currentlyEditingCell.dataset.day}-${currentlyEditingCell.dataset.time}`;
        currentData.timetable[cellId] = modalTextarea.value;
        currentlyEditingCell.textContent = modalTextarea.value;
        saveDataToGist();
        closeModal();
    }
});

modalCancelBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => e.target === modalOverlay && closeModal());
    
// --- Initial Load ---
loadDataFromGist();
