// js/auth.js
(function () {
  let mode = 'signin';

  const form       = document.getElementById('auth-form');
  const submitBtn  = document.getElementById('auth-submit');
  const modeToggle = document.getElementById('auth-mode-toggle');
  const nameField  = document.getElementById('auth-name-field');
  const errorEl    = document.getElementById('auth-error');
  const googleBtn  = document.getElementById('google-signin-btn');

  // Maps Firebase error codes to friendly messages
  function friendlyError(code, mode) {
    const map = {
      // Sign-in errors
      'auth/invalid-credential':         'Incorrect email or password. Please try again.',
      'auth/invalid-email':              'That doesn\'t look like a valid email address.',
      'auth/user-not-found':             'No account found with that email. Did you mean to sign up?',
      'auth/wrong-password':             'Incorrect email or password. Please try again.',
      'auth/too-many-requests':          'Too many failed attempts. Please wait a moment and try again.',
      'auth/user-disabled':              'This account has been disabled. Please contact support.',
      // Sign-up errors
      'auth/email-already-in-use':       'An account with that email already exists. Try signing in instead.',
      'auth/weak-password':              'Password must be at least 6 characters.',
      // Google errors
      'auth/popup-closed-by-user':       'Sign-in window was closed. Please try again.',
      'auth/popup-blocked':              'Pop-up was blocked by your browser. Please allow pop-ups and try again.',
      'auth/cancelled-popup-request':    'Sign-in was cancelled. Please try again.',
      'auth/network-request-failed':     'Network error. Check your connection and try again.',
      'auth/api-key-not-valid':          'App configuration error. Please contact support.',
      'auth/unauthorized-domain':        'This domain isn\'t authorised. Please contact support.',
    };
    return map[code] || (mode === 'signup'
      ? 'Couldn\'t create your account. Please try again.'
      : 'Incorrect email or password. Please try again.');
  }

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
      const code = e.code || '';
      showError(friendlyError(code, 'signin'));
    }
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    const email    = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Loading...';
    try {
      if (mode === 'signup') {
        await window.createUserWithEmailAndPassword(window.firebaseAuth, email, password);
      } else {
        await window.signInWithEmailAndPassword(window.firebaseAuth, email, password);
      }
    } catch (e) {
      const code = e.code || '';
      showError(friendlyError(code, mode));
      submitBtn.disabled    = false;
      submitBtn.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
    }
  };

  function showError(msg) {
    errorEl.textContent   = msg;
    errorEl.style.display = 'block';
  }
})();
