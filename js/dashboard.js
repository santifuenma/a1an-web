/* ============================================
   Safe&Sound Robotics — A1AN Web
   Dashboard & Private Area JS
   ============================================ */

const CAMERA_TOPIC = '/camera/image_raw';

// CONFIGURACIÓN DE CÁMARA (Para producción/Vercel):
// 1. Si usas la web desde Vercel (HTTPS), el navegador bloqueará el stream HTTP de ROS.
// 2. Para solucionarlo, debes usar una IP pública con HTTPS o configurar un túnel/web proxy.
// 3. Puedes forzar la IP del robot definiendo window.A1AN_CAMERA_STREAM_HOST.

const CAMERA_STREAM_HOST = window.A1AN_CAMERA_STREAM_HOST || 
                          (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' 
                           ? `http://${window.location.hostname}:8081` 
                           : 'http://localhost:8081');
                           
const CAMERA_STREAM_URL = window.A1AN_CAMERA_STREAM_URL || `${CAMERA_STREAM_HOST}/stream?topic=${CAMERA_TOPIC}&type=mjpeg`;

// --- Page Loader ---
function showPageLoader() {
  const loader = document.createElement('div');
  loader.id = 'pageLoader';
  loader.className = 'page-loader';
  loader.innerHTML = `
    <img src="/assets/logo.png" alt="A1AN" class="loader-logo">
    <div class="loader-spinner"></div>`;
  document.body.prepend(loader);
}

function hidePageLoader() {
  const loader = document.getElementById('pageLoader');
  if (!loader) return;
  loader.classList.add('fade-out');
  setTimeout(() => loader.remove(), 380);
}

document.addEventListener('DOMContentLoaded', async () => {
  showPageLoader();

  const session = await checkSession();
  if (!session) return; // loader stays while redirecting

  hidePageLoader();

  const user = session.user;
  populateUserInfo(user);
  initSidebar();
  highlightActiveNav();
  initLogoutModal();
  initRobotLinking(user);
  initPatientWelcome(user);
  initCameraFeed();
  initCameraTimestamp();
  initWeeklyPlan();
  initDashboardData(user);
});

// --- Patient Welcome ---
function initPatientWelcome(user) {
  const meta = user.user_metadata || {};
  const firstName = meta.nombre || user.email.split('@')[0];
  const heading = document.getElementById('welcomeHeading');
  const dateEl = document.getElementById('welcomeDate');

  if (heading) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
    heading.innerHTML = `${greeting}, <span id="welcomeName">${firstName}</span> 👋`;
  }

  if (dateEl) {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    dateEl.textContent = `Hoy es ${now.toLocaleDateString('es-ES', options)}. ¡Sigue adelante con tu rehabilitación!`;
  }
}

// --- Camera live timestamp ---
function initCameraTimestamp() {
  const ts = document.getElementById('cameraTimestamp');
  if (!ts) return;
  const update = () => {
    const n = new Date();
    ts.textContent =
      [n.getFullYear(), String(n.getMonth() + 1).padStart(2, '0'), String(n.getDate()).padStart(2, '0')].join('-') + ' ' +
      [String(n.getHours()).padStart(2, '0'), String(n.getMinutes()).padStart(2, '0'), String(n.getSeconds()).padStart(2, '0')].join(':');
  };
  update();
  setInterval(update, 1000);
}

function updateCameraFeed() {
  const img = document.getElementById('cameraFeed');
  if (!img) return;
  img.src = CAMERA_STREAM_URL;
}

