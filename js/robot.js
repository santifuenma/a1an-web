/* ============================================
   Safe&Sound Robotics — A1AN Web
   Robot Panel JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('robotToggle');
  if (!toggle) return;

  const robotId = localStorage.getItem('a1an_robot_id') || 'A1AN-7F3K-9X2P';
  const robotIdEl = document.getElementById('robotId');
  if (robotIdEl) robotIdEl.textContent = robotId;

  let battery = 78;
  let robotOn = true;
  let drainInterval = null;

  renderDiagnostics();
  startBatteryDrain();

  // --- Toggle on/off ---
  toggle.addEventListener('change', () => {
    robotOn = toggle.checked;
    updateRobotState();
    if (robotOn) {
      startBatteryDrain();
      showToast('Robot encendido', 'success');
    } else {
      stopBatteryDrain();
      showToast('Robot apagado', '');
    }
  });

  // --- Sync button ---
  const syncBtn = document.getElementById('syncBtn');
  if (syncBtn) {
    syncBtn.addEventListener('click', () => {
      syncBtn.disabled = true;
      syncBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Sincronizando...';
      setTimeout(() => {
        const now = new Date();
        const timeStr = 'Hoy, ' + now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        const lastSync = document.getElementById('lastSyncTime');
        if (lastSync) lastSync.textContent = timeStr;
        syncBtn.disabled = false;
        syncBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Sincronizar';
        showToast('Sincronización completada', 'success');
      }, 2000);
    });
  }

  function updateRobotState() {
    const label = document.getElementById('robotStateLabel');
    const statusDot = document.getElementById('infoStatusDot');
    const statusText = document.getElementById('infoStatusText');

    if (label) label.textContent = robotOn ? 'Encendido' : 'Apagado';
    if (statusDot) {
      statusDot.className = 'status-dot ' + (robotOn ? 'online' : 'offline');
    }
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

  function renderDiagnostics() {
    const grid = document.getElementById('diagnosticGrid');
    if (!grid) return;

    const diagnostics = [
      { name: 'Sensores', status: 'ok', value: 'Operativo' },
      { name: 'Motores', status: 'ok', value: 'Operativo' },
      { name: 'Cámara', status: 'ok', value: 'Activa' },
      { name: 'Micrófono', status: 'ok', value: 'Activo' },
      { name: 'Altavoz', status: 'ok', value: 'Activo' },
      { name: 'Navegación', status: 'ok', value: 'Calibrada' },
      { name: 'Temperatura', status: 'ok', value: '38°C' },
      { name: 'Memoria', status: 'ok', value: '42% usada' }
    ];

    grid.innerHTML = diagnostics.map(d => `
      <div class="diagnostic-item">
        <div class="diag-status ${d.status}">
          ${d.status === 'ok' ? '✓' : d.status === 'warn' ? '!' : '✕'}
        </div>
        <div class="diag-info">
          <span class="diag-name">${d.name}</span>
          <span class="diag-value">${d.value}</span>
        </div>
      </div>
    `).join('');
  }
});

// Spin animation via inline style (added to head)
(() => {
  if (!document.getElementById('robotAnimStyles')) {
    const style = document.createElement('style');
    style.id = 'robotAnimStyles';
    style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }
})();
