/* ============================================
   Safe&Sound Robotics — A1AN Web
   ROSBridge Connection (TurtleBot)
   ============================================ */

document.addEventListener('DOMContentLoaded', event => {

  const data = {
    ros: null,
    rosbridge_address: document.getElementById('rosbridgeUrl').value,
    connected: false
  };

  const connectBtn = document.getElementById('rosbridgeConnectBtn');
  const statusDot = document.getElementById('rosbridgeStatusDot');
  const statusText = document.getElementById('rosbridgeStatusText');
  const statusBadge = document.getElementById('rosbridgeStatus');
  const moveButtons = [
    document.getElementById('btnMoveForward'),
    document.getElementById('btnMoveBackward'),
    document.getElementById('btnMoveLeft'),
    document.getElementById('btnMoveRight'),
    document.getElementById('btnMoveStop'),
    document.getElementById('btnGoToCoord'),
    document.getElementById('btnGoToArea'),
  ];

  // --- Actualiza el estado visual ---
  function setStatus(state) {
    const isConnected = state === 'connected';
    const isError = state === 'error';

    statusDot.className = 'status-dot ' + (isConnected ? 'online' : isError ? 'error' : 'offline');
    statusText.textContent = isConnected ? 'Conectado ✓' : isError ? 'Error de conexión' : 'Desconectado';
    statusBadge.classList.toggle('connected', isConnected);

    // Habilitar / deshabilitar botones de movimiento
    moveButtons.forEach(btn => { if (btn) btn.disabled = !isConnected; });

    // Cambiar el botón entre Conectar / Desconectar
    const iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>`;
    connectBtn.innerHTML = iconSvg + (isConnected ? ' Desconectar' : ' Conectar');
    connectBtn.className = isConnected ? 'btn btn-danger' : 'btn btn-primary';
    connectBtn.disabled = false;
  }

  // --- Conectar ---
  function connect() {
    data.rosbridge_address = document.getElementById('rosbridgeUrl').value;
    data.ros = new ROSLIB.Ros({ url: data.rosbridge_address });

    connectBtn.disabled = true;
    connectBtn.textContent = 'Conectando...';

    data.ros.on('connection', () => {
      data.connected = true;
      setStatus('connected');
    });

    data.ros.on('error', (error) => {
      console.log('ROSBridge error:', error);
      data.connected = false;
      setStatus('error');
    });

    data.ros.on('close', () => {
      data.connected = false;
      setStatus('disconnected');
    });
  }

  // --- Desconectar ---
  function disconnect() {
    if (data.ros) data.ros.close();
    data.connected = false;
    setStatus('disconnected');
  }

  // --- Listener del botón ---
  connectBtn.addEventListener('click', () => {
    if (data.connected) {
      disconnect();
    } else {
      connect();
    }
  });

  // --- Movimiento manual ---
  function move(linear_x, angular_z) {
    if (!data.connected) return;

    const topic = new ROSLIB.Topic({
      ros: data.ros,
      name: '/cmd_vel',
      messageType: 'geometry_msgs/msg/TwistStamped'
    });

    const message = new ROSLIB.Message({
      header: {
        stamp: { sec: 0, nanosec: 0 },
        frame_id: 'base_link'
      },
      twist: {
        linear: { x: linear_x, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: angular_z }
      }
    });

    topic.publish(message);
  }

  // Asociar botones del D-pad
  document.getElementById('btnMoveForward')?.addEventListener('click', () => move(0.2, 0));
  document.getElementById('btnMoveBackward')?.addEventListener('click', () => move(-0.2, 0));
  document.getElementById('btnMoveLeft')?.addEventListener('click', () => move(0, 0.5));
  document.getElementById('btnMoveRight')?.addEventListener('click', () => move(0, -0.5));
  document.getElementById('btnMoveStop')?.addEventListener('click', () => move(0, 0));

  // --- Barra de estado de navegación ---
  const navStatusBar  = document.getElementById('navStatusBar');
  const navStatusText = document.getElementById('navStatusText');
  const btnGoToCoord  = document.getElementById('btnGoToCoord');
  const btnGoToArea   = document.getElementById('btnGoToArea');
  const btnStopNav    = document.getElementById('btnStopNav');

  // Coordenadas de áreas predefinidas
  const areas = {
    'cocina':     { x: 6.0,  y: -2.0 },
    'sala':       { x: 1.0,  y:  1.0 },
    'habitacion': { x: -6.0, y:  0.0 },
  };

  function setNavStatus(message, state) {
    // state: 'navigating' | 'stopped' | 'hidden'
    if (state === 'hidden') {
      navStatusBar.style.display = 'none';
      navStatusBar.className = 'nav-status-bar';
      return;
    }
    navStatusBar.style.display = 'flex';
    navStatusBar.className = 'nav-status-bar ' + state;
    navStatusText.textContent = message;

    const navigating = state === 'navigating';
    btnGoToCoord.disabled = navigating || !data.connected;
    btnGoToArea.disabled  = navigating || !data.connected;
    btnStopNav.style.display = navigating ? 'inline-flex' : 'none';
  }

  // --- Enviar goal a Nav2 ---
  function sendNavGoal(x, y) {
    if (!data.connected) return;
    const topic = new ROSLIB.Topic({
      ros: data.ros,
      name: '/nav_goal',
      messageType: 'std_msgs/msg/Float64MultiArray'
    });
    const message = new ROSLIB.Message({ data: [x, y] });
    topic.publish(message);
    console.log(`Goal enviado: x=${x}, y=${y}`);
  }

  // --- Navegación por coordenadas ---
  function goToCoordinates() {
    if (!data.connected) return;
    const x = parseFloat(document.getElementById('navCoordX').value) || 0;
    const y = parseFloat(document.getElementById('navCoordY').value) || 0;
    sendNavGoal(x, y);
    setNavStatus(`Robot moviéndose a (${x.toFixed(2)}, ${y.toFixed(2)})`, 'navigating');
  }

  // --- Navegación por área ---
  function goToArea() {
    if (!data.connected) return;
    const sel    = document.getElementById('navAreaSelect');
    const areaKey = sel.value;
    const coords  = areas[areaKey];
    if (!coords) return;
    sendNavGoal(coords.x, coords.y);
    const label = sel.options[sel.selectedIndex].text;
    setNavStatus(`Robot moviéndose a ${label}`, 'navigating');
  }

  // --- Detener navegación ---
  function stopNavigation() {
    if (!data.connected) return;

    // 1. Cancelar la ruta en Nav2 publicando en /nav_cancel
    const cancelTopic = new ROSLIB.Topic({
      ros: data.ros,
      name: '/nav_cancel',
      messageType: 'std_msgs/msg/Bool'
    });
    cancelTopic.publish(new ROSLIB.Message({ data: true }));

    // 2. Enviar velocidad cero para que pare en su posición actual
    move(0, 0);

    setNavStatus('Robot detenido', 'stopped');
    setTimeout(() => setNavStatus('', 'hidden'), 3000);
  }


  document.getElementById('btnGoToCoord')?.addEventListener('click', goToCoordinates);
  document.getElementById('btnGoToArea')?.addEventListener('click', goToArea);
  btnStopNav?.addEventListener('click', stopNavigation);

  // Estado inicial: barra oculta, botón detener oculto
  if (navStatusBar) navStatusBar.style.display = 'none';
  if (btnStopNav)   btnStopNav.style.display   = 'none';

});
