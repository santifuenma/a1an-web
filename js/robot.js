/* ============================================
   Safe&Sound Robotics — A1AN Web
   Mi Robot — estado, batería, sync, diagnóstico
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('robotToggle');
  if (!toggle) return;

  // ---- Identificación del robot ----
  const robotId = localStorage.getItem('a1an_robot_id') || 'A1AN-7F3K-9X2P';
  const robotIdEl = document.getElementById('robotId');
  if (robotIdEl) robotIdEl.textContent = robotId;

  // ---- Estado ----
  let battery = 78;
  let robotOn = true;
  let drainInterval = null;
  let uptimeInterval = null;
  let uptimeSeconds = 4 * 3600 + 23 * 60; // baseline 4h 23min

  // ---- Componentes diagnóstico (5 requeridos) ----
  // Estados: 'ok' | 'warn' | 'fail' | 'off' (cuando el robot está apagado)
  const diagnostics = [
    { name: 'Sensores',  status: 'ok',   value: 'Activo' },
    { name: 'Motores',   status: 'ok',   value: 'Activo' },
    { name: 'Cámara',    status: 'warn', value: 'Calibración recomendada' },
    { name: 'Micrófono', status: 'ok',   value: 'Activo' },
    { name: 'Altavoz',   status: 'ok',   value: 'Activo' }
  ];

  // ---- Init ----
  renderDiagnostics();
  updateBatteryUI();
  updateUptimeUI();
  startBatteryDrain();
  startUptimeCounter();

  // ---- Toggle on/off ----
  toggle.addEventListener('change', () => {
    robotOn = toggle.checked;
    updateRobotState();
    if (robotOn) {
      startBatteryDrain();
      startUptimeCounter();
      showToast('Robot encendido', 'success');
    } else {
      stopBatteryDrain();
      stopUptimeCounter();
      showToast('Robot apagado', '');
    }
    renderDiagnostics();
    updateSyncButtonAvailability();
  });

  // ---- Sync button ----
  const syncBtn = document.getElementById('syncBtn');
  const syncBtnHtml = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Sincronizar';
  if (syncBtn) {
    syncBtn.addEventListener('click', () => {
      if (!robotOn) {
        showToast('Enciende el robot antes de sincronizar', 'danger');
        return;
      }
      syncBtn.disabled = true;
      syncBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Sincronizando...';
      setTimeout(() => {
        const now = new Date();
        const timeStr = 'Hoy, ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        const lastSync = document.getElementById('lastSyncTime');
        if (lastSync) lastSync.textContent = timeStr;
        syncBtn.disabled = false;
        syncBtn.innerHTML = syncBtnHtml;
        showToast('Sincronización completada', 'success');
      }, 2000);
    });
  }

  // ---- Render helpers ----
  function updateRobotState() {
    const label = document.getElementById('robotStateLabel');
    const statusDot = document.getElementById('infoStatusDot');
    const statusText = document.getElementById('infoStatusText');

    if (label) label.textContent = robotOn ? 'Encendido' : 'Apagado';
    if (statusDot) statusDot.className = 'status-dot ' + (robotOn ? 'online' : 'offline');
    if (statusText) statusText.textContent = robotOn ? 'En línea' : 'Desconectado';
  }

  function updateBatteryUI() {
    const bar = document.getElementById('robotBatteryBar');
    const text = document.getElementById('robotBatteryText');
    if (bar) {
      bar.style.width = battery + '%';
      bar.className = 'battery-bar-fill ' + (battery > 50 ? 'high' : battery > 20 ? 'medium' : 'low');
    }
    if (text) text.textContent = battery + '%';
  }

  function updateUptimeUI() {
    const el = document.getElementById('uptimeText');
    if (!el) return;
    if (!robotOn) {
      el.textContent = '— (robot apagado)';
      return;
    }
    const h = Math.floor(uptimeSeconds / 3600);
    const m = Math.floor((uptimeSeconds % 3600) / 60);
    el.textContent = `${h}h ${String(m).padStart(2, '0')}min`;
  }

  function startBatteryDrain() {
    stopBatteryDrain();
    drainInterval = setInterval(() => {
      if (battery > 0) {
        battery = Math.max(0, battery - 1);
        updateBatteryUI();
      }
    }, 8000);
  }

  function stopBatteryDrain() {
    if (drainInterval) {
      clearInterval(drainInterval);
      drainInterval = null;
    }
  }

  function startUptimeCounter() {
    stopUptimeCounter();
    uptimeInterval = setInterval(() => {
      uptimeSeconds += 1;
      if (uptimeSeconds % 30 === 0) updateUptimeUI();
    }, 1000);
    updateUptimeUI();
  }

  function stopUptimeCounter() {
    if (uptimeInterval) {
      clearInterval(uptimeInterval);
      uptimeInterval = null;
    }
    updateUptimeUI();
  }

  function updateSyncButtonAvailability() {
    if (!syncBtn) return;
    syncBtn.disabled = !robotOn;
    syncBtn.style.opacity = robotOn ? '' : '0.5';
    syncBtn.style.cursor = robotOn ? '' : 'not-allowed';
  }

  function renderDiagnostics() {
    const grid = document.getElementById('diagnosticGrid');
    const badge = document.getElementById('diagnosticBadge');
    if (!grid) return;

    const STATUS_META = {
      ok:   { symbol: '✓', label: 'Activo' },
      warn: { symbol: '!', label: 'Atención' },
      fail: { symbol: '✕', label: 'Error' },
      off:  { symbol: '–', label: 'Inactivo' }
    };

    const renderStatus = robotOn ? null : 'off';

    grid.innerHTML = diagnostics.map(d => {
      const effective = renderStatus || d.status;
      const meta = STATUS_META[effective] || STATUS_META.ok;
      const value = robotOn ? d.value : 'Inactivo';
      return `<div class="diagnostic-item">
        <div class="diag-status ${effective}" title="${meta.label}">${meta.symbol}</div>
        <div class="diag-info">
          <span class="diag-name">${d.name}</span>
          <span class="diag-value">${value}</span>
        </div>
      </div>`;
    }).join('');

    if (badge) {
      if (!robotOn) {
        badge.className = 'badge';
        badge.style.background = '#e5e7eb';
        badge.style.color = '#374151';
        badge.textContent = 'Robot apagado';
      } else {
        badge.style.background = '';
        badge.style.color = '';
        const hasFail = diagnostics.some(d => d.status === 'fail');
        const hasWarn = diagnostics.some(d => d.status === 'warn');
        if (hasFail) {
          badge.className = 'badge badge-danger';
          badge.textContent = 'Revisión necesaria';
        } else if (hasWarn) {
          badge.className = 'badge badge-warning';
          badge.textContent = 'Atención requerida';
        } else {
          badge.className = 'badge badge-success';
          badge.textContent = 'Todo correcto';
        }
      }
    }
  }
});

// Spin animation + estado off para diag-status
(() => {
  if (document.getElementById('robotAnimStyles')) return;
  const style = document.createElement('style');
  style.id = 'robotAnimStyles';
  style.textContent = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .diagnostic-item .diag-status.off { background: #e5e7eb; color: #6b7280; }
  `;
  document.head.appendChild(style);
})();
