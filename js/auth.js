// js/auth.js
// Uses Firebase compat SDK loaded globally in index.html
(function () {
  let mode          = 'signin';
  let usernameValid = false;
  let usernameTimer = null;

  const get = id => document.getElementById(id);

  // ── Auth instance shorthand ─────────────────────────────────
  // firebase.auth() is always available — set in index.html <head>
  const auth = () => firebase.auth();

  // ── Friendly error messages ─────────────────────────────────
  function friendlyError(code, currentMode) {
    const map = {
      'auth/invalid-credential':      'Incorrect email or password. Please try again.',
      'auth/invalid-email':           "That doesn't look like a valid email address.",
      'auth/user-not-found':          'No account found with that email. Did you mean to sign up?',
      'auth/wrong-password':          'Incorrect email or password. Please try again.',
      'auth/too-many-requests':       'Too many failed attempts. Please wait a moment and try again.',
      'auth/user-disabled':           'This account has been disabled. Please contact support.',
      'auth/email-already-in-use':    'An account with that email already exists. Try signing in instead.',
      'auth/weak-password':           'Password must be at least 6 characters.',
      'auth/popup-closed-by-user':    'Sign-in cancelled. Please try again.',
      'auth/popup-blocked':           'Pop-up blocked. Please allow pop-ups for this site and try again.',
      'auth/cancelled-popup-request': 'Sign-in cancelled. Please try again.',
      'auth/network-request-failed':  'Network error. Check your connection and try again.',
      'auth/api-key-not-valid':       'Invalid API key — check your Firebase config in index.html.',
      'auth/unauthorized-domain':     'This domain is not authorised in Firebase — add it under Authentication → Settings → Authorized domains.',
    };
    return map[code] || (currentMode === 'signup'
      ? "Couldn't create your account. Please try again."
      : 'Incorrect email or password. Please try again.');
  }

  function showError(msg) {
    const el = get('auth-error');
    if (!el) return;
    el.textContent   = msg;
    el.style.display = 'block';
  }

  function hideError() {
    const el = get('auth-error');
    if (el) el.style.display = 'none';
  }

  // ── Mode switching ──────────────────────────────────────────
  function setMode(m) {
    mode = m;
    hideError();
    const nameField     = get('auth-name-field');
    const usernameField = get('auth-username-field');
    const submitBtn     = get('auth-submit');
    const modeToggle    = get('auth-mode-toggle');
    const switchEl      = document.querySelector('.auth-switch');

    if (m === 'signup') {
      if (nameField)     nameField.style.display     = 'flex';
      if (usernameField) usernameField.style.display = 'flex';
      if (submitBtn)     submitBtn.textContent        = 'Create account';
      if (modeToggle)    modeToggle.textContent       = 'Sign in';
      if (switchEl && switchEl.childNodes[0])
        switchEl.childNodes[0].textContent = 'Already have one? ';
    } else {
      if (nameField)     nameField.style.display     = 'none';
      if (usernameField) usernameField.style.display = 'none';
      if (submitBtn)     submitBtn.textContent        = 'Sign in';
      if (modeToggle)    modeToggle.textContent       = 'Join pōyi';
      if (switchEl && switchEl.childNodes[0])
        switchEl.childNodes[0].textContent = "Don't have an account? ";
      usernameValid = false;
      setUsernameState('idle', '');
    }
  }

  // ── Username availability ───────────────────────────────────
  const HANDLE_RE = /^[a-z0-9_.]{3,20}$/;

  function setUsernameState(state, msg) {
    const statusEl = get('auth-username-status');
    const hintEl   = get('auth-username-hint');
    const inputEl  = get('auth-username');
    if (!statusEl || !hintEl) return;

    statusEl.textContent = '';
    statusEl.className   = 'auth-username-status';
    if (inputEl) inputEl.className = '';

    if (state === 'checking') {
      statusEl.textContent = '…';
      statusEl.classList.add('checking');
      hintEl.textContent   = 'Checking availability…';
    } else if (state === 'available') {
      statusEl.textContent = '✓';
      statusEl.classList.add('available');
      if (inputEl) inputEl.classList.add('input-available');
      hintEl.textContent   = `@${inputEl ? inputEl.value : ''} is available`;
    } else if (state === 'taken') {
      statusEl.textContent = '✕';
      statusEl.classList.add('taken');
      if (inputEl) inputEl.classList.add('input-taken');
      hintEl.textContent   = `@${inputEl ? inputEl.value : ''} is already taken`;
    } else if (state === 'invalid') {
      statusEl.textContent = '✕';
      statusEl.classList.add('taken');
      if (inputEl) inputEl.classList.add('input-taken');
      if (msg) hintEl.textContent = msg;
    } else {
      if (!msg) hintEl.textContent = 'Letters, numbers, underscores and dots only';
      else hintEl.textContent = msg;
    }
  }

  // Username live check — event delegation so it survives any DOM timing
  document.addEventListener('input', e => {
    if (e.target.id !== 'auth-username') return;
    const inputEl = e.target;
    inputEl.value = inputEl.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    const val = inputEl.value;
    usernameValid = false;
    clearTimeout(usernameTimer);

    if (!val)           { setUsernameState('idle',    ''); return; }
    if (val.length < 3) { setUsernameState('invalid', 'Username must be at least 3 characters'); return; }
    if (val.length > 20){ setUsernameState('invalid', 'Username must be 20 characters or fewer'); return; }
    if (!HANDLE_RE.test(val)) { setUsernameState('invalid', 'Only letters, numbers, underscores and dots allowed'); return; }

    setUsernameState('checking', '');
    usernameTimer = setTimeout(async () => {
      try {
        if (!window.DB || !window.DB.checkHandleAvailable) {
          usernameValid = true;
          setUsernameState('idle', 'Could not verify — will check on submit');
          return;
        }
        const available = await window.DB.checkHandleAvailable(val);
        if (get('auth-username')?.value !== val) return; // stale
        usernameValid = available;
        setUsernameState(available ? 'available' : 'taken', '');
      } catch (err) {
        console.warn('Username check failed:', err.code, err.message);
        // If Firestore rejects due to permissions, the check still
        // runs again on submit — mark as needing recheck but don't block typing
        usernameValid = false;
        setUsernameState('idle', 'Tap Create account to verify username');
      }
    }, 500);
  });

  // ── Password visibility toggle ──────────────────────────────
  document.addEventListener('click', e => {
    if (!e.target.closest('#toggle-password')) return;
    const inputEl   = get('auth-password');
    const eyeOpen   = get('eye-open');
    const eyeClosed = get('eye-closed');
    const btn       = get('toggle-password');
    if (!inputEl) return;
    const isHidden  = inputEl.type === 'password';
    inputEl.type    = isHidden ? 'text' : 'password';
    if (eyeOpen)   eyeOpen.style.display   = isHidden ? 'none' : '';
    if (eyeClosed) eyeClosed.style.display = isHidden ? ''     : 'none';
    if (btn)       btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
  });

  // ── Mode toggle ─────────────────────────────────────────────
  const modeToggleBtn = get('auth-mode-toggle');
  if (modeToggleBtn) {
    modeToggleBtn.onclick = () => setMode(mode === 'signin' ? 'signup' : 'signin');
  }

  // ── Google sign-in ──────────────────────────────────────────
  const googleBtn = get('google-signin-btn');
  if (googleBtn) {
    googleBtn.onclick = async () => {
      hideError();
      googleBtn.disabled = true;
      googleBtn.textContent = 'Opening…';
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await firebase.auth().signInWithPopup(provider);
        // onAuthStateChanged in index.html handles redirect into the app
      } catch (e) {
        console.error('Google sign-in error:', e.code, e.message);
        showError(friendlyError(e.code || '', 'signin'));
        googleBtn.disabled = false;
        googleBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg> Continue with Google`;
      }
    };
  }

  // ── Email / password form ───────────────────────────────────
  const form = get('auth-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      hideError();

      const email     = (get('auth-email')?.value    || '').trim();
      const password  =  get('auth-password')?.value || '';
      const submitBtn =  get('auth-submit');

      // ── Sign-up validations ──────────────────────────────
      if (mode === 'signup') {
        const handle = (get('auth-username')?.value || '').trim();

        if (!handle) {
          showError('Please choose a username.');
          get('auth-username')?.focus();
          return;
        }
        if (!HANDLE_RE.test(handle)) {
          showError('Username must be 3–20 characters: letters, numbers, underscores and dots only.');
          get('auth-username')?.focus();
          return;
        }
        // Final availability check
        if (!usernameValid) {
          setUsernameState('checking', '');
          try {
            const available = window.DB?.checkHandleAvailable
              ? await window.DB.checkHandleAvailable(handle)
              : true;
            if (!available) {
              setUsernameState('taken', '');
              showError(`@${handle} is already taken. Please choose a different username.`);
              get('auth-username')?.focus();
              return;
            }
            usernameValid = true;
            setUsernameState('available', '');
          } catch (err) {
            console.warn('Final username check failed:', err);
            usernameValid = true; // network issue — proceed
          }
        }
      }

      // ── Submit ───────────────────────────────────────────
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Loading…'; }

      try {
        if (mode === 'signup') {
          const name   = (get('auth-name')?.value     || '').trim();
          const handle = (get('auth-username')?.value || '').trim();

          // 1. Create Firebase Auth account
          const cred = await firebase.auth()
            .createUserWithEmailAndPassword(email, password);

          // 2. Write Firestore profile with chosen handle
          await window.DB.createUserProfile(cred.user.uid, {
            displayName: name || handle,
            handle,
            email,
            photoURL: '',
          });
          // onAuthStateChanged fires automatically and loads the app

        } else {
          await firebase.auth().signInWithEmailAndPassword(email, password);
          // onAuthStateChanged fires automatically
        }

      } catch (err) {
        console.error('Auth error:', err.code, err.message);
        showError(friendlyError(err.code || '', mode));
        if (submitBtn) {
          submitBtn.disabled    = false;
          submitBtn.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
        }
      }
    };
  }

})();
