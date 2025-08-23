// --- Configuration ---
// This is the final, working setup.
const IMGBB_API_KEY = 'PASTE_YOUR_IMGBB_API_KEY_HERE';
const JSONBIN_MASTER_KEY = '$2a$10$xgBIEIBCeftimziCGu53VudNEB5SID9WOD9phb2FAxezLz/IpjSIK';
const JSONBIN_BIN_ID = '68a98b4343b1c97be9264f29';

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
// New elements for uncompleted tasks
const viewUncompletedBtn = document.getElementById('view-uncompleted-btn');
const uncompletedModal = document.getElementById('uncompleted-modal');
const uncompletedList = document.getElementById('uncompleted-list');
const uncompletedClearBtn = document.getElementById('uncompleted-clear-btn');
const uncompletedCloseBtn = document.getElementById('uncompleted-close-btn');


// --- Application State ---
const defaultData = {
    heading: "My Daily Dashboard",
    goals: [],
    goalsDate: new Date().toDateString(),
    uncompletedArchive: [],
    streak: { count: 0, lastCompleted: null },
    timetable: {},
    imageUrl: ''
};
let currentData = { ...defaultData };

let isEditingTimetable = false;
let currentlyEditingCell = null;
const timetableTimes = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
const timetableDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// --- Data Handling with JSONBin.io ---
async function loadDataFromJsonBin() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': JSONBIN_MASTER_KEY
            }
        });

        if (!response.ok) {
            console.log("No data found or error fetching, creating initial data.");
            currentData = { ...defaultData };
            await saveDataToJsonBin();
        } else {
            const data = await response.json();
            if (data.record && typeof data.record === 'object' && data.record !== null && Object.keys(data.record).length > 0) {
                currentData = {
                    ...defaultData,
                    ...data.record,
                    streak: { ...defaultData.streak, ...(data.record.streak || {}) },
                };
            } else {
                console.log("Invalid or empty record found, using default data.");
                currentData = { ...defaultData };
                await saveDataToJsonBin();
            }
        }
    } catch (error) {
        console.error("Error loading data:", error);
        currentData = { ...defaultData };
    }
    
    checkDailyReset();
    checkStreakOnLoad();
    updateUI();
}

function checkDailyReset() {
    const today = new Date().toDateString();
    if (currentData.goalsDate !== today) {
        const uncompleted = currentData.goals.filter(goal => !goal.completed);
        
        if (uncompleted.length > 0) {
            if (!currentData.uncompletedArchive) {
                currentData.uncompletedArchive = [];
            }
            currentData.uncompletedArchive.push(...uncompleted);
        }
        
        currentData.goals = [];
        currentData.goalsDate = today;
        
        saveDataToJsonBin();
    }
}


async function saveDataToJsonBin() {
    try {
        await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_MASTER_KEY
            },
            body: JSON.stringify(currentData),
        });
        console.log("Data saved successfully.");
    } catch (error) {
        console.error("Error saving data:", error);
    }
}

// --- UI Update Functions ---
function updateUI() {
    updateHeading();
    updateGoals();
    updateStreakUI();
    updateTimetable();
    updateProfileImage();
    updateUncompletedModal();
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
    // This function will now also handle the streak logic
    updateProgressAndStreak();
}

// --- NEW COMBINED LOGIC for Progress and Streak ---
function updateProgressAndStreak() {
    const total = currentData.goals?.length || 0;
    let completed = 0;
    if (total > 0) {
        completed = currentData.goals.filter(g => g.completed).length;
    }
    
    const percentage = (total === 0) ? 0 : (completed / total) * 100;
    
    progressBar.style.width = `${percentage}%`;

    // New Streak Logic based on progress bar
    const todayString = new Date().toDateString();

    if (percentage === 100 && total > 0) {
        // If progress is 100% and streak hasn't been awarded today, award it.
        if (currentData.streak.lastCompleted !== todayString) {
            currentData.streak.count++;
            currentData.streak.lastCompleted = todayString;
        }
    } else {
        // If progress is less than 100% and the streak WAS awarded today, take it back.
        if (currentData.streak.lastCompleted === todayString) {
            currentData.streak.count--;
            currentData.streak.lastCompleted = null;
        }
    }
    
    updateStreakUI(); // Update the display
    saveDataToJsonBin(); // Save changes
}


function updateStreakUI() {
    streakCountEl.textContent = currentData.streak?.count || 0;
}

function updateUncompletedModal() {
    uncompletedList.innerHTML = '';
    if (!currentData.uncompletedArchive || currentData.uncompletedArchive.length === 0) {
        uncompletedList.innerHTML = '<li>No uncompleted tasks!</li>';
    } else {
        currentData.uncompletedArchive.forEach(goal => {
            const li = document.createElement('li');
            li.textContent = goal.text;
            uncompletedList.appendChild(li);
        });
    }
}

function checkStreakOnLoad() {
    if (!currentData.streak || !currentData.streak.lastCompleted) {
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const lastCompletedDate = new Date(currentData.streak.lastCompleted);
    lastCompletedDate.setHours(0, 0, 0, 0);

    if (lastCompletedDate.getTime() !== today.getTime() && lastCompletedDate.getTime() !== yesterday.getTime()) {
        console.log("Streak broken!");
        currentData.streak.count = 0;
        currentData.streak.lastCompleted = null;
        saveDataToJsonBin();
    }
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
            cell.textContent = currentData.timetable?.[`${day}-${time}`] || '';
            row.appendChild(cell);
        });
        timetableBody.appendChild(row);
    });
}

// --- Event Listeners ---
mainHeading.addEventListener('blur', () => {
    currentData.heading = mainHeading.textContent;
    saveDataToJsonBin();
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
            updateProfileImage();
            saveDataToJsonBin();
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        imagePlaceholder.innerHTML = '<span>Upload failed</span>';
    }
});

function handleAddGoal() {
    const text = newGoalInput.value.trim();
    if (text) {
        if (!currentData.goals) {
            currentData.goals = [];
        }
        currentData.goals.push({ text, completed: false });
        newGoalInput.value = '';
        updateGoals(); // This will trigger the progress/streak update
    }
}
addGoalBtn.addEventListener('click', handleAddGoal);
newGoalInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleAddGoal());

goalsList.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-index]');
    if (li && currentData.goals) {
        const index = parseInt(li.dataset.index, 10);
        currentData.goals[index].completed = !currentData.goals[index].completed;
        
        updateGoals(); // This will trigger the progress/streak update
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
        if (!currentData.timetable) {
            currentData.timetable = {};
        }
        currentData.timetable[cellId] = modalTextarea.value;
        currentlyEditingCell.textContent = modalTextarea.value;
        saveDataToJsonBin();
        closeModal();
    }
});

modalCancelBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => e.target === modalOverlay && closeModal());

// NEW Listeners for uncompleted modal
viewUncompletedBtn.addEventListener('click', () => {
    uncompletedModal.style.display = 'flex';
});

uncompletedCloseBtn.addEventListener('click', () => {
    uncompletedModal.style.display = 'none';
});

uncompletedClearBtn.addEventListener('click', () => {
    currentData.uncompletedArchive = [];
    updateUncompletedModal();
    saveDataToJsonBin();
});

uncompletedModal.addEventListener('click', (e) => {
    if (e.target === uncompletedModal) {
        uncompletedModal.style.display = 'none';
    }
});
    
// --- Initial Load ---
loadDataFromJsonBin();
