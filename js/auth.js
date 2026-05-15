// js/auth.js
(function () {
  let mode = 'signin';
  let usernameValid = false;   // tracks whether the typed handle passed the availability check
  let usernameTimer = null;    // debounce timer for the availability check

  const form           = document.getElementById('auth-form');
  const submitBtn      = document.getElementById('auth-submit');
  const modeToggle     = document.getElementById('auth-mode-toggle');
  const nameField      = document.getElementById('auth-name-field');
  const usernameField  = document.getElementById('auth-username-field');
  const usernameInput  = document.getElementById('auth-username');
  const usernameStatus = document.getElementById('auth-username-status');
  const usernameHint   = document.getElementById('auth-username-hint');
  const errorEl        = document.getElementById('auth-error');
  const googleBtn      = document.getElementById('google-signin-btn');

  // ── Friendly error messages ─────────────────────────────────
  function friendlyError(code, mode) {
    const map = {
      'auth/invalid-credential':      'Incorrect email or password. Please try again.',
      'auth/invalid-email':           'That doesn\'t look like a valid email address.',
      'auth/user-not-found':          'No account found with that email. Did you mean to sign up?',
      'auth/wrong-password':          'Incorrect email or password. Please try again.',
      'auth/too-many-requests':       'Too many failed attempts. Please wait a moment and try again.',
      'auth/user-disabled':           'This account has been disabled. Please contact support.',
      'auth/email-already-in-use':    'An account with that email already exists. Try signing in instead.',
      'auth/weak-password':           'Password must be at least 6 characters.',
      'auth/popup-closed-by-user':    'Sign-in window was closed. Please try again.',
      'auth/popup-blocked':           'Pop-up was blocked by your browser. Please allow pop-ups for this site.',
      'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
      'auth/network-request-failed':  'Network error. Check your connection and try again.',
      'auth/api-key-not-valid':       'App configuration error. Please contact support.',
      'auth/unauthorized-domain':     'This domain isn\'t authorised. Please contact support.',
    };
    return map[code] || (mode === 'signup'
      ? 'Couldn\'t create your account. Please try again.'
      : 'Incorrect email or password. Please try again.');
  }

  // ── Mode switching (sign in ↔ sign up) ─────────────────────
  function setMode(m) {
    mode = m;
    errorEl.style.display = 'none';
    if (m === 'signup') {
      nameField.style.display     = 'flex';
      usernameField.style.display = 'flex';
      submitBtn.textContent       = 'Create account';
      modeToggle.textContent      = 'Sign in';
      document.querySelector('.auth-switch').childNodes[0].textContent = 'Already have one? ';
    } else {
      nameField.style.display     = 'none';
      usernameField.style.display = 'none';
      submitBtn.textContent       = 'Sign in';
      modeToggle.textContent      = 'Join pōyi';
      document.querySelector('.auth-switch').childNodes[0].textContent = "Don't have an account? ";
      // Reset username state when switching back to sign-in
      usernameValid = false;
      setUsernameState('idle', '');
    }
  }

  modeToggle.onclick = () => setMode(mode === 'signin' ? 'signup' : 'signin');

  // ── Password visibility toggle ──────────────────────────────
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

  // ── Username availability check ─────────────────────────────
  // Allowed characters: a-z, 0-9, underscore, dot
  const HANDLE_RE = /^[a-z0-9_.]{3,20}$/;

  function setUsernameState(state, msg) {
    // state: 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
    usernameHint.textContent   = msg || 'Letters, numbers, underscores and dots only';
    usernameStatus.textContent = '';
    usernameStatus.className   = 'auth-username-status';
    usernameInput.className    = '';

    if (state === 'checking') {
      usernameStatus.textContent = '…';
      usernameStatus.classList.add('checking');
    } else if (state === 'available') {
      usernameStatus.textContent = '✓';
      usernameStatus.classList.add('available');
      usernameInput.classList.add('input-available');
      usernameHint.textContent = `@${usernameInput.value} is available`;
    } else if (state === 'taken') {
      usernameStatus.textContent = '✕';
      usernameStatus.classList.add('taken');
      usernameInput.classList.add('input-taken');
      usernameHint.textContent = `@${usernameInput.value} is already taken`;
    } else if (state === 'invalid') {
      usernameStatus.textContent = '✕';
      usernameStatus.classList.add('taken');
      usernameInput.classList.add('input-taken');
    }
  }

  usernameInput.oninput = () => {
    // Strip anything that isn't allowed, force lowercase
    usernameInput.value = usernameInput.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');

    const val = usernameInput.value;
    usernameValid = false;
    clearTimeout(usernameTimer);

    if (!val) {
      setUsernameState('idle', '');
      return;
    }
    if (val.length < 3) {
      setUsernameState('invalid', 'Username must be at least 3 characters');
      return;
    }
    if (val.length > 20) {
      setUsernameState('invalid', 'Username must be 20 characters or fewer');
      return;
    }
    if (!HANDLE_RE.test(val)) {
      setUsernameState('invalid', 'Only letters, numbers, underscores and dots allowed');
      return;
    }

    // Valid format — debounce the Firestore check by 500 ms
    setUsernameState('checking', 'Checking availability…');
    usernameTimer = setTimeout(async () => {
      try {
        const available = await window.DB.checkHandleAvailable(val);
        if (usernameInput.value !== val) return; // user kept typing, stale result
        if (available) {
          usernameValid = true;
          setUsernameState('available', '');
        } else {
          usernameValid = false;
          setUsernameState('taken', '');
        }
      } catch (e) {
        // If the check fails (e.g. offline), allow proceeding — server will validate
        usernameValid = true;
        setUsernameState('idle', 'Could not verify — will check on sign up');
      }
    }, 500);
  };

  // ── Google sign-in ──────────────────────────────────────────
  googleBtn.onclick = async () => {
    try {
      await window.signInWithPopup(window.firebaseAuth, window.googleProvider);
    } catch (e) {
      showError(friendlyError(e.code || '', 'signin'));
    }
  };

  // ── Email/password form submit ──────────────────────────────
  form.onsubmit = async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';

    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    // Extra validation for sign-up
    if (mode === 'signup') {
      const handle = usernameInput.value.trim();

      if (!handle) {
        showError('Please choose a username.');
        usernameInput.focus();
        return;
      }
      if (!HANDLE_RE.test(handle)) {
        showError('Username can only contain letters, numbers, underscores and dots (3–20 characters).');
        usernameInput.focus();
        return;
      }
      if (!usernameValid) {
        // Run one final check in case the debounced one hasn't finished yet
        setUsernameState('checking', 'Checking availability…');
        const available = await window.DB.checkHandleAvailable(handle);
        if (!available) {
          usernameValid = false;
          setUsernameState('taken', '');
          showError(`@${handle} is already taken. Please choose a different username.`);
          usernameInput.focus();
          return;
        }
        usernameValid = true;
        setUsernameState('available', '');
      }
    }

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Loading...';

    try {
      if (mode === 'signup') {
        const name   = document.getElementById('auth-name').value.trim();
        const handle = usernameInput.value.trim();

        // Create the Firebase Auth account
        const cred = await window.createUserWithEmailAndPassword(window.firebaseAuth, email, password);

        // Create the Firestore user profile with the chosen handle
        await window.DB.createUserProfile(cred.user.uid, {
          displayName: name || handle,
          handle:      handle,
          email:       email,
          photoURL:    '',
        });
      } else {
        await window.signInWithEmailAndPassword(window.firebaseAuth, email, password);
      }
    } catch (e) {
      showError(friendlyError(e.code || '', mode));
      submitBtn.disabled    = false;
      submitBtn.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
    }
  };

  function showError(msg) {
    errorEl.textContent   = msg;
    errorEl.style.display = 'block';
  }
})();
