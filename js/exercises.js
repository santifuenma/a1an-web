/* ============================================
   Safe&Sound Robotics — A1AN Web
   Exercises page — biblioteca + planificación + historial
   ============================================
   Los datos siguen la forma de las tablas
   `ejercicios`, `rutina_ejercicios` y
   `sesiones_ejercicio` definidas en
   bbdd/supabase_migration.sql.
   ============================================ */

(function () {
  'use strict';

  // ---- Niveles de dificultad (alineados con columna `nivel`) ----
  const NIVELES = {
    facil:   { label: 'Baja',  badge: 'badge-success' },
    medio:   { label: 'Media', badge: 'badge-warning' },
    dificil: { label: 'Alta',  badge: 'badge-danger' }
  };

  // ---- Estados visuales del ejercicio ----
  // 'activo'      → ejercicio prescrito y en rutina actual del paciente
  // 'programado'  → ejercicio que entrará en la rutina próximamente
  const ESTADOS_UI = {
    activo:     { label: 'Activo',     badge: 'badge-success' },
    programado: { label: 'Programado', badge: 'badge-info' }
  };

  // ---- Datos mock — Biblioteca (tabla `ejercicios`) ----
  const EJERCICIOS = [
    { id: 1, titulo: 'Movilidad de hombro',     descripcion: 'Ejercicio de elevación y rotación del hombro para mejorar el rango de movimiento articular.',          zona_cuerpo: 'hombro',  nivel: 'medio',   duracion_estimada_min: 15, estado_ui: 'activo' },
    { id: 2, titulo: 'Flexión de rodilla',      descripcion: 'Ejercicio controlado de flexión y extensión de rodilla para fortalecer la articulación.',                 zona_cuerpo: 'rodilla', nivel: 'facil',   duracion_estimada_min: 20, estado_ui: 'activo' },
    { id: 3, titulo: 'Extensión de muñeca',     descripcion: 'Ejercicio de extensión y flexión de muñeca para recuperar movilidad fina.',                                zona_cuerpo: 'muneca',  nivel: 'facil',   duracion_estimada_min: 10, estado_ui: 'programado' },
    { id: 4, titulo: 'Fortalecimiento de core', descripcion: 'Rutina de estabilización del tronco con ejercicios isométricos adaptados.',                                zona_cuerpo: 'core',    nivel: 'dificil', duracion_estimada_min: 25, estado_ui: 'activo' },
    { id: 5, titulo: 'Equilibrio estático',     descripcion: 'Práctica de equilibrio con apoyo para mejorar la estabilidad postural.',                                   zona_cuerpo: 'general', nivel: 'medio',   duracion_estimada_min: 12, estado_ui: 'activo' },
    { id: 6, titulo: 'Movilidad de tobillo',    descripcion: 'Ejercicios de dorsiflexión y plantiflexión para recuperar movilidad del tobillo.',                          zona_cuerpo: 'tobillo', nivel: 'facil',   duracion_estimada_min: 10, estado_ui: 'programado' }
  ];

  // ---- Datos mock — Planificación semanal (tabla `rutina_ejercicios`) ----
  // dia_semana: 1=Lun ... 7=Dom (ISO)
  const RUTINA_EJERCICIOS = [
    { ejercicio_id: 1, dia_semana: 1, hora_programada: '09:00' },
    { ejercicio_id: 2, dia_semana: 1, hora_programada: '16:00' },
    { ejercicio_id: 3, dia_semana: 2, hora_programada: '10:00' },
    { ejercicio_id: 1, dia_semana: 3, hora_programada: '09:00' },
    { ejercicio_id: 4, dia_semana: 3, hora_programada: '11:00' },
    { ejercicio_id: 2, dia_semana: 4, hora_programada: '16:00' },
    { ejercicio_id: 5, dia_semana: 5, hora_programada: '10:00' },
    { ejercicio_id: 6, dia_semana: 5, hora_programada: '12:00' },
    { ejercicio_id: 1, dia_semana: 6, hora_programada: '10:00' }
  ];

  // ---- Datos mock — Historial (tabla `sesiones_ejercicio`) ----
  const SESIONES = [
    { id: 1, ejercicio_id: 1, fecha_hora_inicio: '2026-05-12T14:32:00', duracion_real_min: 14, estado: 'completado' },
    { id: 2, ejercicio_id: 2, fecha_hora_inicio: '2026-05-11T17:45:00', duracion_real_min: 18, estado: 'completado' },
    { id: 3, ejercicio_id: 3, fecha_hora_inicio: '2026-05-11T10:20:00', duracion_real_min: 10, estado: 'completado' },
    { id: 4, ejercicio_id: 4, fecha_hora_inicio: '2026-05-10T16:10:00', duracion_real_min: 12, estado: 'interrumpido' },
    { id: 5, ejercicio_id: 1, fecha_hora_inicio: '2026-05-10T09:00:00', duracion_real_min: 15, estado: 'completado' },
    { id: 6, ejercicio_id: 5, fecha_hora_inicio: '2026-05-09T11:30:00', duracion_real_min: 11, estado: 'completado' }
  ];

  // ---- Utilidades ----
  const DIAS_CORTOS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function todayIsoDay() {
    // JS: 0=Dom..6=Sab → ISO: 1=Lun..7=Dom
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  }

  function shortDate(iso) {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
  }

  // Nombre corto para pills del calendario (primera palabra significativa)
  function shortName(titulo) {
    const map = {
      'Movilidad de hombro': 'Hombro',
      'Flexión de rodilla': 'Rodilla',
      'Extensión de muñeca': 'Muñeca',
      'Fortalecimiento de core': 'Core',
      'Equilibrio estático': 'Equilibrio',
      'Movilidad de tobillo': 'Tobillo'
    };
    return map[titulo] || titulo.split(' ')[0];
  }

  function findEjercicio(id) {
    return EJERCICIOS.find(e => e.id === id);
  }

  // ---- Render: Biblioteca ----
  function renderBiblioteca(items, container) {
    if (!container) return;
    if (!items.length) {
      container.innerHTML = emptyState('No hay ejercicios disponibles', 'Cuando tu fisioterapeuta te asigne ejercicios, aparecerán aquí.');
      return;
    }
    container.innerHTML = items.map(ej => {
      const estado = ESTADOS_UI[ej.estado_ui] || ESTADOS_UI.activo;
      const nivel  = NIVELES[ej.nivel] || NIVELES.medio;
      return `<div class="exercise-card" data-estado="${escapeHtml(ej.estado_ui)}">
        <div class="exercise-card-header">
          <div class="exercise-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <span class="badge ${estado.badge}">${escapeHtml(estado.label)}</span>
        </div>
        <h3>${escapeHtml(ej.titulo)}</h3>
        <p>${escapeHtml(ej.descripcion)}</p>
        <div class="exercise-card-meta">
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${ej.duracion_estimada_min} min
          </span>
          <span class="badge ${nivel.badge}" style="font-weight:500;">${escapeHtml(nivel.label)}</span>
        </div>
      </div>`;
    }).join('');
  }

  // ---- Render: Planificación semanal ----
  function renderSchedule(rutinas, container) {
    if (!container) return;
    const today = todayIsoDay();
    const html = [];
    for (let dia = 1; dia <= 7; dia++) {
      const eventos = rutinas
        .filter(r => r.dia_semana === dia)
        .sort((a, b) => a.hora_programada.localeCompare(b.hora_programada));
      const isToday = dia === today ? ' today' : '';
      html.push(`<div class="schedule-day${isToday}">
        <div class="schedule-day-header">${DIAS_CORTOS[dia]}${isToday ? ' · hoy' : ''}</div>
        ${eventos.map(ev => {
          const ej = findEjercicio(ev.ejercicio_id);
          if (!ej) return '';
          return `<div class="schedule-event" title="${escapeHtml(ej.titulo)} a las ${escapeHtml(ev.hora_programada)}">${escapeHtml(shortName(ej.titulo))} ${escapeHtml(ev.hora_programada)}</div>`;
        }).join('')}
      </div>`);
    }
    container.innerHTML = html.join('');
  }

  // ---- Render: Historial ----
  function renderHistorial(sesiones, tbody) {
    if (!tbody) return;
    if (!sesiones.length) {
      tbody.innerHTML = `<tr><td colspan="4">
        <div class="empty-state" style="padding: var(--spacing-8);">
          <h3>Sin historial todavía</h3>
          <p>Cuando completes tu primer ejercicio aparecerá registrado aquí.</p>
        </div>
      </td></tr>`;
      return;
    }
    const sorted = sesiones.slice().sort((a, b) => new Date(b.fecha_hora_inicio) - new Date(a.fecha_hora_inicio));
    tbody.innerHTML = sorted.map(s => {
      const ej = findEjercicio(s.ejercicio_id);
      const titulo = ej ? ej.titulo : 'Ejercicio';
      const isCompleto = s.estado === 'completado';
      const badgeClass = isCompleto ? 'badge-success' : 'badge-warning';
      const badgeLabel = isCompleto ? 'Completado' : 'Interrumpido';
      return `<tr>
        <td>${escapeHtml(titulo)}</td>
        <td>${escapeHtml(shortDate(s.fecha_hora_inicio))}</td>
        <td>${s.duracion_real_min} min</td>
        <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
      </tr>`;
    }).join('');
  }

  function emptyState(titulo, descripcion) {
    return `<div class="empty-state" style="grid-column: 1 / -1;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <h3>${escapeHtml(titulo)}</h3>
      <p>${escapeHtml(descripcion)}</p>
    </div>`;
  }

  // ---- Mapeos schema → UI ----
  // El schema usa nivel: 'facil'|'medio'|'dificil' y dia_semana: 'lunes'..'domingo'.
  const DIA_NAME_TO_ISO = {
    lunes: 1, martes: 2, miercoles: 3, miércoles: 3,
    jueves: 4, viernes: 5, sabado: 6, sábado: 6, domingo: 7
  };

  // ---- Fetch desde Supabase con fallback a mocks ----
  async function loadFromSupabase() {
    if (typeof supabase === 'undefined') return null;

    let session;
    try {
      ({ data: { session } } = await supabase.auth.getSession());
    } catch (e) { return null; }
    if (!session) return null;

    const uid = session.user.id;

    try {
      // 1) Biblioteca de ejercicios (RLS permite a authenticated)
      const ejRes = await supabase
        .from('ejercicios')
        .select('id, titulo, descripcion, zona_cuerpo, nivel, duracion_estimada_min, activo')
        .eq('activo', true)
        .order('id');

      // 2) Rutina activa del usuario
      const rutinaRes = await supabase
        .from('rutinas')
        .select('id')
        .eq('usuario_id', uid)
        .eq('activa', true)
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();

      let rutinaItems = [];
      if (rutinaRes.data) {
        const reRes = await supabase
          .from('rutina_ejercicios')
          .select('ejercicio_id, dia_semana, hora_programada')
          .eq('rutina_id', rutinaRes.data.id);
        rutinaItems = reRes.data || [];
      }

      // 3) Historial de sesiones
      const sesRes = await supabase
        .from('sesiones_ejercicio')
        .select('id, ejercicio_id, fecha_hora_inicio, duracion_real_min, estado')
        .eq('usuario_id', uid)
        .order('fecha_hora_inicio', { ascending: false });

      if (ejRes.error || sesRes.error) {
        console.warn('Supabase exercises error:', ejRes.error || sesRes.error);
        return null;
      }

      const ejercicios = (ejRes.data || []).map(e => {
        // estado_ui: si el ejercicio está en la rutina actual → 'activo', si no → 'programado'
        const enRutina = rutinaItems.some(r => r.ejercicio_id === e.id);
        return {
          id: e.id,
          titulo: e.titulo,
          descripcion: e.descripcion,
          zona_cuerpo: e.zona_cuerpo,
          nivel: e.nivel || 'medio',
          duracion_estimada_min: e.duracion_estimada_min || 10,
          estado_ui: enRutina ? 'activo' : 'programado'
        };
      });

      const rutinaEjercicios = rutinaItems.map(r => ({
        ejercicio_id: r.ejercicio_id,
        dia_semana: typeof r.dia_semana === 'number'
          ? r.dia_semana
          : (DIA_NAME_TO_ISO[String(r.dia_semana).toLowerCase()] || 0),
        hora_programada: (r.hora_programada || '').slice(0, 5)
      })).filter(r => r.dia_semana > 0);

      const sesiones = (sesRes.data || []).map(s => ({
        id: s.id,
        ejercicio_id: s.ejercicio_id,
        fecha_hora_inicio: s.fecha_hora_inicio,
        duracion_real_min: s.duracion_real_min || 0,
        estado: s.estado
      }));

      return { ejercicios, rutinaEjercicios, sesiones, rutinaId: rutinaRes.data ? rutinaRes.data.id : null };
    } catch (e) {
      console.warn('Supabase exercises fetch failed:', e);
      return null;
    }
  }

  // ---- Init ----
  document.addEventListener('DOMContentLoaded', async () => {
    let ejercicios = EJERCICIOS;
    let rutinaEjercicios = RUTINA_EJERCICIOS;
    let sesiones = SESIONES;
    let rutinaId = null;

    const live = await loadFromSupabase();
    if (live) {
      ejercicios = live.ejercicios.length ? live.ejercicios : EJERCICIOS;
      rutinaEjercicios = live.rutinaEjercicios;
      sesiones = live.sesiones;
      rutinaId = live.rutinaId;

      window.__A1AN_EJERCICIOS__ = ejercicios;
    }

    const _findEjercicio = function (id) {
      const list = window.__A1AN_EJERCICIOS__ || EJERCICIOS;
      return list.find(e => e.id === id);
    };
    window.__A1AN_FIND_EJ__ = _findEjercicio;

    renderBiblioteca(ejercicios, document.getElementById('libraryGrid'));
    renderScheduleWithFinder(rutinaEjercicios, document.getElementById('scheduleGrid'), _findEjercicio);
    renderHistorialWithFinder(sesiones, document.getElementById('historyBody'), _findEjercicio);

    // ---- API pública para el modal "Nueva rutina" ----
    window.A1AN_EXERCISES = {
      // Lista de ejercicios disponibles (id real de BD + titulo)
      getEjercicios: () => ejercicios.slice(),

      // ID de la rutina activa del usuario (null si no hay sesión)
      getRutinaId: () => rutinaId,

      // Inserta un ejercicio en la rutina del usuario y refresca el grid
      addRoutineEntry: async ({ ejercicio_id, dia_semana, hora_programada }) => {
        if (typeof supabase === 'undefined') {
          return { ok: false, error: 'Supabase no disponible' };
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { ok: false, error: 'Necesitas iniciar sesión' };

        let targetRutinaId = rutinaId;

        // Si el usuario no tiene rutina activa, creamos una vacía
        if (!targetRutinaId) {
          const { data: newRutina, error: rErr } = await supabase
            .from('rutinas')
            .insert({
              usuario_id: session.user.id,
              nombre: 'Mi rutina',
              fecha_inicio: new Date().toISOString().slice(0, 10),
              activa: true
            })
            .select('id')
            .single();
          if (rErr || !newRutina) return { ok: false, error: 'No se pudo crear la rutina' };
          targetRutinaId = newRutina.id;
          rutinaId = targetRutinaId;
        }

        // Insertar entrada de rutina_ejercicios
        const { error: reErr } = await supabase
          .from('rutina_ejercicios')
          .insert({
            rutina_id: targetRutinaId,
            ejercicio_id,
            dia_semana,
            hora_programada
          });
        if (reErr) return { ok: false, error: reErr.message || 'Error al guardar' };

        // Refrescar grid local
        const isoDay = (typeof dia_semana === 'number')
          ? dia_semana
          : (DIA_NAME_TO_ISO[String(dia_semana).toLowerCase()] || 0);
        if (isoDay > 0) {
          rutinaEjercicios.push({
            ejercicio_id,
            dia_semana: isoDay,
            hora_programada: String(hora_programada).slice(0, 5)
          });
          renderScheduleWithFinder(rutinaEjercicios, document.getElementById('scheduleGrid'), _findEjercicio);

          // Si el ejercicio pasa de 'programado' a 'activo', re-renderizar biblioteca
          const ej = ejercicios.find(e => e.id === ejercicio_id);
          if (ej && ej.estado_ui !== 'activo') {
            ej.estado_ui = 'activo';
            renderBiblioteca(ejercicios, document.getElementById('libraryGrid'));
          }
        }
        return { ok: true };
      }
    };
  });

  // ---- Variantes de render que usan finder externo (para datos Supabase) ----
  function renderScheduleWithFinder(rutinas, container, finder) {
    if (!container) return;
    const today = todayIsoDay();
    const html = [];
    for (let dia = 1; dia <= 7; dia++) {
      const eventos = rutinas
        .filter(r => r.dia_semana === dia)
        .sort((a, b) => a.hora_programada.localeCompare(b.hora_programada));
      const isToday = dia === today ? ' today' : '';
      html.push(`<div class="schedule-day${isToday}">
        <div class="schedule-day-header">${DIAS_CORTOS[dia]}${isToday ? ' · hoy' : ''}</div>
        ${eventos.map(ev => {
          const ej = finder(ev.ejercicio_id);
          if (!ej) return '';
          return `<div class="schedule-event" title="${escapeHtml(ej.titulo)} a las ${escapeHtml(ev.hora_programada)}">${escapeHtml(shortName(ej.titulo))} ${escapeHtml(ev.hora_programada)}</div>`;
        }).join('')}
      </div>`);
    }
    container.innerHTML = html.join('');
  }

  function renderHistorialWithFinder(sesiones, tbody, finder) {
    if (!tbody) return;
    if (!sesiones.length) {
      tbody.innerHTML = `<tr><td colspan="4">
        <div class="empty-state" style="padding: var(--spacing-8);">
          <h3>Sin historial todavía</h3>
          <p>Cuando completes tu primer ejercicio aparecerá registrado aquí.</p>
        </div>
      </td></tr>`;
      return;
    }
    const sorted = sesiones.slice().sort((a, b) => new Date(b.fecha_hora_inicio) - new Date(a.fecha_hora_inicio));
    tbody.innerHTML = sorted.map(s => {
      const ej = finder(s.ejercicio_id);
      const titulo = ej ? ej.titulo : 'Ejercicio';
      const isCompleto = s.estado === 'completado';
      const badgeClass = isCompleto ? 'badge-success' : 'badge-warning';
      const badgeLabel = isCompleto ? 'Completado' : 'Interrumpido';
      return `<tr>
        <td>${escapeHtml(titulo)}</td>
        <td>${escapeHtml(shortDate(s.fecha_hora_inicio))}</td>
        <td>${s.duracion_real_min} min</td>
        <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
      </tr>`;
    }).join('');
  }
})();
