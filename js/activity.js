/* ============================================
   Safe&Sound Robotics — A1AN Web
   Activity page — datos mock + filtros + render
   ============================================
   Los datos siguen la forma de las tablas
   `eventos_robot`, `sesiones_ejercicio` y
   `notificaciones` definidas en
   bbdd/supabase_migration.sql. El día que se
   conecte a Supabase basta con sustituir
   getActivityFeed() por un await supabase.from(...).
   ============================================ */

(function () {
  'use strict';

  // ---- Tipos visibles para el paciente ----
  // ejercicio · aviso · bateria · robot
  // Cualquier otro tipo (sync, log, firmware, ...) se considera técnico
  // y NO se muestra al paciente.

  const TIPO_META = {
    ejercicio: {
      label: 'Ejercicios',
      iconClass: 'exercise',
      svg: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'
    },
    aviso: {
      label: 'Avisos',
      iconClass: 'alert',
      svg: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
    },
    bateria: {
      label: 'Batería',
      iconClass: 'battery',
      svg: '<rect x="2" y="7" width="16" height="10" rx="2" ry="2"/><line x1="22" y1="11" x2="22" y2="13"/><line x1="6" y1="11" x2="14" y2="11"/>'
    },
    robot: {
      label: 'Robot',
      iconClass: 'power',
      svg: '<path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>'
    }
  };

  // ---- Datos mock (fallback si no hay sesión o falla Supabase) ----
  const MOCK_ACTIVITY = [
    // Hoy
    { id: 1,  fecha_hora: '2026-05-12T14:32:00', tipo: 'ejercicio', titulo: 'Ejercicio completado: Movilidad de hombro', descripcion: 'Duración: 14 min · Resultado: satisfactorio' },
    { id: 2,  fecha_hora: '2026-05-12T11:05:00', tipo: 'ejercicio', titulo: 'Ejercicio completado: Flexión de codo', descripcion: 'Duración: 12 min · Resultado: satisfactorio' },
    { id: 3,  fecha_hora: '2026-05-12T08:15:00', tipo: 'robot',     titulo: 'Robot encendido', descripcion: 'Tu robot A1AN se ha iniciado correctamente' },

    // Ayer
    { id: 4,  fecha_hora: '2026-05-11T22:00:00', tipo: 'robot',     titulo: 'Robot apagado', descripcion: 'Apagado automático tras finalizar la sesión' },
    { id: 5,  fecha_hora: '2026-05-11T17:45:00', tipo: 'ejercicio', titulo: 'Ejercicio completado: Flexión de rodilla', descripcion: 'Duración: 18 min · Resultado: satisfactorio' },
    { id: 6,  fecha_hora: '2026-05-11T10:20:00', tipo: 'ejercicio', titulo: 'Ejercicio completado: Extensión de muñeca', descripcion: 'Duración: 10 min · Resultado: satisfactorio' },
    { id: 7,  fecha_hora: '2026-05-11T09:50:00', tipo: 'bateria',   titulo: 'Batería baja', descripcion: 'El nivel de batería ha descendido por debajo del 20%. Te recomendamos cargar el robot.' },
    { id: 8,  fecha_hora: '2026-05-11T08:30:00', tipo: 'robot',     titulo: 'Robot encendido', descripcion: 'Inicio manual del dispositivo' },

    // 10 may
    { id: 9,  fecha_hora: '2026-05-10T16:10:00', tipo: 'aviso',     titulo: 'Ejercicio interrumpido', descripcion: 'Fortalecimiento de core: detenido a los 12 min. Vuelve a intentarlo cuando estés listo.' },
    { id: 10, fecha_hora: '2026-05-10T09:00:00', tipo: 'ejercicio', titulo: 'Ejercicio completado: Movilidad de hombro', descripcion: 'Duración: 15 min · Resultado: satisfactorio' },
    { id: 11, fecha_hora: '2026-05-10T08:45:00', tipo: 'bateria',   titulo: 'Carga completa', descripcion: 'Tu robot está cargado al 100%' },

    // 9 may
    { id: 12, fecha_hora: '2026-05-09T18:20:00', tipo: 'aviso',     titulo: 'Recordatorio de rutina', descripcion: 'Hoy tenías 2 ejercicios pendientes en tu plan diario' },
    { id: 13, fecha_hora: '2026-05-09T11:30:00', tipo: 'ejercicio', titulo: 'Ejercicio completado: Equilibrio asistido', descripcion: 'Duración: 8 min · Resultado: satisfactorio' }
  ];

  // ---- API: Supabase con fallback a mocks ----
  // Lee de 3 tablas en paralelo y unifica el feed:
  //   eventos_robot   → tipo='robot' (encendido/apagado). Filtra sincronizacion/firmware.
  //   notificaciones  → tipo='bateria' o 'aviso' según campo tipo.
  //   sesiones_ejercicio → tipo='ejercicio' (completado) o 'aviso' (interrumpido).
  async function getActivityFeed() {
    if (typeof supabase === 'undefined') return MOCK_ACTIVITY.slice();

    let session;
    try {
      ({ data: { session } } = await supabase.auth.getSession());
    } catch (e) { return MOCK_ACTIVITY.slice(); }
    if (!session) return MOCK_ACTIVITY.slice();

    const uid = session.user.id;

    try {
      const [eventosRes, notifsRes, sesionesRes] = await Promise.all([
        supabase.from('eventos_robot')
          .select('id, tipo_evento, descripcion, fecha_hora')
          .eq('usuario_id', uid)
          .in('tipo_evento', ['encendido', 'apagado']),
        supabase.from('notificaciones')
          .select('id, titulo, mensaje, tipo, fecha_hora_envio')
          .eq('usuario_id', uid)
          .in('tipo', ['bateria', 'aviso']),
        supabase.from('sesiones_ejercicio')
          .select('id, estado, duracion_real_min, fecha_hora_inicio, ejercicios(titulo)')
          .eq('usuario_id', uid)
      ]);

      if (eventosRes.error || notifsRes.error || sesionesRes.error) {
        console.warn('Supabase activity error:', eventosRes.error || notifsRes.error || sesionesRes.error);
        return MOCK_ACTIVITY.slice();
      }

      const items = [];

      for (const e of (eventosRes.data || [])) {
        items.push({
          id: 'evt-' + e.id,
          fecha_hora: e.fecha_hora,
          tipo: 'robot',
          titulo: e.tipo_evento === 'encendido' ? 'Robot encendido' : 'Robot apagado',
          descripcion: e.descripcion || ''
        });
      }

      for (const n of (notifsRes.data || [])) {
        items.push({
          id: 'not-' + n.id,
          fecha_hora: n.fecha_hora_envio,
          tipo: n.tipo === 'bateria' ? 'bateria' : 'aviso',
          titulo: n.titulo,
          descripcion: n.mensaje || ''
        });
      }

      for (const s of (sesionesRes.data || [])) {
        const titulo = (s.ejercicios && s.ejercicios.titulo) || 'Ejercicio';
        if (s.estado === 'completado') {
          items.push({
            id: 'ses-' + s.id,
            fecha_hora: s.fecha_hora_inicio,
            tipo: 'ejercicio',
            titulo: 'Ejercicio completado: ' + titulo,
            descripcion: `Duración: ${s.duracion_real_min || '?'} min · Resultado: satisfactorio`
          });
        }
        // Las sesiones interrumpidas ya se reflejan como notificación 'aviso',
        // así que no se duplican aquí.
      }

      return items;
    } catch (e) {
      console.warn('Supabase activity fetch failed:', e);
      return MOCK_ACTIVITY.slice();
    }
  }

  // ---- Utilidades de fecha ----
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function dayLabel(date) {
    const today = startOfDay(new Date());
    const target = startOfDay(date);
    const diffDays = Math.round((today - target) / 86400000);
    const fecha = `${target.getDate()} de ${MESES[target.getMonth()]} de ${target.getFullYear()}`;
    if (diffDays === 0) return `Hoy — ${fecha}`;
    if (diffDays === 1) return `Ayer — ${fecha}`;
    return fecha;
  }

  function timeLabel(date) {
    const d = new Date(date);
    return d.toTimeString().slice(0, 5);
  }

  // ---- Render ----
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function renderActivity(items, container) {
    if (!container) return;
    container.innerHTML = '';

    if (!items.length) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h3>Sin actividad registrada</h3>
          <p>Cuando uses tu robot A1AN, aquí verás un resumen de tus ejercicios y eventos.</p>
        </div>`;
      return;
    }

    const sorted = items.slice().sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
    const groups = new Map();
    for (const item of sorted) {
      const key = startOfDay(new Date(item.fecha_hora)).getTime();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }

    const html = [];
    for (const [key, group] of groups) {
      html.push(`<div class="activity-date-group">
        <div class="activity-date">${escapeHtml(dayLabel(new Date(key)))}</div>
        ${group.map(renderItem).join('')}
      </div>`);
    }
    container.innerHTML = html.join('');
  }

  function renderItem(item) {
    const meta = TIPO_META[item.tipo] || TIPO_META.robot;
    return `<div class="activity-item" data-tipo="${escapeHtml(item.tipo)}">
      <div class="activity-icon ${meta.iconClass}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${meta.svg}</svg>
      </div>
      <div class="activity-info">
        <div class="activity-title">${escapeHtml(item.titulo)}</div>
        <p class="activity-description">${escapeHtml(item.descripcion)}</p>
      </div>
      <div class="activity-time">${escapeHtml(timeLabel(item.fecha_hora))}</div>
    </div>`;
  }

  // ---- Filtros ----
  function setupFilters(allItems, container) {
    const buttons = document.querySelectorAll('.notification-filter[data-filter]');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.dataset.filter;
        const filtered = (f === 'todos') ? allItems : allItems.filter(i => i.tipo === f);
        renderActivity(filtered, container);
      });
    });
  }

  // ---- Init ----
  document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('activityLog');
    if (!container) return;

    const items = await getActivityFeed();
    renderActivity(items, container);
    setupFilters(items, container);
  });
})();
