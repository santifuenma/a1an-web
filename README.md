# A1AN Web — Safe&Sound Robotics

Plataforma web del proyecto A1AN, un robot asistencial orientado a personas con movilidad reducida, diseñado para acompañar en ejercicios de rehabilitación funcional, localización de objetos y seguimiento de actividad en el hogar.

🌐 **Producción**: [a1an-web.vercel.app](https://a1an-web.vercel.app)

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5, CSS3, JavaScript ES6+ (Vanilla) |
| Auth & Base de datos | [Supabase](https://supabase.com) (PostgreSQL + Auth) |
| Robot | ROS 2, ROSBridge, roslibjs, web_video_server |
| Despliegue | [Vercel](https://vercel.com) |
| Fuente | [Inter](https://fonts.google.com/specimen/Inter) vía Google Fonts |

> No se utilizan React, Vue, Angular, Tailwind, Bootstrap ni ningún framework frontend.

---

## Estructura del proyecto

```
a1an-web/
├── index.html              Landing page pública
├── 404.html                Página de error personalizada
├── vercel.json             Configuración de Vercel (seguridad, caché, redirects)
├── .gitignore
│
├── pages/                  Páginas privadas de la app (requieren sesión)
│   ├── login.html
│   ├── register.html
│   ├── recover.html
│   ├── dashboard.html
│   ├── robot.html
│   ├── exercises.html
│   ├── activity.html
│   ├── notifications.html
│   ├── profile.html
│   └── support.html
│
├── css/
│   ├── styles.css          Variables, reset, componentes globales, landing
│   ├── auth.css            Formularios de autenticación
│   ├── dashboard.css       Sidebar, widgets, modales, loader, zona privada
│   └── responsive.css      Media queries (1024px, 768px, 480px)
│
├── js/
│   ├── supabase-client.js  Inicialización del cliente Supabase
│   ├── auth.js             Login, registro, recuperación y reset de contraseña
│   ├── dashboard.js        Sesión, sidebar, loader, logout modal, vinculación robot
│   ├── rosbridge.js        Conexión ROSBridge y control manual del TurtleBot
│   ├── robot.js            Control del robot: on/off, batería, diagnóstico
│   ├── notifications.js    Renderizado, filtros, marcar como leída
│   └── main.js             Landing: scroll, menú, animaciones
│
├── assets/
│   └── logo.png
│
└── bbdd/                   Scripts SQL (no accesibles públicamente)
    ├── supabase_migration.sql   Esquema completo con RLS y triggers
    └── A1AN_BBDD.sql            Esquema de referencia original
```

---

## Autenticación y base de datos

La autenticación está implementada con **Supabase Auth** (email/password). No hay backend propio.

### Flujo de auth
1. **Registro** → `supabase.auth.signUp()` → trigger crea fila en `public.usuarios`
2. **Login** → `supabase.auth.signInWithPassword()`
3. **Recuperación** → email con link a `/pages/recover.html`
4. **Sesión** → verificada en cada página privada con `supabase.auth.getSession()`
5. **Logout** → `supabase.auth.signOut()` (con popup de confirmación)

### Base de datos (PostgreSQL)
Gestionada en Supabase con **Row Level Security (RLS)** activado en todas las tablas.

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Perfil del usuario, sincronizado con `auth.users` via trigger |
| `robots` | Robots vinculados por usuario |
| `ejercicios` | Biblioteca de ejercicios |
| `rutinas` | Rutinas asignadas |
| `sesiones_ejercicio` | Historial de sesiones |
| `actividad` | Registro de eventos del robot |
| `notificaciones` | Alertas y notificaciones |

> El script de migración completo está en `bbdd/supabase_migration.sql`.

---

## Cómo ejecutar en local

No se requiere Node.js ni proceso de build. Sirve como sitio estático.

```bash
# Con Live Server (VS Code) o cualquier servidor HTTP estático
npx serve .
# o simplemente abrir index.html en el navegador
```

> **Nota**: las rutas absolutas (`/pages/login.html`, `/css/styles.css`) requieren un servidor HTTP. No funcionarán abriendo los archivos directamente con `file://`.

---

## Cámara y control ROS 2 en local

El dashboard incluye un panel de cámara en vivo, detección de objetos y controles manuales para el TurtleBot. La imagen de cámara no se recibe por ROSBridge: se muestra como stream MJPEG servido por `web_video_server`.

La vista normal usa el topic `/camera/image_raw`. Al activar el botón de detección en el panel de cámara, la web cambia al stream procesado `/a1an_vision/debug_image`, que incluye las bounding boxes generadas en ROS.

Antes de abrir la web, deben estar ejecutándose la simulación, ROSBridge y el servidor de vídeo:

```bash
cd ~/turtlebot3_ws
source install/setup.bash
export TURTLEBOT3_MODEL=burger_cam
ros2 launch a1an_world a1an_world.launch.py
```

```bash
cd ~/turtlebot3_ws
source install/setup.bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```

```bash
cd ~/turtlebot3_ws
source install/setup.bash
ros2 run web_video_server web_video_server --ros-args -p port:=8081
```

Comprobación directa del stream:

```text
http://localhost:8081/snapshot?topic=/camera/image_raw
http://localhost:8081/stream?topic=/camera/image_raw&type=mjpeg
http://localhost:8081/stream?topic=/a1an_vision/debug_image&type=mjpeg
```

Además, al conectar ROSBridge, la web se suscribe al topic `/a1an_vision/detected_objects` (`std_msgs/String`). El campo `data` contiene un JSON con el último estado de detección, incluyendo etiqueta, confianza y posición.

Después se puede servir la web desde la raíz del repositorio:

```bash
python3 -m http.server 8000
```

Y abrir:

```text
http://localhost:8000/pages/dashboard.html
```

Si se accede desde otro equipo de la misma red, `localhost` apunta al equipo del navegador. En ese caso hay que usar la IP del ordenador que ejecuta ROS/Gazebo:

```text
Web:        http://IP_DEL_PC_WEB:8000/pages/dashboard.html
Cámara:     http://IP_DEL_PC_ROS:8081/stream?topic=/camera/image_raw&type=mjpeg
Detección:  http://IP_DEL_PC_ROS:8081/stream?topic=/a1an_vision/debug_image&type=mjpeg
ROSBridge:  ws://IP_DEL_PC_ROS:9090
```

La URL de cámara se configura en `js/dashboard.js` con `CAMERA_STREAM_HOST`.

---

## Variables de entorno / Configuración

Las credenciales de Supabase están en `js/supabase-client.js`:

```js
const SUPABASE_URL  = 'https://<project-id>.supabase.co';
const SUPABASE_ANON = '<anon-key>';
```

> La `anon key` es pública por diseño (Supabase la expone en el cliente). La seguridad de los datos está garantizada por las políticas **RLS** en PostgreSQL.

---

## Despliegue (Vercel)

El proyecto se despliega automáticamente desde la rama `main` de GitHub.

`vercel.json` configura:
- `cleanUrls: true` → `/pages/login.html` accesible como `/pages/login`
- Cabeceras de seguridad: `X-Frame-Options`, `X-Content-Type-Options`, CSP básico
- Caché de 1 año para CSS y assets; `no-cache` para JS (siempre descarga la versión más reciente)
- Redirect de `/bbdd/*` → `/` (los SQL nunca son accesibles)

---

## Funcionalidades

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| Auth (login/registro/recover) | ✅ Real | Supabase Auth |
| Protección de rutas | ✅ Real | `getSession()` en cada página privada |
| Perfil (editar datos) | ✅ Real | Escribe en tabla `usuarios` + `auth.updateUser` |
| Cambiar contraseña | ✅ Real | `supabase.auth.updateUser({ password })` |
| Vinculación de robot | ✅ Real | Persiste en tabla `robots` |
| Control manual ROSBridge | 🟡 Local | Publica comandos al robot mediante `ws://localhost:9090` |
| Cámara ROS 2 | 🟡 Local | Muestra `/camera/image_raw` mediante `web_video_server` |
| Detección de objetos | 🟡 Local | Alterna el stream `/a1an_vision/debug_image` y lee `/a1an_vision/detected_objects` |
| Popup de logout | ✅ | Confirmación antes de cerrar sesión |
| Loader de página | ✅ | Spinner mientras se verifica la sesión |
| Página 404 | ✅ | Diseño personalizado con la marca A1AN |
| Dashboard, Robot, Ejercicios... | 🟡 UI | Interfaces listas, lógica pendiente de conectar con BBDD |

---

## Paleta de colores

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-primary` | `#1d3253` | Azul oscuro, sidebar |
| `--color-secondary` | `#2a5c92` | Azul medio |
| `--color-accent` | `#53b2b8` | Turquesa, CTAs |
| `--color-bg` | `#f5f7fa` | Fondo claro |
| `--color-danger` | `#ef4444` | Errores, logout |
| `--color-success` | `#10b981` | Confirmaciones |

---

## Proyecto

**Safe&Sound Robotics** — Proyecto universitario de robótica asistencial.  
**A1AN** — Robot de asistencia y rehabilitación para personas con movilidad reducida.
