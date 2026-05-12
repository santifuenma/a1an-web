-- =============================================
-- A1AN BBDD — Migración a Supabase (PostgreSQL)
-- Ejecutar en: Supabase → SQL Editor → New query
-- =============================================


-- =============================================
-- 1. TABLA USUARIOS (vinculada a auth.users)
-- =============================================
CREATE TABLE public.usuarios (
  id              uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre          varchar(80)  NOT NULL,
  apellidos       varchar(120),
  tipo_identificacion    varchar(30),
  numero_identificacion  varchar(30) UNIQUE,
  email           varchar(120) NOT NULL UNIQUE,
  fecha_nacimiento date,
  created_at      timestamptz  DEFAULT now() NOT NULL,
  updated_at      timestamptz  DEFAULT now() NOT NULL
);

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver propio perfil"
  ON public.usuarios FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Actualizar propio perfil"
  ON public.usuarios FOR UPDATE
  USING (auth.uid() = id);

-- Trigger: crear fila en usuarios al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, nombre, apellidos, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'apellidos', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================
-- 2. TABLA ROBOTS
-- =============================================
CREATE TABLE public.robots (
  id              serial PRIMARY KEY,
  usuario_id      uuid        NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE UNIQUE,
  nombre          varchar(80) NOT NULL,
  modelo          varchar(80) NOT NULL,
  estado          varchar(30) NOT NULL DEFAULT 'inactivo',
  bateria_actual  smallint,
  ultima_conexion timestamptz,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.robots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestionar propio robot"
  ON public.robots FOR ALL
  USING (auth.uid() = usuario_id);


-- =============================================
-- 3. TABLA EJERCICIOS
-- =============================================
CREATE TABLE public.ejercicios (
  id                          serial PRIMARY KEY,
  titulo                      varchar(120) NOT NULL,
  descripcion                 text         NOT NULL,
  zona_cuerpo                 varchar(80),
  nivel                       varchar(20),
  duracion_estimada_min       integer,
  repeticiones_recomendadas   integer,
  tipo_recurso                varchar(20),
  ruta_recurso                varchar(255),
  activo                      boolean NOT NULL DEFAULT true,
  created_at                  timestamptz DEFAULT now() NOT NULL,
  updated_at                  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ejercicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados ven ejercicios"
  ON public.ejercicios FOR SELECT
  TO authenticated
  USING (true);


-- =============================================
-- 4. TABLA RUTINAS
-- =============================================
CREATE TABLE public.rutinas (
  id          serial PRIMARY KEY,
  usuario_id  uuid        NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nombre      varchar(120) NOT NULL,
  descripcion text,
  fecha_inicio date,
  fecha_fin    date,
  activa       boolean NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now() NOT NULL,
  updated_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.rutinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestionar propias rutinas"
  ON public.rutinas FOR ALL
  USING (auth.uid() = usuario_id);


-- =============================================
-- 5. TABLA RUTINA_EJERCICIOS
-- =============================================
CREATE TABLE public.rutina_ejercicios (
  id                    serial PRIMARY KEY,
  rutina_id             integer NOT NULL REFERENCES public.rutinas(id) ON DELETE CASCADE,
  ejercicio_id          integer NOT NULL REFERENCES public.ejercicios(id),
  orden                 integer,
  dia_semana            varchar(15),
  hora_programada       time,
  repeticiones_objetivo integer,
  duracion_objetivo_min integer
);

ALTER TABLE public.rutina_ejercicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestionar ejercicios de propias rutinas"
  ON public.rutina_ejercicios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rutinas r
      WHERE r.id = rutina_id AND r.usuario_id = auth.uid()
    )
  );


-- =============================================
-- 6. TABLA SESIONES_EJERCICIO
-- =============================================
CREATE TABLE public.sesiones_ejercicio (
  id                      serial PRIMARY KEY,
  usuario_id              uuid    NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  robot_id                integer NOT NULL REFERENCES public.robots(id),
  ejercicio_id            integer NOT NULL REFERENCES public.ejercicios(id),
  rutina_id               integer REFERENCES public.rutinas(id),
  fecha_hora_inicio       timestamptz NOT NULL,
  fecha_hora_fin          timestamptz,
  estado                  varchar(20) NOT NULL,
  repeticiones_realizadas integer,
  duracion_real_min       integer,
  observaciones           text,
  created_at              timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.sesiones_ejercicio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestionar propias sesiones"
  ON public.sesiones_ejercicio FOR ALL
  USING (auth.uid() = usuario_id);


-- =============================================
-- 7. TABLA EVENTOS_ROBOT
-- =============================================
CREATE TABLE public.eventos_robot (
  id          serial PRIMARY KEY,
  robot_id    integer NOT NULL REFERENCES public.robots(id),
  usuario_id  uuid REFERENCES public.usuarios(id),
  tipo_evento varchar(40) NOT NULL,
  descripcion text,
  fecha_hora  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.eventos_robot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver eventos del propio robot"
  ON public.eventos_robot FOR ALL
  USING (auth.uid() = usuario_id);


-- =============================================
-- 8. TABLA NOTIFICACIONES
-- =============================================
CREATE TABLE public.notificaciones (
  id               serial PRIMARY KEY,
  usuario_id       uuid    NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  robot_id         integer REFERENCES public.robots(id),
  titulo           varchar(120) NOT NULL,
  mensaje          text NOT NULL,
  tipo             varchar(20) NOT NULL,
  leida            boolean NOT NULL DEFAULT false,
  fecha_hora_envio timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestionar propias notificaciones"
  ON public.notificaciones FOR ALL
  USING (auth.uid() = usuario_id);


-- =============================================
-- 9. TABLA AREAS_MAPA
-- =============================================
CREATE TABLE public.areas_mapa (
  id                  serial PRIMARY KEY,
  usuario_id          uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nombre              varchar(80) NOT NULL,
  descripcion         varchar(255),
  coordenada_x        decimal(8,3) NOT NULL,
  coordenada_y        decimal(8,3) NOT NULL,
  orientacion_theta   decimal(8,3),
  activa              boolean NOT NULL DEFAULT true,
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.areas_mapa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestionar propias áreas de mapa"
  ON public.areas_mapa FOR ALL
  USING (auth.uid() = usuario_id);
