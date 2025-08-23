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

// --- Application State ---
// This is the default structure of our data.
const defaultData = {
    heading: "My Daily Dashboard",
    goals: [],
    streak: { count: 0, lastCompleted: null },
    timetable: {},
    imageUrl: ''
};
let currentData = { ...defaultData }; // Start with a copy of the default data

let isEditingTimetable = false;
let currentlyEditingCell = null;
const timetableTimes = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
const timetableDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// --- Debounce variable ---
let debounceTimeout;

// --- Data Handling with JSONBin.io ---
async function loadDataFromJsonBin() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': JSONBIN_MASTER_KEY
            }
        });

        if (!response.ok) {
            // If the bin doesn't exist or there's an error, create it with default data.
            console.log("No data found or error fetching, creating initial data.");
            currentData = { ...defaultData }; // Ensure currentData is reset to default
            await saveDataToJsonBin(); // Save the clean default structure
        } else {
            const data = await response.json();
            // **CRITICAL FIX:** Check if the record is a valid, non-null object before merging.
            if (data.record && typeof data.record === 'object' && data.record !== null && Object.keys(data.record).length > 0) {
                // Safely merge the loaded data with the default structure.
                // This ensures that if the loaded data is missing properties, they are added from the default.
                currentData = {
                    ...defaultData,
                    ...data.record,
                    // Also merge nested objects to be extra safe
                    streak: { ...defaultData.streak, ...(data.record.streak || {}) },
                };
            } else {
                // If the record is empty, null, or not an object, use the default data.
                console.log("Invalid or empty record found, using default data.");
                currentData = { ...defaultData };
                await saveDataToJsonBin(); // Overwrite the bad data with good data
            }
        }
    } catch (error) {
        console.error("Error loading data:", error);
        currentData = { ...defaultData }; // In case of any error, fall back to defaults
    }
    updateUI();
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

// --- Debounced Save Function ---
function debouncedSave() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(saveDataToJsonBin, 1000);
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
    // Ensure goals is always an array before trying to use it.
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
    const total = currentData.goals?.length || 0;
    if (total === 0) {
        progressBar.style.width = '0%';
        return;
    }
    const completed = currentData.goals.filter(g => g.completed).length;
    progressBar.style.width = `${(completed / total) * 100}%`;
}

function updateStreak() {
    const today = new Date().toDateString();
    const lastCompleted = currentData.streak?.lastCompleted;
    if (lastCompleted) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastCompleted !== today && lastCompleted !== yesterday.toDateString()) {
            currentData.streak.count = 0;
        }
    }
    streakCountEl.textContent = currentData.streak?.count || 0;
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
    debouncedSave();
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
            debouncedSave();
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        imagePlaceholder.innerHTML = '<span>Upload failed</span>';
    }
});

function handleAddGoal() {
    const text = newGoalInput.value.trim();
    if (text) {
        // Ensure goals array exists before pushing
        if (!currentData.goals) {
            currentData.goals = [];
        }
        currentData.goals.push({ text, completed: false });
        newGoalInput.value = '';
        updateGoals();
        debouncedSave();
    }
}
addGoalBtn.addEventListener('click', handleAddGoal);
newGoalInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleAddGoal());

goalsList.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-index]');
    if (li && currentData.goals) {
        const index = parseInt(li.dataset.index, 10);
        currentData.goals[index].completed = !currentData.goals[index].completed;
        const allCompleted = currentData.goals.every(g => g.completed);
        const today = new Date().toDateString();
        if (allCompleted && currentData.streak.lastCompleted !== today) {
            if(!currentData.streak) currentData.streak = { count: 0, lastCompleted: null };
            currentData.streak.count++;
            currentData.streak.lastCompleted = today;
        }
        updateGoals();
        updateStreak();
        debouncedSave();
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
        debouncedSave();
        closeModal();
    }
});

modalCancelBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => e.target === modalOverlay && closeModal());
    
// --- Initial Load ---
loadDataFromJsonBin();

