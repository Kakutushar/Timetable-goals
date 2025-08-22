// Progress bar update
const tasks = document.querySelectorAll('.task');
const progress = document.getElementById('progress');
const streakCount = document.getElementById('streak-count');
let streak = 0;

tasks.forEach(task => {
  task.addEventListener('change', updateProgress);
});

function updateProgress() {
  const total = tasks.length;
  const completed = document.querySelectorAll('.task:checked').length;
  const percent = (completed / total) * 100;
  progress.style.width = percent + '%';

  if (completed === total) {
    streak++;
    streakCount.textContent = streak;
  }
}

// Image upload preview
const fileInput = document.getElementById('file-input');
const preview = document.getElementById('preview');
const label = document.querySelector('.image-upload label');

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.style.display = "block";
      label.style.display = "none";
    }
    reader.readAsDataURL(file);
  }
});
