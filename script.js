// --- Configuration ---
// This is the final, working setup.
const IMGBB_API_KEY = 'PASTE_YOUR_IMGBB_API_KEY_HERE';
const KVDB_BUCKET_ID = 'UGoddn3CHQ2YX3s5Rq8s4Y';
const DATA_KEY = 'dashboardData'; // The key for our data within the bucket

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
    imageUrl: ''
};
let isEditingTimetable = false;
let currentlyEditingCell = null;
const timetableTimes = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
const timetableDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// --- Data Handling with kvdb.io ---
async function loadDataFromKVDB() {
    try {
        const response = await fetch(`https://kvdb.io/${KVDB_BUCKET_ID}/${DATA_KEY}`);
        if (response.status === 404) { // Not found, which is normal on first run
            console.log("No data found, using defaults.");
            saveDataToKVDB(); // Save the initial default state
        } else if (response.ok) {
            const data = await response.json();
            currentData = data;
        } else {
            throw new Error('Could not fetch data.');
        }
    } catch (error) {
        console.error("Error loading data:", error);
    }
    updateUI();
}

async function saveDataToKVDB() {
    try {
        await fetch(`https://kvdb.io/${KVDB_BUCKET_ID}/${DATA_KEY}`, {
            method: 'POST',
            body: JSON.stringify(currentData),
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
    saveDataToKVDB();
});

imageUploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    imagePlaceholder.innerHTML = '<span>Uploading...</span>';

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error('Image upload failed.');

        const result = await response.json();
        
        if (result.data && result.data.url) {
            currentData.imageUrl = result.data.url;
            await saveDataToKVDB();
            updateProfileImage();
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        imagePlaceholder.innerHTML = '<span>Upload failed</span>';
    }
});

function handleAddGoal() {
    const text = newGoalInput.value.trim();
    if (text) {
        currentData.goals.push({ text, completed: false });
        newGoalInput.value = '';
        updateGoals();
        saveDataToKVDB();
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
        saveDataToKVDB();
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
        saveDataToKVDB();
        closeModal();
    }
});

modalCancelBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => e.target === modalOverlay && closeModal());
    
// --- Initial Load ---
loadDataFromKVDB();
