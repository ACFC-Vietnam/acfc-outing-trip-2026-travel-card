// ⬇️ REPLACE with your deployed Apps Script Web App URL (ends in /exec)
const API_URL = 'https://script.google.com/macros/s/AKfycbz9jIjKssKbfad1MsY5Gsv9JAsTRCZvuD-G0VbrnmQ46SiEdURYziC7iwlB13xomuAGng/exec';

const loginScreen = document.getElementById('screen-login');
const cardScreen = document.getElementById('screen-card');
const form = document.getElementById('login-form');
const submitBtn = document.getElementById('submit-btn');
const errorMsg = document.getElementById('error-msg');
const backBtn = document.getElementById('back-btn');

function showScreen(el) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('screen--active'));
  el.classList.add('screen--active');
  window.scrollTo(0, 0);
}

function setField(id, value) {
  document.getElementById(id).textContent = value || '—';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.hidden = true;

  const email = document.getElementById('email').value.trim();
  const code = document.getElementById('code').value.trim();

  submitBtn.disabled = true;
  submitBtn.textContent = 'Checking...';

  try {
    const url = `${API_URL}?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.found) {
      setField('out-name', data.name);
      setField('out-bus-number', data.busNumber);
      setField('out-bus-leader', data.busLeaderName);
      setField('out-bus-leader-phone', data.busLeaderPhone);
      setField('out-room-type', data.roomType);
      setField('out-roommate', data.roommateName);
      setField('out-roommate-phone', data.roommateContact);
      showScreen(cardScreen);
    } else {
      errorMsg.textContent = data.message || 'No match found. Please check your details.';
      errorMsg.hidden = false;
    }
  } catch (err) {
    errorMsg.textContent = 'Something went wrong. Please try again in a moment.';
    errorMsg.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Check Travel Card';
  }
});

backBtn.addEventListener('click', () => {
  form.reset();
  showScreen(loginScreen);
});
