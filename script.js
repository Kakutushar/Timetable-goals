// Image preview
const upload = document.getElementById("uploadImage");
const preview = document.getElementById("preview");
upload.addEventListener("change", () => {
  const file = upload.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  }
});

// Progress bar update
const checkboxes = document.querySelectorAll("#taskList input[type='checkbox']");
const progressFill = document.getElementById("progressFill");
checkboxes.forEach(cb => cb.addEventListener("change", updateProgress));

function updateProgress() {
  const total = checkboxes.length;
  const done = [...checkboxes].filter(cb => cb.checked).length;
  const percent = (done / total) * 100;
  progressFill.style.width = percent + "%";
}

// Streak counter
let streak = 0;
function checkStreak() {
  const allDone = [...checkboxes].every(cb => cb.checked);
  if (allDone) {
    streak++;
    document.getElementById("streakCounter").textContent = streak + "🔥";
  }
}
checkboxes.forEach(cb => cb.addEventListener("change", checkStreak));

// Timetable edit toggle
function toggleEdit() {
  const table = document.getElementById("timetable");
  if (table.contentEditable === "true") {
    table.contentEditable = "false";
    alert("Changes saved!");
  } else {
    table.contentEditable = "true";
  }
}
