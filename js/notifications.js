/* ============================================
   Safe&Sound Robotics — A1AN Web
   Notifications JS — Supabase integration
   ============================================ */

/**
 * Crea una notificación en Supabase.
 * Puede llamarse desde cualquier script (rosbridge.js, dashboard.js, etc.)
 *
 * @param {Object} opts
 * @param {string} opts.titulo   - Título de la notificación
 * @param {string} opts.mensaje  - Mensaje descriptivo
 * @param {string} opts.tipo     - Tipo: 'alerta', 'sistema', 'robot', 'ruta'
 */
async function createNotification({ titulo, mensaje, tipo }) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: robot } = await supabase
      .from('robots')
      .select('id')
      .eq('usuario_id', session.user.id)
      .maybeSingle();

    await supabase.from('notificaciones').insert({
      usuario_id: session.user.id,
      robot_id: robot?.id ?? null,
      titulo,
      mensaje,
      tipo,
      leida: false
    });
  } catch (err) {
    console.error('Error creando notificación:', err);
  }
}

// Exportar globalmente
window.createNotification = createNotification;


/* ============================================
   Página de notificaciones (solo se ejecuta
   si existe #notificationList en el DOM)
   ============================================ */
document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('notificationList');
  const filters = document.getElementById('notifFilters');
  if (!list) return;

  // Session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  let notifications = [];
  let currentFilter = 'unread';

  // --- Cargar notificaciones desde Supabase ---
  async function loadNotifications() {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', session.user.id)
      .order('fecha_hora_envio', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error cargando notificaciones:', error);
      return;
    }

    notifications = (data || []).map(n => ({
      id: n.id,
      type: mapType(n.tipo),
      title: n.titulo,
      message: n.mensaje,
      time: formatTime(n.fecha_hora_envio),
      read: n.leida
    }));

    renderNotifications();
    updateBadges();
  }

  // --- Mapear tipos de la BBDD a los filtros de la UI ---
  function mapType(tipo) {
    const map = {
      'alerta': 'alert',
      'recordatorio': 'reminder',
      'sistema': 'system',
      'robot': 'system',
      'ruta': 'system'
    };
    return map[tipo] || 'system';
  }

  // --- Formato de tiempo relativo ---
  function formatTime(isoDate) {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHrs < 24) return `Hace ${diffHrs}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  // --- Iconos por tipo ---
  function getTypeIcon(type) {
    const icons = {
      alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      reminder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>'
    };
    return icons[type] || icons.system;
  }

  // --- Render ---
  function renderNotifications() {
    const filtered = notifications.filter(n => {
      if (currentFilter === 'all') return true;
      if (currentFilter === 'unread') return !n.read;
      if (currentFilter === 'read') return n.read;
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

    const typeLabels = { alert: 'Alerta', reminder: 'Recordatorio', system: 'Sistema' };
    const typeBadgeClass = { alert: 'badge-danger', reminder: 'badge-warning', system: 'badge-info' };

    list.innerHTML = filtered.map(n => `
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
      </div>`).join('');

    // Click to mark as read
    list.querySelectorAll('.notification-item.unread').forEach(item => {
      item.addEventListener('click', async () => {
        const id = parseInt(item.dataset.id);

        // Update in Supabase
        await supabase
          .from('notificaciones')
          .update({ leida: true })
          .eq('id', id);

        // Update local state
        const notif = notifications.find(n => n.id === id);
        if (notif) notif.read = true;

        renderNotifications();
        updateBadges();
      });
    });
  }

  // --- Badges ---
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

  // --- Filter tabs ---
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

  // --- Initial load ---
  await loadNotifications();

  // --- Auto-refresh every 30 seconds ---
  setInterval(loadNotifications, 30000);
});