function initCameraFeed() {
  const img = document.getElementById('cameraFeed');
  const container = img?.closest('.video-container');
  const statusBadge = document.getElementById('cameraStatusBadge');
  if (!img || !container) return;

  let retryCount = 0;
  const MAX_RETRIES = 5;

  const setCameraState = (state) => {
    const unavailable = state === 'error';
    container.classList.toggle('camera-unavailable', unavailable);

    if (!statusBadge) return;
    statusBadge.className = 'badge ' + (unavailable ? 'badge-danger' : state === 'loading' ? 'badge-warning' : 'badge-success');
    statusBadge.textContent = unavailable ? 'Sin señal' : state === 'loading' ? 'Conectando' : 'En línea';
    
    if (unavailable) {
      console.warn("Cámara: Sin señal en " + CAMERA_STREAM_URL);
    }
  };

  img.addEventListener('load', () => {
    retryCount = 0;
    setCameraState('online');
  });

  img.addEventListener('error', () => {
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`Reintentando conexión con cámara (${retryCount}/${MAX_RETRIES})...`);
      setTimeout(updateCameraFeed, 2000);
    } else {
      setCameraState('error');
    }
  });

  setCameraState('loading');
  updateCameraFeed();

  // Reintento periódico si se pierde la señal
  setInterval(() => {
    if (container.classList.contains('camera-unavailable')) {
      retryCount = 0;
      updateCameraFeed();
    }
  }, 10000);
}

window.updateCameraFeed = updateCameraFeed;

