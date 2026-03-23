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
  initWeeklyChart();
});

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
