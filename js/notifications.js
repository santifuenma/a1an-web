/* ============================================
   Safe&Sound Robotics — A1AN Web
   Notifications JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('notificationList');
  const filters = document.getElementById('notifFilters');
  if (!list) return;

  const notifications = [
    { id: 1, type: 'alert', title: 'Batería baja', message: 'El nivel de batería de A1AN ha descendido por debajo del 20%. Conecta el cargador.', time: 'Hace 15 min', read: false },
    { id: 2, type: 'reminder', title: 'Ejercicio programado', message: 'Tienes pendiente el ejercicio "Flexión de rodilla" programado para las 16:00.', time: 'Hace 1h', read: false },
    { id: 3, type: 'alert', title: 'Actualización disponible', message: 'Hay una nueva actualización de firmware (v2.4.2) disponible para tu robot A1AN.', time: 'Hace 2h', read: false },
    { id: 4, type: 'system', title: 'Sincronización completada', message: 'Los datos se han sincronizado correctamente con el servidor.', time: 'Hace 3h', read: true },
    { id: 5, type: 'reminder', title: 'Recordatorio de ejercicio', message: 'No olvides realizar tu rutina de movilidad de hombro hoy.', time: 'Hace 5h', read: true },
    { id: 6, type: 'system', title: 'Sesión iniciada', message: 'Se ha iniciado sesión desde un nuevo dispositivo.', time: 'Ayer', read: true },
    { id: 7, type: 'alert', title: 'Sensor de temperatura', message: 'La temperatura interna del robot está dentro de los parámetros normales (38°C).', time: 'Ayer', read: true },
    { id: 8, type: 'reminder', title: 'Revisión semanal', message: 'Es momento de revisar tu progreso semanal en la sección de actividad.', time: 'Hace 2 días', read: true },
    { id: 9, type: 'system', title: 'Robot vinculado', message: 'El robot A1AN-7F3K-9X2P se ha vinculado correctamente a tu cuenta.', time: 'Hace 3 días', read: true }
  ];

  let currentFilter = 'all';

  function renderNotifications() {
    const filtered = notifications.filter(n => {
      if (currentFilter === 'all') return true;
      if (currentFilter === 'unread') return !n.read;
      return n.type === currentFilter;
    });

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <h3>Sin notificaciones</h3>
          <p>No hay notificaciones que coincidan con este filtro.</p>
        </div>`;
      return;
    }

    list.innerHTML = filtered.map(n => {
      const typeLabels = { alert: 'Alerta', reminder: 'Recordatorio', system: 'Sistema' };
      const typeBadgeClass = { alert: 'badge-danger', reminder: 'badge-warning', system: 'badge-info' };

      return `
        <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
          <div class="notification-dot"></div>
          <div class="notification-content">
            <h4>${n.title}</h4>
            <p>${n.message}</p>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
            <span class="notification-time">${n.time}</span>
            <span class="notification-type-badge badge ${typeBadgeClass[n.type]}">${typeLabels[n.type]}</span>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.dataset.id);
        const notif = notifications.find(n => n.id === id);
        if (notif && !notif.read) {
          notif.read = true;
          renderNotifications();
          updateBadges();
        }
      });
    });
  }

  function updateBadges() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const sidebarBadge = document.getElementById('sidebarNotifBadge');
    const topbarBadge = document.getElementById('topbarNotifBadge');

    if (sidebarBadge) {
      sidebarBadge.textContent = unreadCount;
      sidebarBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    if (topbarBadge) {
      topbarBadge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
  }

  // Filter tabs
  if (filters) {
    filters.querySelectorAll('.notification-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        filters.querySelectorAll('.notification-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderNotifications();
      });
    });
  }

  renderNotifications();
  updateBadges();
});
