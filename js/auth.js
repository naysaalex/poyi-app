// js/auth.js
(function () {
  let mode = 'signin';

  const form       = document.getElementById('auth-form');
  const submitBtn  = document.getElementById('auth-submit');
  const modeToggle = document.getElementById('auth-mode-toggle');
  const nameField  = document.getElementById('auth-name-field');
  const errorEl    = document.getElementById('auth-error');
  const googleBtn  = document.getElementById('google-signin-btn');

  function setMode(m) {
    mode = m;
    if (m === 'signup') {
      nameField.style.display = 'flex';
      submitBtn.textContent   = 'Create account';
      modeToggle.textContent  = 'Sign in';
      document.querySelector('.auth-switch').childNodes[0].textContent = 'Already have one? ';
    } else {
      nameField.style.display = 'none';
      submitBtn.textContent   = 'Sign in';
      modeToggle.textContent  = 'Join pōyi';
      document.querySelector('.auth-switch').childNodes[0].textContent = "Don't have an account? ";
    }
    errorEl.style.display = 'none';
  }

  modeToggle.onclick = () => setMode(mode === 'signin' ? 'signup' : 'signin');

  // Password visibility toggle
  const toggleBtn  = document.getElementById('toggle-password');
  const passwordEl = document.getElementById('auth-password');
  const eyeOpen    = document.getElementById('eye-open');
  const eyeClosed  = document.getElementById('eye-closed');

  toggleBtn.onclick = () => {
    const isHidden = passwordEl.type === 'password';
    passwordEl.type         = isHidden ? 'text'     : 'password';
    eyeOpen.style.display   = isHidden ? 'none'     : '';
    eyeClosed.style.display = isHidden ? ''         : 'none';
    toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
  };

  googleBtn.onclick = async () => {
    try {
      await window.signInWithPopup(window.firebaseAuth, window.googleProvider);
    } catch (e) {
      showError(e.message);
    }
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    const email    = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Loading...';
    try {
      if (mode === 'signup') {
        await window.createUserWithEmailAndPassword(window.firebaseAuth, email, password);
      } else {
        await window.signInWithEmailAndPassword(window.firebaseAuth, email, password);
      }
    } catch (e) {
      showError(e.message.replace('Firebase: ', '').replace(/\(auth.*\)\.?/, '').trim());
      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
    }
  };

  function showError(msg) {
    errorEl.textContent   = msg;
    errorEl.style.display = 'block';
  }
})();