// --- Weekly Plan (visual) ---
function initWeeklyPlan() {
  const grid = document.getElementById('weeklyPlanGrid');
  if (!grid) return;

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  // Get this week's dates (Monday = 0)
  const today = new Date();
  const todayDow = (today.getDay() + 6) % 7; // 0=Mon
  const monday = new Date(today);
  monday.setDate(today.getDate() - todayDow);

  const schedule = [
    { name: 'Movilidad de hombro', color: '#53b2b8', bg: 'rgba(83,178,184,0.12)', icon: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>' },
    { name: 'Flexión de rodilla', color: '#2a5c92', bg: 'rgba(42,92,146,0.12)', icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
    { name: 'Extensión de cadera', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>' },
    null,  // Descanso
    { name: 'Balance y equilibrio', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
    null,  // Descanso
    { name: 'Estiramientos suaves', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>' },
  ];

  grid.innerHTML = '';
  dayNames.forEach((day, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const isToday = i === todayDow;
    const ex = schedule[i];

    const card = document.createElement('div');
    card.className = 'week-day-card' + (isToday ? ' today' : '') + (!ex ? ' rest' : '');

    const iconHtml = ex
      ? `<div class="week-day-exercise-icon" style="background:${ex.bg}; color:${ex.color};">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ex.icon}</svg>
         </div>`
      : `<div class="week-day-exercise-icon" style="background:#f1f5f9; color:#94a3b8;">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
         </div>`;

    card.innerHTML = `
      <div class="week-day-name">${day}</div>
      <div class="week-day-num">${date.getDate()}</div>
      ${iconHtml}
      <div class="week-day-exercise-name">${ex ? ex.name : 'Descanso'}</div>
    `;
    grid.appendChild(card);
  });
}


// --- Session Guard ---
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/pages/login.html';
    return null;
  }
  return session;
}

// --- Populate user info across sidebar and topbar ---
function populateUserInfo(user) {
  const meta = user.user_metadata || {};
  const firstName = meta.nombre || user.email.split('@')[0];
  const lastName = meta.apellidos || '';
  const fullName = (firstName + ' ' + lastName).trim();
  const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || 'U';
  const email = user.email || '';

  const setInner = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

  setInner('sidebarUserName', fullName);
  setInner('sidebarUserEmail', email);
  setInner('sidebarAvatar', initials);
  setInner('topbarUserName', firstName);
  setInner('topbarAvatar', initials);
}

// --- Logout confirmation modal ---
function initLogoutModal() {
  // Inject modal HTML once into the page
  if (!document.getElementById('logoutOverlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'logoutOverlay';
    overlay.className = 'logout-overlay';
    overlay.innerHTML = `
      <div class="logout-modal" role="dialog" aria-modal="true" aria-labelledby="logoutTitle">
        <div class="logout-modal-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </div>
        <h3 id="logoutTitle">¿Cerrar sesión?</h3>
        <p>Serás redirigido a la página de inicio de sesión. Asegúrate de haber guardado tu trabajo.</p>
        <div class="logout-modal-actions">
          <button class="btn btn-ghost" id="cancelLogoutBtn">Cancelar</button>
          <button class="btn btn-danger" id="confirmLogoutBtn">Cerrar sesión</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  const overlay = document.getElementById('logoutOverlay');
  const cancelBtn = document.getElementById('cancelLogoutBtn');
  const confirmBtn = document.getElementById('confirmLogoutBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  // Open modal
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      overlay.classList.add('active');
      cancelBtn.focus();
    });
  }

  // Close on cancel
  cancelBtn.addEventListener('click', () => overlay.classList.remove('active'));

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') overlay.classList.remove('active');
  });

  // Confirm logout
  confirmBtn.addEventListener('click', async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Cerrando...';
    await supabase.auth.signOut();
    window.location.href = '/pages/login.html?logout=true';
  });
}

// --- Sidebar toggle (mobile) ---
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('sidebarOverlay');

  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay?.classList.toggle('active');
    });
  }

  if (overlay && sidebar) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
}


// --- Highlight active sidebar link ---
function highlightActiveNav() {
  const currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar-link').forEach(link => {
    const href = link.getAttribute('href');
    link.classList.toggle('active', href === currentPath);
  });
}

function initRobotLinking(user) {
  const overlay = document.getElementById('robotLinkOverlay');
  if (!overlay) return;

  // Popup de vinculación desactivado temporalmente
  // Para reactivarlo, descomentar las líneas siguientes:
  // supabase
  //   .from('robots')
  //   .select('id')
  //   .eq('usuario_id', user.id)
  //   .maybeSingle()
  //   .then(({ data }) => {
  //     if (data) return;
  //     overlay.classList.add('active');
  //     setupRobotLinkHandlers(overlay, user);
  //   });
  setupRobotLinkHandlers(overlay, user);
}


function setupRobotLinkHandlers(overlay, user) {
  // Tab switching
  overlay.querySelectorAll('.robot-link-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      overlay.querySelectorAll('.robot-link-tab').forEach(t => t.classList.remove('active'));
      overlay.querySelectorAll('.robot-link-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById('tab' + capitalize(tab.dataset.tab));
      if (target) target.classList.add('active');
    });
  });

  // Link by ID
  const linkBtn = document.getElementById('linkRobotBtn');
  const robotInput = document.getElementById('robotIdInput');
  if (linkBtn) {
    linkBtn.addEventListener('click', () => {
      const robotId = robotInput?.value.trim();
      if (!robotId || robotId.length < 10) {
        showToast('Introduce un ID de robot válido (ej: A1AN-XXXX-XXXX)', 'danger');
        return;
      }
      completeRobotLink(robotId, overlay, user);
    });
  }

  // Link by QR
  const qrBtn = document.getElementById('linkRobotQrBtn');
  if (qrBtn) {
    qrBtn.addEventListener('click', () => {
      qrBtn.textContent = 'Escaneando...';
      qrBtn.disabled = true;
      setTimeout(() => { completeRobotLink('A1AN-7F3K-9X2P', overlay, user); }, 1500);
    });
  }

  // Skip
  const skipBtn = document.getElementById('skipLinkBtn');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => { overlay.classList.remove('active'); });
  }
}

async function completeRobotLink(robotId, overlay, user) {
  const { error } = await supabase.from('robots').insert({
    usuario_id: user.id,
    nombre: 'A1AN',
    modelo: 'A1AN-v1',
    estado: 'activo',
    ultima_conexion: new Date().toISOString()
  });

  if (error) {
    showToast('Error al vincular el robot. Inténtalo de nuevo.', 'danger');
    return;
  }

  overlay.classList.remove('active');
  showToast('Robot vinculado correctamente: ' + robotId, 'success');
}

// --- Weekly Activity Chart ---
function initWeeklyChart() {
  const chart = document.getElementById('weeklyChart');
  const labels = document.getElementById('weeklyLabels');
  if (!chart || !labels) return;

  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const data = [45, 72, 30, 88, 60, 15, 50];
  const maxVal = Math.max(...data);

  chart.innerHTML = '';
  labels.innerHTML = '';

  days.forEach((day, i) => {
    const bar = document.createElement('div');
    bar.className = 'mini-chart-bar';
    bar.style.height = (data[i] / maxVal * 100) + '%';
    bar.title = day + ': ' + data[i] + ' min';
    chart.appendChild(bar);

    const label = document.createElement('span');
    label.textContent = day;
    labels.appendChild(label);
  });
}

/**
 * Inicializa la carga de datos dinámicos del dashboard.
 * Obtiene información desde Supabase para el usuario autenticado.
 *
 * @param {Object} user Usuario autenticado de Supabase
 */
async function initDashboardData(user) {
  console.log('Cargando dashboard para:', user.id);

  await loadRobotSummary(user.id);
  await loadNextExercise(user.id);
  await loadActiveAlerts(user.id);
  await loadWeeklyPlan(user.id);

  setInterval(async () => {
    await loadRobotSummary(user.id);
    await loadNextExercise(user.id);
    await loadActiveAlerts(user.id);
    await loadWeeklyPlan(user.id);
  }, 5000);
}

/**
 * Carga el robot asociado al usuario desde Supabase.
 * Usa los datos guardados en base de datos para mostrar
 * el estado y la batería en el dashboard.
 *
 * @param {string} userId Identificador del usuario autenticado
 */
async function loadRobotSummary(userId) {
  const { data: robot, error } = await supabase
    .from('robots')
    .select('estado, bateria_actual, ultima_conexion')
    .eq('usuario_id', userId)
    .maybeSingle();

  console.log('Robot encontrado:', robot);
  console.log('Error robot:', error);

  if (!robot) return;
  const batteryText = document.getElementById('dashboardBatteryText');
  const batteryBar = document.getElementById('dashboardBatteryBar');
  const statusText = document.getElementById('mockStatusText');
  const statusDot = document.getElementById('mockStatusDot');

  const battery = robot.bateria_actual ?? 0;

  console.log('batteryText:', batteryText);
  console.log('batteryBar:', batteryBar);
  console.log('statusText:', statusText);
  console.log('battery:', battery);

  if (batteryText) {
    batteryText.textContent = battery + '%';
  }

  if (batteryBar) {
    batteryBar.style.width = battery + '%';

    batteryBar.classList.remove('high', 'medium', 'low');

    if (battery >= 60) {
      batteryBar.classList.add('high');
    } else if (battery >= 30) {
      batteryBar.classList.add('medium');
    } else {
      batteryBar.classList.add('low');
    }
  }

  if (statusText) {
    if (robot.estado === 'activo') {
      statusText.textContent = 'En línea';
      if (statusDot) {
        statusDot.classList.remove('offline');
        statusDot.classList.add('online');
      }
    } else {
      statusText.textContent = 'Fuera de línea';
      if (statusDot) {
        statusDot.classList.remove('online');
        statusDot.classList.add('offline');
      }
    }
  }
}

/**
 * Carga el próximo ejercicio asociado a la rutina activa del usuario.
 * Obtiene la información desde Supabase y actualiza
 * las tarjetas del dashboard con el ejercicio programado.
 *
 * @param {string} userId Identificador del usuario autenticado
 */

async function loadNextExercise(userId) {
  const { data, error } = await supabase
    .from('rutinas')
    .select(`
      id,
      nombre,
      rutina_ejercicios (
        dia_semana,
        hora_programada,
        ejercicios (
          titulo,
          descripcion
        )
      )
    `)
    .eq('usuario_id', userId)
    .eq('activa', true)
    .maybeSingle();

  console.log('Próximo ejercicio:', data);
  console.log('Error próximo ejercicio:', error);

  const nextExerciseTitle = document.getElementById('dashboardNextExerciseTitle');
  const nextExerciseLabel = document.getElementById('dashboardNextExerciseLabel');

  if (!data) return;

  const nextExercise = data.rutina_ejercicios[0];

  if (!nextExercise) return;

  if (nextExercise.ejercicios.titulo) {
    nextExerciseTitle.textContent = nextExercise.ejercicios.titulo;
  }

  if (nextExercise.hora_programada) {
    nextExerciseLabel.textContent = nextExercise.dia_semana + " · " + nextExercise.hora_programada + "h";
  } else {
    nextExerciseLabel.textContent = "Programado para el " + nextExercise.dia_semana;
  }
}

/**
 * Carga el número de alertas activas del usuario.
 * Obtiene las notificaciones no leídas desde Supabase
 * y actualiza el contador del dashboard.
 *
 * @param {string} userId Identificador del usuario autenticado
 */
async function loadActiveAlerts(userId) {
  const { data, error } = await supabase
    .from('notificaciones')
    .select(`
      usuario_id,
      tipo,
      leida
    `)
    .eq('usuario_id', userId)
    .eq('tipo', 'alerta')
    .eq('leida', false)

  console.log('Alertas:', data);
  console.log('Error:', error);

  const alertsCount = document.getElementById('dashboardAlertsCount');

  if (!data) return;

  if (alertsCount) {
    alertsCount.textContent = data.length;
  }
}

/**
 * Carga la planificación semanal de la rutina activa del usuario.
 * Obtiene los ejercicios programados desde Supabase y actualiza
 * el calendario semanal del dashboard.
 *
 * @param {string} userId Identificador del usuario autenticado
 */
async function loadWeeklyPlan(userId) {
  const { data, error } = await supabase
    .from('rutinas')
    .select(`
      id,
      nombre,
      rutina_ejercicios (
        dia_semana,
        hora_programada,
        ejercicios (
          titulo
        )
      )
    `)
    .eq('usuario_id', userId)
    .eq('activa', true)
    .maybeSingle();

  console.log('Plan semanal:', data);
  console.log('Error plan semanal:', error);

  const weeklyPlan = document.getElementById('weeklyPlanGrid');

  if (!weeklyPlan) return;
  if (!data) return;

  const days = [
    { key: 'Lunes', label: 'LUN' },
    { key: 'Martes', label: 'MAR' },
    { key: 'Miércoles', label: 'MIÉ' },
    { key: 'Jueves', label: 'JUE' },
    { key: 'Viernes', label: 'VIE' },
    { key: 'Sábado', label: 'SÁB' },
    { key: 'Domingo', label: 'DOM' }
  ];

  weeklyPlan.innerHTML = '';

  const today = new Date();
  const currentDayIndex = (today.getDay() + 6) % 7;

  const monday = new Date(today);
  monday.setDate(today.getDate() - currentDayIndex);

  days.forEach((day, index) => {
    const exerciseForDay = data.rutina_ejercicios.find(
      item => item.dia_semana === day.key
    );

    const isToday = index === currentDayIndex;

    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dayNumber = date.getDate();

    const card = document.createElement('div');
    card.className = 'week-day-card';

    if (isToday) {
      card.classList.add('today');
    }

    if (!exerciseForDay) {
      card.classList.add('rest');
    }

    card.innerHTML = `
      <div class="week-day-name">${day.label}</div>
      <div class="week-day-num">${dayNumber}</div>
      <div class="week-day-exercise-icon" style="background: ${
        exerciseForDay ? 'rgba(83, 178, 184, 0.15)' : 'rgba(0,0,0,0.05)'
      }; color: ${
        exerciseForDay ? 'var(--color-accent)' : 'var(--color-gray)'
      };">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" 
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${
            exerciseForDay
              ? '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />'
              : '<circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>'
          }
        </svg>
      </div>
      <div class="week-day-exercise-name">
        ${
          exerciseForDay
            ? exerciseForDay.ejercicios.titulo
            : 'Descanso'
        }
      </div>
    `;

    weeklyPlan.appendChild(card);
  });
}

// --- Helpers ---
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show';
  if (type) toast.classList.add('toast-' + type);
  setTimeout(() => { toast.classList.remove('show'); }, 3500);
}
