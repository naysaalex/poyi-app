// js/auth.js
(function () {
  let mode          = 'signin';
  let usernameValid = false;
  let usernameTimer = null;

  // ── Grab elements — all lookups happen inside functions so a
  //    missing element never crashes the module at parse time ──
  const get = id => document.getElementById(id);

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
      'auth/popup-closed-by-user':    'Sign-in window was closed. Please try again.',
      'auth/popup-blocked':           'Pop-up was blocked by your browser. Please allow pop-ups for this site.',
      'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
      'auth/network-request-failed':  'Network error. Check your connection and try again.',
      'auth/api-key-not-valid':       'App configuration error. Please contact support.',
      'auth/unauthorized-domain':     'This domain is not authorised. Please contact support.',
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

  // ── Username state display ──────────────────────────────────
  const HANDLE_RE = /^[a-z0-9_.]{3,20}$/;

  function setUsernameState(state, msg) {
    const statusEl = get('auth-username-status');
    const hintEl   = get('auth-username-hint');
    const inputEl  = get('auth-username');

    // Safe — if elements don't exist yet, just return
    if (!statusEl || !hintEl) return;

    statusEl.textContent = '';
    statusEl.className   = 'auth-username-status';
    if (inputEl) inputEl.className = '';

    if (msg) hintEl.textContent = msg;

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
      // msg already set above
    } else {
      // idle — reset hint to default
      if (!msg) hintEl.textContent = 'Letters, numbers, underscores and dots only';
    }
  }

  // ── Wire up username input live check ──────────────────────
  //    Done via event delegation so it works even if the input
  //    is hidden or rendered late.
  document.addEventListener('input', e => {
    if (e.target.id !== 'auth-username') return;

    const inputEl = e.target;
    // Strip disallowed chars, force lowercase
    inputEl.value = inputEl.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');

    const val = inputEl.value;
    usernameValid = false;
    clearTimeout(usernameTimer);

    if (!val) { setUsernameState('idle', ''); return; }
    if (val.length < 3)  { setUsernameState('invalid', 'Username must be at least 3 characters'); return; }
    if (val.length > 20) { setUsernameState('invalid', 'Username must be 20 characters or fewer'); return; }
    if (!HANDLE_RE.test(val)) { setUsernameState('invalid', 'Only letters, numbers, underscores and dots allowed'); return; }

    setUsernameState('checking', '');
    usernameTimer = setTimeout(async () => {
      try {
        // Wait for DB to be ready (it loads after auth.js in the page)
        if (!window.DB || !window.DB.checkHandleAvailable) {
          usernameValid = true;
          setUsernameState('idle', 'Could not verify — will check on sign up');
          return;
        }
        const available = await window.DB.checkHandleAvailable(val);
        if (get('auth-username')?.value !== val) return; // stale
        usernameValid = available;
        setUsernameState(available ? 'available' : 'taken', '');
      } catch (err) {
        usernameValid = true;
        setUsernameState('idle', 'Could not verify — will check on sign up');
      }
    }, 500);
  });

  // ── Password visibility toggle ──────────────────────────────
  document.addEventListener('click', e => {
    if (e.target.closest('#toggle-password')) {
      const inputEl   = get('auth-password');
      const eyeOpen   = get('eye-open');
      const eyeClosed = get('eye-closed');
      const btn       = get('toggle-password');
      if (!inputEl) return;
      const isHidden    = inputEl.type === 'password';
      inputEl.type      = isHidden ? 'text'  : 'password';
      if (eyeOpen)   eyeOpen.style.display   = isHidden ? 'none' : '';
      if (eyeClosed) eyeClosed.style.display = isHidden ? ''     : 'none';
      if (btn)       btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    }
  });

  // ── Mode toggle button ──────────────────────────────────────
  const modeToggleBtn = get('auth-mode-toggle');
  if (modeToggleBtn) {
    modeToggleBtn.onclick = () => setMode(mode === 'signin' ? 'signup' : 'signin');
  }

  // ── Google sign-in ──────────────────────────────────────────
  const googleBtn = get('google-signin-btn');
  if (googleBtn) {
    googleBtn.onclick = async () => {
      hideError();
      try {
        await window.signInWithPopup(window.firebaseAuth, window.googleProvider);
        // onAuthStateChanged in index.html handles the rest
      } catch (e) {
        showError(friendlyError(e.code || '', 'signin'));
      }
    };
  }

  // ── Email / password form ───────────────────────────────────
  const form = get('auth-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      hideError();

      const email    = (get('auth-email')?.value    || '').trim();
      const password =  get('auth-password')?.value || '';
      const submitBtn = get('auth-submit');

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
        if (!usernameValid) {
          setUsernameState('checking', '');
          try {
            const available = window.DB?.checkHandleAvailable
              ? await window.DB.checkHandleAvailable(handle)
              : true;
            if (!available) {
              usernameValid = false;
              setUsernameState('taken', '');
              showError(`@${handle} is already taken. Please choose a different username.`);
              get('auth-username')?.focus();
              return;
            }
            usernameValid = true;
            setUsernameState('available', '');
          } catch (err) {
            // Network issue — proceed and let server reject if duplicate
            usernameValid = true;
          }
        }
      }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Loading...'; }

      try {
        if (mode === 'signup') {
          const name   = (get('auth-name')?.value     || '').trim();
          const handle = (get('auth-username')?.value || '').trim();

          const cred = await window.createUserWithEmailAndPassword(
            window.firebaseAuth, email, password
          );

          // Create profile — app.js onSignedIn will skip creation since it now exists
          await window.DB.createUserProfile(cred.user.uid, {
            displayName: name || handle,
            handle,
            email,
            photoURL: '',
          });
        } else {
          await window.signInWithEmailAndPassword(window.firebaseAuth, email, password);
        }
      } catch (err) {
        showError(friendlyError(err.code || '', mode));
        if (submitBtn) {
          submitBtn.disabled    = false;
          submitBtn.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
        }
      }
    };
  }

})();
