/* ============================================
   Safe&Sound Robotics — A1AN Web
   ROSBridge Connection (TurtleBot)
   ============================================ */

document.addEventListener('DOMContentLoaded', event => {

  const data = {
    ros: null,
    rosbridge_address: document.getElementById('rosbridgeUrl').value,
    connected: false,
    detectionsTopic: null
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
  let poseTopic = null;

  // --- RViz-style map state ---
  let mapInfo = null;      // { width, height, resolution, origin }
  let mapImageData = null; // off-screen ImageData
  let robotPose = null;    // { x, y, theta } in map frame (meters)
  let mapScale = 1;        // current zoom
  let mapOffsetX = 0;      // pan offset in canvas px
  let mapOffsetY = 0;
  let isPanning = false;
  let panStart = { x: 0, y: 0 };

  // --- Actualiza el estado visual ---
  function setStatus(state) {
    const isConnected = state === 'connected';
    const isError = state === 'error';

    statusDot.className = 'status-dot ' + (isConnected ? 'online' : isError ? 'error' : 'offline');
    statusText.textContent = isConnected ? 'Conectado ✓' : isError ? 'Error de conexión' : 'Desconectado';
    statusBadge.classList.toggle('connected', isConnected);

    // Habilitar / deshabilitar botones
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
      subscribeDetections();
      subscribeToMap();
    });

    data.ros.on('error', (error) => {
      console.log('ROSBridge error:', error);
      data.connected = false;
      setStatus('error');
      unsubscribeDetections();
      window.setVisionConnectionState?.('error');
      drawMapDisconnectedOverlay();
    });

    data.ros.on('close', () => {
      data.connected = false;
      setStatus('disconnected');
      unsubscribeDetections();
      window.setVisionConnectionState?.('disconnected');
      drawMapDisconnectedOverlay();
    });
  }

  // --- Desconectar ---
  function disconnect() {
    unsubscribeDetections();
    if (data.ros) data.ros.close();
    data.connected = false;
    setStatus('disconnected');
    window.setVisionConnectionState?.('disconnected');
  }

  function subscribeDetections() {
    if (!data.connected || data.detectionsTopic) return;

    data.detectionsTopic = new ROSLIB.Topic({
      ros: data.ros,
      name: '/a1an_vision/detected_objects',
      messageType: 'std_msgs/String'
    });

    data.detectionsTopic.subscribe((message) => {
      try {
        const payload = JSON.parse(message.data);
        window.renderVisionDetections?.(payload);
      } catch (error) {
        console.log('Detection payload parse error:', error, message.data);
        window.setVisionConnectionState?.('error');
      }
    });

    window.setVisionConnectionState?.('connected');
  }

  function unsubscribeDetections() {
    if (!data.detectionsTopic) return;
    data.detectionsTopic.unsubscribe();
    data.detectionsTopic = null;
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

  // Pestaña 4: Rutas
  let routeSteps = [];
  let routeRunning = false;

  async function loadAreas() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: areasData, error } = await supabase
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
      if (areasData && areasData.length > 0) {
        areasData.forEach(area => {
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

    // Llamada a función para rutas
    await loadRouteAreaSelect();
  }

  // Pestaña 4: Rutas
  async function loadRouteAreaSelect() {
    const sel = document.getElementById('routeAreaSelect');
    if (!sel) return;

    sel.innerHTML = '';

    Object.entries(areas).forEach(([id, coords]) => {
      const areaOption = document.querySelector(`#navAreaSelect option[value="${id}"]`);
      const name = areaOption ? areaOption.textContent : `Área ${id}`;

      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = name;
      sel.appendChild(opt);
    });
  }

  function renderRouteSteps() {
    const list = document.getElementById('routeStepsList');
    if (!list) return;

    list.innerHTML = '';

    routeSteps.forEach((step, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
      ${step.nombre}
      <span class="route-step-remove" data-index="${index}">×</span>
    `;
      list.appendChild(li);
    });

    document.querySelectorAll('.route-step-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        routeSteps.splice(index, 1);
        renderRouteSteps();
      });
    });
  }

  function addRouteStep() {
    const sel = document.getElementById('routeAreaSelect');
    if (!sel || !sel.value) return;

    routeSteps.push({
      area_id: parseInt(sel.value),
      nombre: sel.options[sel.selectedIndex].textContent
    });

    renderRouteSteps();
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

  // --- Enviar goal a Nav2 ---
  function sendNavGoal(x, y) {
    if (!data.ros) return;
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
    const x = parseFloat(document.getElementById('navCoordX').value) || 0;
    const y = parseFloat(document.getElementById('navCoordY').value) || 0;
    sendNavGoal(x, y);
  }

  // --- Navegación por área ---
  function goToArea() {
    const sel = document.getElementById('navAreaSelect');
    const areaKey = sel.value;
    const coords = areas[areaKey];
    if (coords) {
      sendNavGoal(coords.x, coords.y);
    }
  }

  // --- Detener navegación ---
  function stopNavigation() {
    const cancelTopic = new ROSLIB.Topic({
      ros: data.ros,
      name: '/nav_cancel',
      messageType: 'std_msgs/msg/Bool'
    });
    cancelTopic.publish(new ROSLIB.Message({ data: true }));
    move(0, 0); // Parar motores por si acaso
  }

  // ============================================================
  //  RViz-style map renderer
  // ============================================================

  /**
   * Convierte los datos de OccupancyGrid a un ImageData off-screen
   * con la paleta de colores de RViz.
   */
  function buildMapImage(message) {
    const width = message.info.width;
    const height = message.info.height;
    const imgData = new ImageData(width, height);

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const idx = row * width + col;
        const flippedRow = height - row - 1;   // ROS: Y hacia arriba
        const px = (flippedRow * width + col) * 4;
        const v = message.data[idx];

        if (v === 0) {
          // Espacio libre — blanco ligeramente cálido (como RViz)
          imgData.data[px] = 242;
          imgData.data[px + 1] = 242;
          imgData.data[px + 2] = 242;
        } else if (v === 100) {
          // Obstáculo — azul-noche oscuro (como RViz)
          imgData.data[px] = 18;
          imgData.data[px + 1] = 18;
          imgData.data[px + 2] = 38;
        } else {
          // Desconocido — gris medio
          imgData.data[px] = 100;
          imgData.data[px + 1] = 110;
          imgData.data[px + 2] = 120;
        }
        imgData.data[px + 3] = 255;
      }
    }
    return imgData;
  }

  /**
   * Redibuja el canvas completo: imagen del mapa + cuadrícula + robot.
   */
  function redrawMap() {
    if (!mapCanvas || !mapImageData || !mapInfo) return;

    const container = mapCanvas.parentElement;
    const cw = container.clientWidth || 600;
    const ch = container.clientHeight || 420;

    mapCanvas.width = cw;
    mapCanvas.height = ch;

    const ctx = mapCanvas.getContext('2d');

    // Fondo oscuro estilo RViz
    ctx.fillStyle = '#1a1d2e';
    ctx.fillRect(0, 0, cw, ch);

    const res = mapInfo.resolution;   // metres/pixel
    const mw = mapInfo.width;
    const mh = mapInfo.height;
    const ox = mapInfo.origin.position.x;  // map origin in metres
    const oy = mapInfo.origin.position.y;

    // Escala base: encajar el mapa en el canvas
    const baseScale = Math.min(cw / mw, ch / mh) * 0.9;
    const totalScale = baseScale * mapScale;

    // Centro del canvas como punto de referencia para el pan
    const drawX = (cw - mw * totalScale) / 2 + mapOffsetX;
    const drawY = (ch - mh * totalScale) / 2 + mapOffsetY;

    // ----- Dibujar imagen del mapa -----
    const offscreen = document.createElement('canvas');
    offscreen.width = mw;
    offscreen.height = mh;
    offscreen.getContext('2d').putImageData(mapImageData, 0, 0);

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.scale(totalScale, totalScale);
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();

    // ----- Cuadrícula de coordenadas (cada metro) -----
    drawGrid(ctx, totalScale, drawX, drawY, mw, mh, res, ox, oy, cw, ch);

    // ----- Robot -----
    if (robotPose) {
      // Convertir posición en metros a píxeles del canvas
      const rx = (robotPose.x - ox) / res;
      const ry = mh - (robotPose.y - oy) / res;  // Y invertido
      const cx = drawX + rx * totalScale;
      const cy = drawY + ry * totalScale;
      drawRobot(ctx, cx, cy, robotPose.theta, totalScale * res);
    }

    // ----- Leyenda -----
    drawLegend(ctx, cw, ch);
  }

  /**
   * Dibuja la cuadrícula RViz (líneas cada metro + etiquetas).
   */
  function drawGrid(ctx, scale, drawX, drawY, mw, mh, res, ox, oy, cw, ch) {
    const gridSpacingM = 1;  // 1 metro
    const gridSpacingPx = gridSpacingM / res;  // en píxeles del mapa

    ctx.save();
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.18)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(120, 200, 255, 0.7)';

    // Líneas verticales (X constante)
    const startXm = Math.ceil(ox / gridSpacingM) * gridSpacingM;
    for (let xm = startXm; xm < ox + mw * res; xm += gridSpacingM) {
      const px = drawX + ((xm - ox) / res) * scale;
      if (px < 0 || px > cw) continue;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, ch);
      ctx.stroke();
      // Etiqueta
      if (Math.abs(xm) > 0.01 || xm === 0) {
        ctx.fillText(xm.toFixed(0) + 'm', px + 2, ch - 6);
      }
    }

    // Líneas horizontales (Y constante en ROS → invertido en canvas)
    const startYm = Math.ceil(oy / gridSpacingM) * gridSpacingM;
    for (let ym = startYm; ym < oy + mh * res; ym += gridSpacingM) {
      const py = drawY + (mh - (ym - oy) / res) * scale;
      if (py < 0 || py > ch) continue;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(cw, py);
      ctx.stroke();
      ctx.fillText(ym.toFixed(0) + 'm', 4, py - 3);
    }

    ctx.restore();
  }

  /**
   * Dibuja el robot como un círculo con flecha de orientación (estilo RViz).
   */
  function drawRobot(ctx, cx, cy, theta, displayRadius) {
    const r = Math.max(12, Math.min(displayRadius * 18, 28));

    ctx.save();
    ctx.translate(cx, cy);

    // Sombra
    ctx.shadowColor = 'rgba(0, 220, 255, 0.6)';
    ctx.shadowBlur = 14;

    // Círculo exterior (halo cian)
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 220, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Círculo del cuerpo
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, '#00e5ff');
    grad.addColorStop(0.6, '#0066cc');
    grad.addColorStop(1, '#003366');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Flecha de orientación
    ctx.rotate(-theta);  // theta en ROS es CCW, canvas es CW
    ctx.beginPath();
    ctx.moveTo(r * 0.9, 0);
    ctx.lineTo(-r * 0.5, r * 0.4);
    ctx.lineTo(-r * 0.5, -r * 0.4);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  /**
   * Leyenda compacta en esquina.
   */
  function drawLegend(ctx, cw, ch) {
    ctx.save();
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(cw - 110, ch - 48, 106, 44);

    const items = [
      { color: '#f2f2f2', label: 'Libre' },
      { color: '#12121e', label: 'Obstáculo' },
      { color: '#646e78', label: 'Desconocido' },
    ];
    items.forEach((item, i) => {
      ctx.fillStyle = item.color;
      ctx.fillRect(cw - 106, ch - 44 + i * 13, 10, 10);
      ctx.fillStyle = '#ccddee';
      ctx.fillText(item.label, cw - 92, ch - 35 + i * 13);
    });
    ctx.restore();
  }

  /**
   * Inicializa pan & zoom en el canvas del mapa.
   */
  function initMapInteraction() {
    if (!mapCanvas) return;

    // Zoom con rueda
    mapCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      mapScale = Math.max(0.3, Math.min(mapScale * factor, 8));
      redrawMap();
    }, { passive: false });

    // Pan con drag
    mapCanvas.addEventListener('mousedown', (e) => {
      isPanning = true;
      panStart = { x: e.clientX - mapOffsetX, y: e.clientY - mapOffsetY };
      mapCanvas.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      mapOffsetX = e.clientX - panStart.x;
      mapOffsetY = e.clientY - panStart.y;
      redrawMap();
    });
    window.addEventListener('mouseup', () => {
      isPanning = false;
      if (mapCanvas) mapCanvas.style.cursor = 'grab';
    });

    mapCanvas.style.cursor = 'grab';
  }

  /**
   * Dibuja un overlay semitransparente cuando la conexión se pierde.
   */
  function drawMapDisconnectedOverlay() {
    if (!mapCanvas) return;
    const ctx = mapCanvas.getContext('2d');
    const cw = mapCanvas.width || mapCanvas.parentElement.clientWidth || 600;
    const ch = mapCanvas.height || mapCanvas.parentElement.clientHeight || 420;

    // Oscurecer el mapa actual
    ctx.fillStyle = 'rgba(10, 10, 20, 0.72)';
    ctx.fillRect(0, 0, cw, ch);

    // Icono y texto
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,100,100,0.9)';
    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.fillText('⚠ Conexión perdida', cw / 2, ch / 2 - 14);
    ctx.fillStyle = 'rgba(200,200,200,0.7)';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('Reconecta al ROSBridge para continuar', cw / 2, ch / 2 + 10);
    ctx.restore();
  }

  /**
   * Procesa el OccupancyGrid y construye el ImageData.
   *
   * @param {Object} message Mensaje nav_msgs/msg/OccupancyGrid
   */
  function drawOccupancyGrid(message) {
    if (!mapCanvas) return;

    mapInfo = message.info;
    mapImageData = buildMapImage(message);
    redrawMap();
  }

  /**
   * Se suscribe a /map y a /amcl_pose para recibir el mapa y la posición del robot.
   */
  function subscribeToMap() {
    mapTopic = new ROSLIB.Topic({
      ros: data.ros,
      name: '/map',
      messageType: 'nav_msgs/msg/OccupancyGrid'
    });
    mapTopic.subscribe((message) => {
      console.log('Mapa recibido:', message.info.width, 'x', message.info.height);
      drawOccupancyGrid(message);
    });

    // Suscripción a la pose del robot (AMCL o similar)
    poseTopic = new ROSLIB.Topic({
      ros: data.ros,
      name: '/amcl_pose',
      messageType: 'geometry_msgs/msg/PoseWithCovarianceStamped'
    });
    poseTopic.subscribe((msg) => {
      const p = msg.pose.pose;
      // Calcular yaw desde quaternion
      const q = p.orientation;
      const theta = Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z));
      robotPose = { x: p.position.x, y: p.position.y, theta };
      redrawMap();
    });

    initMapInteraction();
  }

  async function saveRoute() {
    const name = document.getElementById('newRouteName')?.value.trim();

    if (!name) {
      alert('Introduce un nombre para la ruta.');
      return;
    }

    if (routeSteps.length === 0) {
      alert('Añade al menos un área a la ruta.');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: robot } = await supabase
      .from('robots')
      .select('id')
      .eq('usuario_id', session.user.id)
      .maybeSingle();

    const { data: route, error: routeError } = await supabase
      .from('rutas_robot')
      .insert({
        usuario_id: session.user.id,
        robot_id: robot?.id ?? null,
        nombre: name,
        estado: 'pendiente',
        paso_actual: 1,
        activa: true
      })
      .select()
      .single();

    if (routeError) {
      console.error(routeError);
      alert('Error al guardar la ruta.');
      return;
    }

    const pasos = routeSteps.map((step, index) => ({
      ruta_id: route.id,
      area_mapa_id: step.area_id,
      orden: index + 1,
      estado: 'pendiente'
    }));

    const { error: stepsError } = await supabase
      .from('ruta_pasos')
      .insert(pasos);

    if (stepsError) {
      console.error(stepsError);
      alert('La ruta se creó, pero falló al guardar los pasos.');
      return;
    }

    document.getElementById('newRouteName').value = '';
    routeSteps = [];
    renderRouteSteps();
    await loadSavedRoutes();

    alert('Ruta guardada correctamente.');
  }

  async function loadSavedRoutes() {
    const sel = document.getElementById('savedRouteSelect');
    const btnExecute = document.getElementById('btnExecuteRoute');

    if (!sel) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: routes, error } = await supabase
      .from('rutas_robot')
      .select('id, nombre, estado')
      .eq('usuario_id', session.user.id)
      .eq('activa', true)
      .order('id', { ascending: false });

    if (error) {
      console.error('Error cargando rutas:', error);
      return;
    }

    sel.innerHTML = '';

    if (!routes || routes.length === 0) {
      sel.innerHTML = '<option disabled selected>Sin rutas guardadas</option>';
      if (btnExecute) btnExecute.disabled = true;
      return;
    }

    routes.forEach(route => {
      const opt = document.createElement('option');
      opt.value = route.id;
      opt.textContent = route.nombre;
      sel.appendChild(opt);
    });

    if (btnExecute) btnExecute.disabled = false;
  }

  async function executeRoute() {
    const sel = document.getElementById('savedRouteSelect');
    const routeId = sel?.value;

    if (!routeId) {
      alert('Selecciona una ruta.');
      return;
    }

    if (!data.connected) {
      alert('Conecta ROSBridge antes de ejecutar la ruta.');
      return;
    }

    routeRunning = true;
    document.getElementById('btnExecuteRoute').disabled = true;
    document.getElementById('btnStopRoute').disabled = false;

    await supabase
      .from('rutas_robot')
      .update({ estado: 'en_progreso', paso_actual: 1 })
      .eq('id', routeId);

    const { data: pasos, error } = await supabase
      .from('ruta_pasos')
      .select(`
      id,
      orden,
      areas_mapa (
        nombre,
        coordenada_x,
        coordenada_y
      )
    `)
      .eq('ruta_id', routeId)
      .order('orden', { ascending: true });

    if (error || !pasos) {
      console.error(error);
      alert('Error cargando los pasos de la ruta.');
      routeRunning = false;
      return;
    }

    for (const paso of pasos) {
      if (!routeRunning) break;

      const area = paso.areas_mapa;

      await supabase
        .from('rutas_robot')
        .update({ paso_actual: paso.orden })
        .eq('id', routeId);

      await supabase
        .from('ruta_pasos')
        .update({ estado: 'en_progreso' })
        .eq('id', paso.id);

      const targetX = Number(area.coordenada_x);
      const targetY = Number(area.coordenada_y);
      sendNavGoal(targetX, targetY);

      console.log(`Yendo a ${area.nombre} (x=${targetX}, y=${targetY})`);

      // Esperar a que el robot llegue al punto (distancia < 0.5m) o timeout de 120s
      await new Promise(resolve => {
        const THRESHOLD = 0.5; // metros
        const TIMEOUT = 120000; // 120 segundos máximo
        const POLL_INTERVAL = 1000; // comprobar cada segundo
        let elapsed = 0;

        const check = setInterval(() => {
          elapsed += POLL_INTERVAL;

          if (!routeRunning) {
            clearInterval(check);
            resolve();
            return;
          }

          if (robotPose) {
            const dist = Math.sqrt(
              Math.pow(robotPose.x - targetX, 2) +
              Math.pow(robotPose.y - targetY, 2)
            );
            if (dist < THRESHOLD) {
              console.log(`Llegó a ${area.nombre} (dist=${dist.toFixed(2)}m)`);
              clearInterval(check);
              resolve();
              return;
            }
          }

          if (elapsed >= TIMEOUT) {
            console.warn(`Timeout esperando llegar a ${area.nombre}`);
            clearInterval(check);
            resolve();
          }
        }, POLL_INTERVAL);
      });

      if (!routeRunning) break;

      await supabase
        .from('ruta_pasos')
        .update({ estado: 'completado' })
        .eq('id', paso.id);
    }

    await supabase
      .from('rutas_robot')
      .update({ estado: routeRunning ? 'completada' : 'cancelada' })
      .eq('id', routeId);

    routeRunning = false;
    document.getElementById('btnExecuteRoute').disabled = false;
    document.getElementById('btnStopRoute').disabled = true;

    await loadSavedRoutes();
  }

  async function stopRoute() {
    routeRunning = false;
    stopNavigation();

    const routeId = document.getElementById('savedRouteSelect')?.value;

    if (routeId) {
      await supabase
        .from('rutas_robot')
        .update({ estado: 'cancelada' })
        .eq('id', routeId);
    }

    document.getElementById('btnExecuteRoute').disabled = false;
    document.getElementById('btnStopRoute').disabled = true;

    await loadSavedRoutes();
  }


  document.getElementById('btnGoToCoord')?.addEventListener('click', goToCoordinates);
  document.getElementById('btnGoToArea')?.addEventListener('click', goToArea);
  document.getElementById('btnSaveArea')?.addEventListener('click', saveArea);
  document.getElementById('btnDeleteArea')?.addEventListener('click', deleteArea);
  document.getElementById('btnAddRouteStep')?.addEventListener('click', addRouteStep);
  document.getElementById('btnSaveRoute')?.addEventListener('click', saveRoute);
  document.getElementById('btnExecuteRoute')?.addEventListener('click', executeRoute);
  document.getElementById('btnStopRoute')?.addEventListener('click', stopRoute);

  loadSavedRoutes();
  btnStopNav?.addEventListener('click', stopNavigation);

  // Estado inicial: botón detener visible (o manejado por CSS)
  if (btnStopNav) btnStopNav.style.display = 'inline-flex';
});
