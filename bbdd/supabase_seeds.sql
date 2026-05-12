-- =============================================
-- A1AN BBDD — Datos demo (seeds)
-- =============================================
-- INSTRUCCIONES:
-- 1. Crea un usuario de prueba en Supabase Dashboard:
--      Authentication → Users → "Add user" (email + password)
--    El trigger on_auth_user_created creará automáticamente la fila
--    en public.usuarios con su nombre/apellidos extraídos de raw_user_meta_data.
-- 2. Copia el UUID del usuario (columna "id" en auth.users o en public.usuarios).
-- 3. Pega el UUID abajo, en v_user_id, y ejecuta este script completo.
-- 4. Inicia sesión con ese usuario en la web → las 3 páginas leerán sus datos.
-- =============================================

DO $$
DECLARE
  -- ↓↓↓ PEGA AQUÍ EL UUID DEL USUARIO DE PRUEBA ↓↓↓
  v_user_id uuid := 'PASTE_USER_UUID_HERE';

  v_robot_id  int;
  v_rutina_id int;
  v_ej_hombro      int;
  v_ej_rodilla     int;
  v_ej_muneca      int;
  v_ej_core        int;
  v_ej_equilibrio  int;
  v_ej_tobillo     int;
BEGIN
  IF v_user_id::text = 'PASTE_USER_UUID_HERE' THEN
    RAISE EXCEPTION 'Reemplaza v_user_id por el UUID real del usuario de prueba.';
  END IF;

  -- Asegura que la fila en public.usuarios existe (por si no se ejecutó el trigger)
  INSERT INTO public.usuarios (id, nombre, apellidos, email)
  SELECT v_user_id, 'Alejandro', 'Demo', email
  FROM auth.users WHERE id = v_user_id
  ON CONFLICT (id) DO NOTHING;

  -- ============================================
  -- 1. EJERCICIOS (biblioteca maestra, sin usuario)
  -- ============================================
  INSERT INTO public.ejercicios (titulo, descripcion, zona_cuerpo, nivel, duracion_estimada_min, repeticiones_recomendadas, activo)
  VALUES
    ('Movilidad de hombro',     'Ejercicio de elevación y rotación del hombro para mejorar el rango de movimiento articular.', 'hombro',  'medio',   15, 10, true),
    ('Flexión de rodilla',      'Ejercicio controlado de flexión y extensión de rodilla para fortalecer la articulación.',     'rodilla', 'facil',   20, 12, true),
    ('Extensión de muñeca',     'Ejercicio de extensión y flexión de muñeca para recuperar movilidad fina.',                   'muneca',  'facil',   10, 15, true),
    ('Fortalecimiento de core', 'Rutina de estabilización del tronco con ejercicios isométricos adaptados.',                   'core',    'dificil', 25,  8, true),
    ('Equilibrio estático',     'Práctica de equilibrio con apoyo para mejorar la estabilidad postural.',                      'general', 'medio',   12,  6, true),
    ('Movilidad de tobillo',    'Ejercicios de dorsiflexión y plantiflexión para recuperar movilidad del tobillo.',            'tobillo', 'facil',   10, 12, true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_ej_hombro     FROM public.ejercicios WHERE titulo = 'Movilidad de hombro'     LIMIT 1;
  SELECT id INTO v_ej_rodilla    FROM public.ejercicios WHERE titulo = 'Flexión de rodilla'      LIMIT 1;
  SELECT id INTO v_ej_muneca     FROM public.ejercicios WHERE titulo = 'Extensión de muñeca'     LIMIT 1;
  SELECT id INTO v_ej_core       FROM public.ejercicios WHERE titulo = 'Fortalecimiento de core' LIMIT 1;
  SELECT id INTO v_ej_equilibrio FROM public.ejercicios WHERE titulo = 'Equilibrio estático'     LIMIT 1;
  SELECT id INTO v_ej_tobillo    FROM public.ejercicios WHERE titulo = 'Movilidad de tobillo'    LIMIT 1;

  -- ============================================
  -- 2. ROBOT del usuario (1 por paciente)
  -- ============================================
  INSERT INTO public.robots (usuario_id, nombre, modelo, estado, bateria_actual, ultima_conexion)
  VALUES (v_user_id, 'A1AN', 'A1AN-7F3K-9X2P', 'encendido', 78, now())
  ON CONFLICT (usuario_id) DO UPDATE
    SET estado = EXCLUDED.estado, bateria_actual = EXCLUDED.bateria_actual, ultima_conexion = EXCLUDED.ultima_conexion
  RETURNING id INTO v_robot_id;

  IF v_robot_id IS NULL THEN
    SELECT id INTO v_robot_id FROM public.robots WHERE usuario_id = v_user_id;
  END IF;

  -- ============================================
  -- 3. RUTINA activa del usuario
  -- ============================================
  INSERT INTO public.rutinas (usuario_id, nombre, descripcion, fecha_inicio, activa)
  VALUES (v_user_id, 'Rutina semanal de rehabilitación', 'Plan personalizado a 7 días', current_date, true)
  RETURNING id INTO v_rutina_id;

  -- ============================================
  -- 4. RUTINA_EJERCICIOS (planificación semanal)
  -- dia_semana: 'lunes', 'martes', ... (varchar 15)
  -- ============================================
  INSERT INTO public.rutina_ejercicios (rutina_id, ejercicio_id, orden, dia_semana, hora_programada, duracion_objetivo_min) VALUES
    (v_rutina_id, v_ej_hombro,     1, 'lunes',     '09:00', 15),
    (v_rutina_id, v_ej_rodilla,    2, 'lunes',     '16:00', 20),
    (v_rutina_id, v_ej_muneca,     1, 'martes',    '10:00', 10),
    (v_rutina_id, v_ej_hombro,     1, 'miercoles', '09:00', 15),
    (v_rutina_id, v_ej_core,       2, 'miercoles', '11:00', 25),
    (v_rutina_id, v_ej_rodilla,    1, 'jueves',    '16:00', 20),
    (v_rutina_id, v_ej_equilibrio, 1, 'viernes',   '10:00', 12),
    (v_rutina_id, v_ej_tobillo,    2, 'viernes',   '12:00', 10),
    (v_rutina_id, v_ej_hombro,     1, 'sabado',    '10:00', 15);

  -- ============================================
  -- 5. SESIONES_EJERCICIO (historial)
  -- ============================================
  INSERT INTO public.sesiones_ejercicio (usuario_id, robot_id, ejercicio_id, rutina_id, fecha_hora_inicio, fecha_hora_fin, estado, duracion_real_min) VALUES
    (v_user_id, v_robot_id, v_ej_hombro,     v_rutina_id, now() - interval '0 days 4 hour',  now() - interval '0 days 4 hour' + interval '14 min', 'completado',   14),
    (v_user_id, v_robot_id, v_ej_rodilla,    v_rutina_id, now() - interval '1 days 6 hour',  now() - interval '1 days 6 hour' + interval '18 min', 'completado',   18),
    (v_user_id, v_robot_id, v_ej_muneca,     v_rutina_id, now() - interval '1 days 14 hour', now() - interval '1 days 14 hour' + interval '10 min', 'completado',   10),
    (v_user_id, v_robot_id, v_ej_core,       v_rutina_id, now() - interval '2 days 7 hour',  now() - interval '2 days 7 hour'  + interval '12 min', 'interrumpido', 12),
    (v_user_id, v_robot_id, v_ej_hombro,     v_rutina_id, now() - interval '2 days 14 hour', now() - interval '2 days 14 hour' + interval '15 min', 'completado',   15),
    (v_user_id, v_robot_id, v_ej_equilibrio, v_rutina_id, now() - interval '3 days 12 hour', now() - interval '3 days 12 hour' + interval '11 min', 'completado',   11);

  -- ============================================
  -- 6. EVENTOS_ROBOT (para la página de Actividad)
  -- tipo_evento: 'encendido' | 'apagado' | 'sincronizacion' (no se muestra al paciente)
  --              | 'bateria' (asociado a aviso) | 'firmware' (técnico, no se muestra)
  -- ============================================
  INSERT INTO public.eventos_robot (robot_id, usuario_id, tipo_evento, descripcion, fecha_hora) VALUES
    (v_robot_id, v_user_id, 'encendido',      'Tu robot A1AN se ha iniciado correctamente',                                                now() - interval '0 days 10 hour'),
    (v_robot_id, v_user_id, 'apagado',        'Apagado automático tras finalizar la sesión',                                               now() - interval '1 days'),
    (v_robot_id, v_user_id, 'encendido',      'Inicio manual del dispositivo',                                                             now() - interval '1 days 10 hour'),
    (v_robot_id, v_user_id, 'sincronizacion', 'Datos actualizados correctamente con el servidor',                                          now() - interval '2 days 16 hour'),
    (v_robot_id, v_user_id, 'firmware',       'Comprobación de firmware completada — versión v2.4.1',                                      now() - interval '2 days 18 hour');

  -- ============================================
  -- 7. NOTIFICACIONES (avisos al paciente)
  -- tipo: 'aviso' | 'bateria' (los técnicos se filtran en UI por descripcion/tipo)
  -- ============================================
  INSERT INTO public.notificaciones (usuario_id, robot_id, titulo, mensaje, tipo, leida, fecha_hora_envio) VALUES
    (v_user_id, v_robot_id, 'Batería baja',             'El nivel de batería ha descendido por debajo del 20%. Te recomendamos cargar el robot.', 'bateria', false, now() - interval '1 days 14 hour'),
    (v_user_id, v_robot_id, 'Carga completa',           'Tu robot está cargado al 100%',                                                            'bateria', true,  now() - interval '2 days 15 hour'),
    (v_user_id, v_robot_id, 'Ejercicio interrumpido',   'Fortalecimiento de core: detenido a los 12 min. Vuelve a intentarlo cuando estés listo.', 'aviso',   true,  now() - interval '2 days 7 hour'),
    (v_user_id, v_robot_id, 'Recordatorio de rutina',   'Hoy tenías 2 ejercicios pendientes en tu plan diario',                                    'aviso',   true,  now() - interval '3 days 6 hour');

  RAISE NOTICE '✓ Seeds cargados. Robot id: %, Rutina id: %', v_robot_id, v_rutina_id;
END $$;

-- =============================================
-- VERIFICACIÓN (ejecutar después, por separado):
-- =============================================
-- SELECT count(*) AS ejercicios FROM public.ejercicios;
-- SELECT count(*) AS robots, count(*) FILTER (WHERE usuario_id IS NOT NULL) AS con_usuario FROM public.robots;
-- SELECT count(*) AS sesiones FROM public.sesiones_ejercicio;
-- SELECT count(*) AS eventos FROM public.eventos_robot;
-- SELECT count(*) AS notificaciones FROM public.notificaciones;
