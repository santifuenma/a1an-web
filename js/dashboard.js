/* ============================================
   Safe&Sound Robotics — A1AN Web
   Dashboard & Private Area JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const session = checkSession();
  if (!session) return;

  populateUserInfo(session);
  initSidebar();
  highlightActiveNav();
  initRobotLinking(session);
  initPatientWelcome(session);
  initCameraTimestamp();
  initWeeklyPlan();
});

// --- Patient Welcome ---
function initPatientWelcome(session) {
  const firstName = session.firstName || session.name || 'Usuario';
  const heading = document.getElementById('welcomeHeading');
  const nameEl = document.getElementById('welcomeName');
  const dateEl = document.getElementById('welcomeDate');

  if (nameEl) nameEl.textContent = firstName;

  if (heading) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
    heading.innerHTML = `${greeting}, <span id="welcomeName">${firstName}</span> 👋`;
  }

  if (dateEl) {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateStr = now.toLocaleDateString('es-ES', options);
    dateEl.textContent = `Hoy es ${dateStr}. ¡Sigue adelante con tu rehabilitación!`;
  }
}

// --- Camera live timestamp ---
function initCameraTimestamp() {
  const ts = document.getElementById('cameraTimestamp');
  if (!ts) return;
  const update = () => {
    const n = new Date();
    ts.textContent =
      [n.getFullYear(), String(n.getMonth()+1).padStart(2,'0'), String(n.getDate()).padStart(2,'0')].join('-') + ' ' +
      [String(n.getHours()).padStart(2,'0'), String(n.getMinutes()).padStart(2,'0'), String(n.getSeconds()).padStart(2,'0')].join(':');
  };
  update();
  setInterval(update, 1000);
}

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
    { name: 'Flexión de rodilla',  color: '#2a5c92', bg: 'rgba(42,92,146,0.12)',  icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
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
function checkSession() {
  const session = JSON.parse(localStorage.getItem('a1an_session') || 'null');
  if (!session || !session.loggedIn) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

// --- Populate user info across sidebar and topbar ---
function populateUserInfo(session) {
  const firstName = session.firstName || session.name || 'Usuario';
  const lastName = session.lastName || '';
  const fullName = (firstName + ' ' + lastName).trim();
  const initials = (firstName[0] || '') + (lastName[0] || '');
  const email = session.email || '';

  const setInner = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setInner('sidebarUserName', fullName);
  setInner('sidebarUserEmail', email);
  setInner('sidebarAvatar', initials.toUpperCase() || 'U');
  setInner('topbarUserName', firstName);
  setInner('topbarAvatar', initials.toUpperCase() || 'U');
}

// --- Sidebar toggle (mobile) ---
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('sidebarOverlay');
  const logoutBtn = document.getElementById('logoutBtn');

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

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('a1an_session');
      window.location.href = 'login.html?logout=true';
    });
  }
}

// --- Highlight active sidebar link ---
function highlightActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.sidebar-link').forEach(link => {
    const href = link.getAttribute('href');
    link.classList.toggle('active', href === currentPage);
  });
}

// --- Robot Linking ---
function initRobotLinking(session) {
  const overlay = document.getElementById('robotLinkOverlay');
  if (!overlay) return;

  if (session.robotLinked) return;

  overlay.classList.add('active');

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
      completeRobotLink(robotId, overlay);
    });
  }

  // Link by QR
  const qrBtn = document.getElementById('linkRobotQrBtn');
  if (qrBtn) {
    qrBtn.addEventListener('click', () => {
      qrBtn.textContent = 'Escaneando...';
      qrBtn.disabled = true;
      setTimeout(() => {
        completeRobotLink('A1AN-7F3K-9X2P', overlay);
      }, 1500);
    });
  }

  // Skip
  const skipBtn = document.getElementById('skipLinkBtn');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      overlay.classList.remove('active');
    });
  }
}

function completeRobotLink(robotId, overlay) {
  const session = JSON.parse(localStorage.getItem('a1an_session') || '{}');
  session.robotLinked = true;
  session.robotId = robotId;
  session.robotName = 'A1AN';
  localStorage.setItem('a1an_session', JSON.stringify(session));
  localStorage.setItem('a1an_robot_linked', 'true');
  localStorage.setItem('a1an_robot_id', robotId);
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
