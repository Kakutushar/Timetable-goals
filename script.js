// This function runs when the entire page is loaded
document.addEventListener('DOMContentLoaded', () => {

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

    // --- Data Handling with localStorage ---

    // Function to save the current data state to the browser's localStorage
    function saveDataToLocalStorage() {
        // localStorage can only store strings, so we convert our data object into a JSON string.
        localStorage.setItem('timetableAppData', JSON.stringify(currentData));
    }

    // Function to load data from localStorage when the page starts
    function loadDataFromLocalStorage() {
        // Get the saved data string from localStorage.
        const savedData = localStorage.getItem('timetableAppData');
        if (savedData) {
            // If data exists, convert it from a string back into an object and update our state.
            currentData = JSON.parse(savedData);
        }
        // Update the entire UI with the loaded (or default) data.
        updateUI();
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
        saveDataToLocalStorage();
    });

    imageUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // FileReader converts the image file into a Base64 string, which can be saved in localStorage.
        const reader = new FileReader();
        reader.onload = (event) => {
            // The result is a long string representing the image.
            currentData.imageUrl = event.target.result;
            updateProfileImage();
            saveDataToLocalStorage();
        };
        reader.readAsDataURL(file);
    });

    function handleAddGoal() {
        const text = newGoalInput.value.trim();
        if (text) {
            currentData.goals.push({ text, completed: false });
            newGoalInput.value = '';
            updateGoals();
            saveDataToLocalStorage();
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
            saveDataToLocalStorage();
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
            saveDataToLocalStorage();
            closeModal();
        }
    });

    modalCancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => e.target === modalOverlay && closeModal());
    
    // --- Initial Load ---
    // Load any saved data from the browser as soon as the page is ready.
    loadDataFromLocalStorage();
});
