// --- Configuration ---
// This is the final, working setup.
const IMGBB_API_KEY = 'PASTE_YOUR_IMGBB_API_KEY_HERE';
const JSONBIN_MASTER_KEY = '$2a$10$xgBIEIBCeftimziCGu53VudNEB5SID9WOD9phb2FAxezLz/IpjSIK';
const JSONBIN_BIN_ID = '68a98b4343b1c97be9264f29';
@@ -21,24 +20,31 @@ const modalCellInfo = document.getElementById('modal-cell-info');
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
// This is the default structure of our data.
const defaultData = {
    heading: "My Daily Dashboard",
    goals: [],
    goalsDate: new Date().toDateString(), // NEW: Track the date for the goals
    uncompletedArchive: [], // NEW: Store old, unfinished tasks
    streak: { count: 0, lastCompleted: null },
    timetable: {},
    imageUrl: ''
};
let currentData = { ...defaultData }; // Start with a copy of the default data
let currentData = { ...defaultData };

let isEditingTimetable = false;
let currentlyEditingCell = null;
const timetableTimes = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
const timetableDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// --- Debounce variable ---
let debounceTimeout;

// --- Data Handling with JSONBin.io ---
@@ -51,36 +57,56 @@ async function loadDataFromJsonBin() {
        });

        if (!response.ok) {
            // If the bin doesn't exist or there's an error, create it with default data.
            console.log("No data found or error fetching, creating initial data.");
            currentData = { ...defaultData }; // Ensure currentData is reset to default
            await saveDataToJsonBin(); // Save the clean default structure
            currentData = { ...defaultData };
            await saveDataToJsonBin();
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
                await saveDataToJsonBin();
            }
        }
    } catch (error) {
        console.error("Error loading data:", error);
        currentData = { ...defaultData }; // In case of any error, fall back to defaults
        currentData = { ...defaultData };
    }
    
    // Run daily checks after loading data
    checkDailyReset();
    checkStreakOnLoad();
    updateUI();
}

// --- NEW: Daily Reset Logic ---
function checkDailyReset() {
    const today = new Date().toDateString();
    // If the saved goals are from a previous day
    if (currentData.goalsDate !== today) {
        // Find any goals that were not completed
        const uncompleted = currentData.goals.filter(goal => !goal.completed);
        
        // Add them to the archive
        if (uncompleted.length > 0) {
            currentData.uncompletedArchive.push(...uncompleted);
        }
        
        // Start fresh for today
        currentData.goals = [];
        currentData.goalsDate = today;
        
        // Save these changes immediately
        saveDataToJsonBin();
    }
}


async function saveDataToJsonBin() {
    try {
@@ -98,20 +124,19 @@ async function saveDataToJsonBin() {
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
    updateStreakUI();
    updateTimetable();
    updateProfileImage();
    updateUncompletedModal();
}

function updateHeading() {
@@ -132,7 +157,6 @@ function updateProfileImage() {

function updateGoals() {
    goalsList.innerHTML = '';
    // Ensure goals is always an array before trying to use it.
    if (!currentData.goals || currentData.goals.length === 0) {
        goalsList.innerHTML = '<li>No goals yet. Add one below!</li>';
    } else {
@@ -157,19 +181,63 @@ function updateProgressBar() {
    progressBar.style.width = `${(completed / total) * 100}%`;
}

function updateStreak() {
function updateStreakUI() {
    streakCountEl.textContent = currentData.streak?.count || 0;
}

// NEW: Function to update the uncompleted tasks modal
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

// --- Streak Logic ---
function checkStreakOnLoad() {
    const today = new Date().toDateString();
    const lastCompleted = currentData.streak?.lastCompleted;

    if (lastCompleted) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastCompleted !== today && lastCompleted !== yesterday.toDateString()) {
            currentData.streak.count = 0;
            currentData.streak.lastCompleted = null;
            debouncedSave();
        }
    }
    streakCountEl.textContent = currentData.streak?.count || 0;
}

function updateStreakLogic() {
    const today = new Date().toDateString();
    const allCompleted = currentData.goals?.length > 0 && currentData.goals.every(g => g.completed);
    
    if (allCompleted) {
        if (currentData.streak.lastCompleted !== today) {
            currentData.streak.count++;
            currentData.streak.lastCompleted = today;
        }
    } 
    else {
        if (currentData.streak.lastCompleted === today) {
            currentData.streak.count--;
            currentData.streak.lastCompleted = null;
        }
    }
    
    updateStreakUI();
    debouncedSave();
}


function updateTimetable() {
    timetableBody.innerHTML = '';
    timetableTimes.forEach(time => {
@@ -225,7 +293,6 @@ imageUploadInput.addEventListener('change', async (e) => {
function handleAddGoal() {
    const text = newGoalInput.value.trim();
    if (text) {
        // Ensure goals array exists before pushing
        if (!currentData.goals) {
            currentData.goals = [];
        }
@@ -243,16 +310,9 @@ goalsList.addEventListener('click', (e) => {
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
        updateStreakLogic();
    }
});

@@ -293,7 +353,27 @@ modalSaveBtn.addEventListener('click', () => {

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
    debouncedSave();
});

uncompletedModal.addEventListener('click', (e) => {
    if (e.target === uncompletedModal) {
        uncompletedModal.style.display = 'none';
    }
});

// --- Initial Load ---
loadDataFromJsonBin();
