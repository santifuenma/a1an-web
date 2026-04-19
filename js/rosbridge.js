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

  const connectBtn  = document.getElementById('rosbridgeConnectBtn');
  const statusDot   = document.getElementById('rosbridgeStatusDot');
  const statusText  = document.getElementById('rosbridgeStatusText');
  const statusBadge = document.getElementById('rosbridgeStatus');
  const moveButtons = [
    document.getElementById('btnMoveForward'),
    document.getElementById('btnMoveBackward'),
    document.getElementById('btnMoveLeft'),
    document.getElementById('btnMoveRight'),
    document.getElementById('btnMoveStop'),
  ];

  // --- Actualiza el estado visual ---
  function setStatus(state) {
    const isConnected = state === 'connected';
    const isError     = state === 'error';

    statusDot.className = 'status-dot ' + (isConnected ? 'online' : isError ? 'error' : 'offline');
    statusText.textContent = isConnected ? 'Conectado ✓' : isError ? 'Error de conexión' : 'Desconectado';
    statusBadge.classList.toggle('connected', isConnected);

    // Habilitar / deshabilitar botones de movimiento
    moveButtons.forEach(btn => { if (btn) btn.disabled = !isConnected; });

    // Cambiar el botón entre Conectar / Desconectar
    const iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>`;
    connectBtn.innerHTML = iconSvg + (isConnected ? ' Desconectar' : ' Conectar');
    connectBtn.className = isConnected ? 'btn btn-danger' : 'btn btn-primary';
    connectBtn.disabled  = false;
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
        linear:  { x: linear_x, y: 0, z: 0 },
        angular: { x: 0,        y: 0, z: angular_z }
      }
    });

    topic.publish(message);
  }

  // Asociar botones del D-pad
  document.getElementById('btnMoveForward') ?.addEventListener('click', () => move( 0.2,  0));
  document.getElementById('btnMoveBackward')?.addEventListener('click', () => move(-0.2,  0));
  document.getElementById('btnMoveLeft')    ?.addEventListener('click', () => move( 0,    0.5));
  document.getElementById('btnMoveRight')   ?.addEventListener('click', () => move( 0,   -0.5));
  document.getElementById('btnMoveStop')    ?.addEventListener('click', () => move( 0,    0));

});
