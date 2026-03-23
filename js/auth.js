/* ============================================
   Safe&Sound Robotics — A1AN Web
   Authentication JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // --- Password visibility toggle ---
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  });

  // --- Login form ---
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    showUrlMessage();
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();
      let valid = true;

      if (!isValidEmail(email)) {
        showFieldError('email', 'emailError');
        valid = false;
      }
      if (!password) {
        showFieldError('password', 'passwordError');
        valid = false;
      }

      if (!valid) return;

      const session = {
        name: email.split('@')[0],
        email: email,
        firstName: localStorage.getItem('a1an_user_firstName') || email.split('@')[0],
        lastName: localStorage.getItem('a1an_user_lastName') || '',
        loggedIn: true,
        robotLinked: localStorage.getItem('a1an_robot_linked') === 'true'
      };

      localStorage.setItem('a1an_session', JSON.stringify(session));
      window.location.href = 'dashboard.html';
    });
  }

  // --- Register form ---
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors();

      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      let valid = true;

      if (!firstName) { showFieldError('firstName', 'firstNameError'); valid = false; }
      if (!lastName) { showFieldError('lastName', 'lastNameError'); valid = false; }
      if (!isValidEmail(email)) { showFieldError('email', 'emailError'); valid = false; }
      if (password.length < 6) { showFieldError('password', 'passwordError'); valid = false; }
      if (password !== confirmPassword) { showFieldError('confirmPassword', 'confirmPasswordError'); valid = false; }

      if (!valid) return;

      localStorage.setItem('a1an_user_firstName', firstName);
      localStorage.setItem('a1an_user_lastName', lastName);
      localStorage.setItem('a1an_user_email', email);

      window.location.href = 'login.html?registered=true';
    });
  }

  // --- Recover form ---
  const recoverForm = document.getElementById('recoverForm');
  if (recoverForm) {
    recoverForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors();

      const email = document.getElementById('email').value.trim();
      if (!isValidEmail(email)) {
        showFieldError('email', 'emailError');
        return;
      }

      showAuthMessage('Se ha enviado un enlace de recuperación a tu correo electrónico.', 'success');
      recoverForm.reset();
    });
  }
});

// --- Helpers ---

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.add('error');
  if (error) error.classList.add('show');
}

function clearErrors() {
  document.querySelectorAll('.form-group input').forEach(input => {
    input.classList.remove('error');
  });
  document.querySelectorAll('.form-error').forEach(err => {
    err.classList.remove('show');
  });
}

function showAuthMessage(text, type) {
  const msg = document.getElementById('authMessage');
  if (!msg) return;
  msg.textContent = text;
  msg.className = 'auth-message show ' + type;
}

function showUrlMessage() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('registered') === 'true') {
    showAuthMessage('Cuenta creada correctamente. Ahora puedes iniciar sesión.', 'success');
  }
  if (params.get('logout') === 'true') {
    showAuthMessage('Has cerrado sesión correctamente.', 'success');
  }
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show';
  if (type) toast.classList.add('toast-' + type);
  setTimeout(() => { toast.classList.remove('show'); }, 3500);
}
