/* ============================================
   Safe&Sound Robotics — A1AN Web
   Authentication JS — Supabase
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
    loginForm.addEventListener('submit', handleLogin);
  }

  // --- Register form ---
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  // --- Recover form ---
  const recoverForm = document.getElementById('recoverForm');
  if (recoverForm) {
    // Detectar si el usuario llegó desde el link del email (modo reset)
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        showResetStep();
      }
    });
    recoverForm.addEventListener('submit', handleRecover);
  }

  const resetForm = document.getElementById('resetForm');
  if (resetForm) {
    resetForm.addEventListener('submit', handleResetPassword);
  }

});


// =============================================
// LOGIN
// =============================================
async function handleLogin(e) {
  e.preventDefault();
  clearErrors();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!isValidEmail(email)) { showFieldError('email', 'emailError'); return; }
  if (!password) { showFieldError('password', 'passwordError'); return; }

  setLoading(true);
  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        showAuthMessage('Correo electrónico o contraseña incorrectos.', 'error');
      } else if (error.message.includes('Email not confirmed')) {
        showAuthMessage('Confirma tu correo electrónico antes de iniciar sesión.', 'error');
      } else {
        showAuthMessage(error.message, 'error');
      }
      return;
    }
    if (authData.session) {
      // paciente: 1, tecnico: 2, doctor: 3
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('tipo_usuario_id')
        .eq('id', authData.session.user.id)
        .single();

      if (usuario && usuario.tipo_usuario_id === 3) {
        // Bloqueo temporal para Doctores (no integrado aun)
        showAuthMessage('El panel de doctores aún no está disponible (Próximamente).', 'error');
        await supabase.auth.signOut();
      } else {
        // Paciente por defecto
        window.location.href = '/pages/dashboard.html';
      }
    } else {
      window.location.href = '/pages/dashboard.html';
    }
  } catch (e) {
    showAuthMessage('Error de conexión. Comprueba tu internet e inténtalo de nuevo.', 'error');
  } finally {
    setLoading(false);
  }
}


// =============================================
// REGISTRO
// =============================================
async function handleRegister(e) {
  e.preventDefault();
  clearErrors();

  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  const tipoUsuarioEl = document.getElementById('tipoUsuario');
  const tipoUsuarioId = tipoUsuarioEl ? parseInt(tipoUsuarioEl.value) : 1;

  const tipoIdentificacion = document.getElementById('tipoIdentificacion').value;
  const numeroIdentificacion = document.getElementById('numeroIdentificacion').value.trim();
  const telefono = document.getElementById('telefono').value.trim();

  let valid = true;

  if (!firstName) { showFieldError('firstName', 'firstNameError'); valid = false; }
  if (!lastName) { showFieldError('lastName', 'lastNameError'); valid = false; }
  if (!numeroIdentificacion) { showFieldError('numeroIdentificacion', 'numeroIdentificacionError'); valid = false; }
  if (!isValidEmail(email)) { showFieldError('email', 'emailError'); valid = false; }
  if (password.length < 6) { showFieldError('password', 'passwordError'); valid = false; }
  if (password !== confirmPassword) { showFieldError('confirmPassword', 'confirmPasswordError'); valid = false; }
  if (!valid) return;

  setLoading(true);
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre: firstName, apellidos: lastName, tipo_usuario_id: tipoUsuarioId, tipo_identificacion: tipoIdentificacion, numero_identificacion: numeroIdentificacion, telefono: telefono } }
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        document.getElementById('emailError').textContent = 'Este correo ya tiene una cuenta.';
        showFieldError('email', 'emailError');
        showAuthMessage('Este correo electrónico ya está registrado.', 'error');
      } else {
        showAuthMessage(error.message, 'error');
      }
      return;
    }

    // Confirmación de email desactivada → sesión inmediata
    if (data.session) {
      await supabase.from('usuarios')
        .update({
          tipo_usuario_id: tipoUsuarioId,
          tipo_identificacion: tipoIdentificacion,
          numero_identificacion: numeroIdentificacion,
          telefono: telefono
        })
        .eq('id', data.session.user.id);

      window.location.href = '/pages/dashboard.html';
    } else {
      showAuthMessage('¡Cuenta creada! Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.', 'success');
      document.getElementById('registerForm').reset();
    }
  } catch (e) {
    showAuthMessage('Error de conexión: ' + e.message, 'error');
  } finally {
    setLoading(false);
  }
}


// =============================================
// RECUPERACIÓN — Paso 1 (pedir link)
// =============================================
async function handleRecover(e) {
  e.preventDefault();
  clearErrors();

  const email = document.getElementById('email').value.trim();
  if (!isValidEmail(email)) { showFieldError('email', 'emailError'); return; }

  setLoading(true);
  try {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/pages/recover.html'
    });
    showAuthMessage('Si el correo está registrado recibirás un enlace en breve. Revisa también la carpeta de spam.', 'success');
    document.getElementById('recoverForm').reset();
  } catch (e) {
    showAuthMessage('Error de conexión: ' + e.message, 'error');
  } finally {
    setLoading(false);
  }
}


// =============================================
// RECUPERACIÓN — Paso 2 (nueva contraseña)
// =============================================
function showResetStep() {
  const step1 = document.getElementById('recoverStep1');
  const step2 = document.getElementById('recoverStep2');
  if (step1) step1.style.display = 'none';
  if (step2) step2.style.display = 'block';

  const h1 = document.querySelector('.auth-header h1');
  const p = document.querySelector('.auth-header p');
  if (h1) h1.textContent = 'Nueva contraseña';
  if (p) p.textContent = 'Introduce tu nueva contraseña para terminar.';
}

async function handleResetPassword(e) {
  e.preventDefault();
  clearErrors();

  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;

  if (newPassword.length < 6) {
    showFieldError('newPassword', 'newPasswordError');
    return;
  }
  if (newPassword !== confirmNewPassword) {
    showFieldError('confirmNewPassword', 'confirmNewPasswordError');
    return;
  }

  setLoading(true);
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { showAuthMessage(error.message, 'error'); return; }
    await supabase.auth.signOut();
    window.location.href = '/pages/login.html?reset=true';
  } catch (e) {
    showAuthMessage('Error de conexión: ' + e.message, 'error');
  } finally {
    setLoading(false);
  }
}


// =============================================
// HELPERS
// =============================================
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
  document.querySelectorAll('.form-group input').forEach(i => i.classList.remove('error'));
  document.querySelectorAll('.form-error').forEach(e => e.classList.remove('show'));
}

function showAuthMessage(text, type) {
  const msg = document.getElementById('authMessage');
  if (!msg) return;
  msg.textContent = text;
  msg.className = 'auth-message show ' + type;
}

function showUrlMessage() {
  const p = new URLSearchParams(window.location.search);
  if (p.get('registered') === 'true') showAuthMessage('¡Cuenta creada correctamente! Ahora puedes iniciar sesión.', 'success');
  if (p.get('logout') === 'true') showAuthMessage('Has cerrado sesión correctamente.', 'success');
  if (p.get('reset') === 'true') showAuthMessage('Contraseña actualizada. Inicia sesión con tu nueva contraseña.', 'success');
}

function setLoading(isLoading) {
  document.querySelectorAll('button[type="submit"]').forEach(btn => {
    btn.disabled = isLoading;
    if (isLoading) {
      btn.dataset.original = btn.textContent;
      btn.textContent = 'Cargando...';
    } else if (btn.dataset.original) {
      btn.textContent = btn.dataset.original;
    }
  });
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show';
  if (type) toast.classList.add('toast-' + type);
  setTimeout(() => { toast.classList.remove('show'); }, 3500);
}
