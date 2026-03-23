# A1AN Web — Safe&Sound Robotics

Plataforma web del proyecto A1AN, un robot asistencial orientado a personas con movilidad reducida, diseñado para acompañar en ejercicios de rehabilitación funcional, localización de objetos y seguimiento de actividad en el hogar.

## Tecnologías

- **HTML5** — Estructura semántica
- **CSS3** — Custom Properties, Grid, Flexbox, animaciones
- **JavaScript (ES6+)** — Vanilla, sin frameworks

No se utilizan React, Vue, Angular, Tailwind, Bootstrap ni ningún framework.

## Estructura del proyecto

```
├── index.html              Landing page pública
├── login.html              Inicio de sesión
├── register.html           Registro de usuario
├── recover.html            Recuperación de contraseña
├── dashboard.html          Panel de control principal
├── robot.html              Gestión del robot A1AN
├── exercises.html          Ejercicios de rehabilitación
├── activity.html           Registro de actividad
├── notifications.html      Centro de notificaciones
├── profile.html            Perfil de usuario
├── support.html            Ayuda y soporte
│
├── css/
│   ├── styles.css          Estilos globales, variables, componentes, landing
│   ├── auth.css            Estilos de autenticación y modal de vinculación
│   ├── dashboard.css       Sidebar, widgets, tablas, zona privada
│   └── responsive.css      Media queries (1024px, 768px, 480px)
│
├── js/
│   ├── main.js             Landing: scroll, menú, animaciones, formulario
│   ├── auth.js             Login, registro, recuperación, validación
│   ├── dashboard.js        Sesión, sidebar, datos del panel, vinculación robot
│   ├── robot.js            Control del robot: on/off, batería, diagnóstico
│   └── notifications.js    Renderizado, filtros, marcar como leída
│
└── assets/
    ├── logo.png            Logo de Safe&Sound Robotics
    ├── icons/
    └── images/
```

## Cómo usar

1. Abre `index.html` en un navegador (doble clic o servidor local).
2. Navega por la landing page pública.
3. Pulsa **Registro** para crear una cuenta (datos almacenados en `localStorage`).
4. Inicia sesión con el correo registrado (cualquier contraseña funciona).
5. En el primer acceso se mostrará el diálogo de **vinculación del robot** (introduce un ID como `A1AN-1234-5678` o simula el escaneo QR).
6. Explora el panel de control: dashboard, robot, ejercicios, actividad, notificaciones, perfil y ayuda.

## Paleta de colores

| Color         | Hex       | Uso                       |
|---------------|-----------|---------------------------|
| Primario      | `#1d3253` | Azul oscuro               |
| Secundario    | `#2a5c92` | Azul claro                |
| Acento        | `#53b2b8` | Turquesa                  |
| Blanco        | `#ffffff` | Fondos                    |
| Fondo claro   | `#f5f7fa` | Secciones alternas        |
| Texto         | `#1f2937` | Texto principal           |
| Gris          | `#6b7280` | Texto secundario          |

## Funcionalidades simuladas

- **Autenticación**: login, registro y recuperación de contraseña con validación y `localStorage`.
- **Vinculación del robot**: modal con entrada de ID o escaneo QR simulado.
- **Dashboard**: widgets con estado del robot, batería, conexión, actividad y alertas.
- **Robot**: encender/apagar, drenaje de batería simulado, sincronización, diagnóstico.
- **Ejercicios**: biblioteca de ejercicios, creación de rutinas, planificación semanal, historial.
- **Actividad**: registro cronológico de eventos.
- **Notificaciones**: filtros por tipo, marcar como leída, contador de no leídas.
- **Perfil**: edición de datos personales y cambio de contraseña.
- **Ayuda**: FAQ con acordeón, formulario de contacto técnico y reporte de errores.

## Notas

- No requiere backend ni base de datos. Toda la persistencia es en `localStorage` del navegador.
- Compatible con Chrome, Firefox, Edge y Safari modernos.
- Diseño responsive para escritorio, tablet y móvil.
- Fuente: [Inter](https://fonts.google.com/specimen/Inter) vía Google Fonts.

## Proyecto

**Safe&Sound Robotics** — Proyecto universitario de robótica asistencial.
**A1AN** — Robot de asistencia y rehabilitación para personas con movilidad reducida.
