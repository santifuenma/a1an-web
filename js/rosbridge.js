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

  const mapContainer = document.getElementById('rosMapContainer');
  const mapCanvas = document.getElementById('rosMapCanvas');

  let mapTopic = null;

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
      subscribeToMap();
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
  const navStatusBar = document.getElementById('navStatusBar');
  const navStatusText = document.getElementById('navStatusText');
  const btnGoToCoord = document.getElementById('btnGoToCoord');
  const btnGoToArea = document.getElementById('btnGoToArea');
  const btnStopNav = document.getElementById('btnStopNav');

  // Coordenadas de áreas dinámicas
  let areas = {};

  async function loadAreas() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data, error } = await supabase
      .from('areas_mapa')
      .select('*')
      .eq('usuario_id', session.user.id)
      .eq('activa', true);

    if (error) {
      console.error('Error cargando areas:', error);
      return;
    }

    areas = {};
    const sel = document.getElementById('navAreaSelect');
    if (sel) {
      sel.innerHTML = '';
      if (data && data.length > 0) {
        data.forEach(area => {
          areas[area.id] = { x: area.coordenada_x, y: area.coordenada_y };
          const opt = document.createElement('option');
          opt.value = area.id;
          opt.textContent = area.nombre;
          sel.appendChild(opt);
        });
      } else {
        sel.innerHTML = '<option disabled selected>Sin áreas guardadas</option>';
      }
    }
  }

  async function saveArea() {
    const name = document.getElementById('newAreaName')?.value.trim();
    const x = parseFloat(document.getElementById('newAreaX')?.value);
    const y = parseFloat(document.getElementById('newAreaY')?.value);

    if (!name) {
      alert('Introduce un nombre para guardar el área.');
      return;
    }
    if (isNaN(x) || isNaN(y)) {
      alert('Las coordenadas X e Y deben ser válidas.');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const btn = document.getElementById('btnSaveArea');
    const oldText = btn.textContent;
    btn.textContent = 'Guardando...';
    btn.disabled = true;

    const { error } = await supabase.from('areas_mapa').insert({
      usuario_id: session.user.id,
      nombre: name,
      coordenada_x: x,
      coordenada_y: y,
      activa: true
    });

    btn.textContent = oldText;
    btn.disabled = false;

    if (error) {
      console.error('Error guardando el área:', error);
      alert('Error al guardar. Inténtalo de nuevo.');
    } else {
      document.getElementById('newAreaName').value = '';
      loadAreas();
    }
  }

  async function deleteArea() {
    const sel = document.getElementById('navAreaSelect');
    const areaId = sel.value;
    if (!areaId) return;

    // Check if it's the disabled option
    if (sel.options[sel.selectedIndex].disabled) return;

    const areaName = sel.options[sel.selectedIndex].text;
    const confirmDelete = window.confirm(`¿Estás seguro de que deseas borrar el área "${areaName}"? Esta acción no se puede deshacer.`);

    if (!confirmDelete) return;

    const btn = document.getElementById('btnDeleteArea');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '...';
    }

    const { error } = await supabase
      .from('areas_mapa')
      .delete()
      .eq('id', areaId);
    // If soft delete is preferred: .update({ activa: false }).eq('id', areaId)
    // I will use delete() as it matches "borrar de forma definitiva" (delete permanently)

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg> Borrar`;
    }

    if (error) {
      console.error('Error al borrar el área:', error);
      alert('Error al borrar el área. Inténtalo de nuevo.');
    } else {
      loadAreas();
    }
  }

  // Cargar áreas al inicio
  loadAreas();

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
    btnGoToArea.disabled = navigating || !data.connected;
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
    const sel = document.getElementById('navAreaSelect');
    const areaKey = sel.value;
    const coords = areas[areaKey];
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

  /**
 * Dibuja el OccupancyGrid recibido desde ROS2
 * dentro del canvas del mapa.
 *
 * @param {Object} message Mensaje nav_msgs/msg/OccupancyGrid
 */
  function drawOccupancyGrid(message) {

    if (!mapCanvas) return;

    const ctx = mapCanvas.getContext('2d');

    const width = message.info.width;
    const height = message.info.height;

    mapCanvas.width = width;
    mapCanvas.height = height;

    const imageData = ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {

      for (let x = 0; x < width; x++) {

        const mapIndex = y * width + x;

        // Invertir eje Y para alinearlo con ROS
        const canvasY = height - y - 1;

        const pixelIndex = (canvasY * width + x) * 4;

        const value = message.data[mapIndex];

        let color = 150;

        if (value === 0) {
          color = 255;
        }
        else if (value === 100) {
          color = 0;
        }

        imageData.data[pixelIndex] = color;
        imageData.data[pixelIndex + 1] = color;
        imageData.data[pixelIndex + 2] = color;
        imageData.data[pixelIndex + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    mapCanvas.style.width = '100%';
    mapCanvas.style.height = '100%';
  }

  /**
 * Se suscribe al topic /map para recibir
 * el OccupancyGrid publicado por ROS2.
 */
  function subscribeToMap() {

    mapTopic = new ROSLIB.Topic({
      ros: data.ros,
      name: '/map',
      messageType: 'nav_msgs/msg/OccupancyGrid'
    });

    mapTopic.subscribe((message) => {

      console.log('Mapa recibido');

      drawOccupancyGrid(message);
    });
  }

  document.getElementById('btnGoToCoord')?.addEventListener('click', goToCoordinates);
  document.getElementById('btnGoToArea')?.addEventListener('click', goToArea);
  document.getElementById('btnSaveArea')?.addEventListener('click', saveArea);
  document.getElementById('btnDeleteArea')?.addEventListener('click', deleteArea);
  btnStopNav?.addEventListener('click', stopNavigation);

  // Estado inicial: barra oculta, botón detener oculto
  if (navStatusBar) navStatusBar.style.display = 'none';
  if (btnStopNav) btnStopNav.style.display = 'none';

});
