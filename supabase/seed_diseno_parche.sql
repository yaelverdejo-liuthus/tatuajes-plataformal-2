-- ═══════════════════════════════════════════════════════════════════════
--  PARCHE de un solo uso, para la base que YA tiene `seed_diseno.sql`.
--
--  Hace dos cosas:
--
--   1. Sube el perfil a admin, que es lo que hace visible Ajustes. Sin
--      esto, la pantalla de Ajustes no se puede ni abrir ni rediseñar.
--
--   2. Mete 24 leads más.
--
--  ── Por qué hacían falta más leads ───────────────────────────────────
--
--  Con 10 leads y 11 trabajos, el Tablero mostraba una TASA DE CIERRE del
--  110%, que además de imposible tapaba el problema real: la vista
--  `v_dashboard` no define "conversaciones" como las conversaciones de la
--  pauta, sino como `count(*) from leads`; y "agendados" no son los leads
--  agendados, sino TODOS los trabajos no cancelados.
--
--      tasa de cierre = trabajos vivos / leads
--
--  O sea que para que el embudo tenga sentido tiene que haber bastantes
--  más leads que trabajos, que es como funciona un estudio de verdad: la
--  mayoría pregunta, cotiza y no vuelve. Un seed con tantos trabajos como
--  leads describe un negocio donde cierra todo el mundo.
--
--  Con estos 24, quedan 34 leads contra 11 trabajos: 32% de cierre, que
--  cae en VERDE, y el costo por conversación baja de $193 a unos $57, que
--  cae en ÁMBAR. Los dos dejan de mentir y de paso el Tablero termina con
--  los tres colores repartidos.
--
--  Y la lista de Leads pasa a tener 34 filas, que es lo que hace falta
--  para juzgar densidad, orden y scroll — con 10 no se ve ninguno de los
--  tres problemas.
--
--  Ya está incorporado a `seed_diseno.sql`; este archivo existe solo para
--  no tener que vaciar y recargar la base. Se puede borrar después.
--
--  OJO: los leads NO son idempotentes. Si ya corriste este archivo una vez,
--  corre solo el bloque del rol; volver a correrlo entero mete los 24 leads
--  otra vez y desbalancea el embudo.
--
--  NO CORRER EN PRODUCCIÓN.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Subir el perfil a admin ───────────────────────────────────────────
--
-- Un `update` a secas NO funciona, y falla en silencio: reporta éxito y no
-- cambia nada. El motivo es el trigger `profiles_solo_nombre_y_foto` de la
-- migración 0013, que en cada UPDATE hace `new.rol := old.rol`.
--
-- Es un candado a propósito y está bien puesto: es lo que impide que
-- alguien se ascienda a sí mismo a admin editando su perfil desde la app.
-- La política RLS deja escribir la fila propia, así que sin el trigger
-- bastaría un PATCH a /rest/v1/profiles para volverse admin.
--
-- Por eso cambiar un rol es una operación deliberada de fuera de banda:
-- hay que desactivar el candado, cambiarlo y volver a ponerlo.
--
-- Va en una transacción para que el candado quede puesto pase lo que pase.
-- Si el update falla a medias, el rollback también revierte el DISABLE.

begin;
alter table public.profiles disable trigger profiles_solo_nombre_y_foto;

update public.profiles
   set rol = 'admin'
 where id = 'e6c4f7ff-a34c-4d47-9a95-3aba5c45fb5d';

alter table public.profiles enable trigger profiles_solo_nombre_y_foto;
commit;


-- Reparto: 8 nuevos, 6 cotizados y 10 perdidos. Ningún agendado — esos ya
-- están arriba y cada uno tiene su trabajo. La forma de la pirámide es el
-- dato: muchos preguntan, pocos cotizan, poquísimos se agendan.
--
-- Los perdidos llevan motivo escrito. Es la columna que convierte una
-- lista de fracasos en información: "le pareció caro" diez veces seguidas
-- dice algo que ningún KPI del tablero dice.

insert into leads (fecha, nombre, whatsapp, origen, que_pidio, nivel_estimado,
                   estatus, monto_cotizado, cotizado_en, anticipo, zona,
                   siguiente_accion, fecha_seguimiento, motivo_perdida)
values
  -- ── Nuevos: entraron y todavía no se cotizan ────────────────────────
  (current_date - 1,  'Alondra Vega',                    '3142020304', 'tiktok',
   'Mariposa en la clavícula', '1', 'nuevo', null, null, 0, 'Clavícula',
   'Cotizar', current_date + 2, null),
  (current_date - 1,  'Ximena Robles Portillo',          '3142030405', 'meta',
   'Frase larga en el costado, quiere ver tipografías', '2', 'nuevo', null, null, 0, 'Costillas',
   'Mandar 3 tipografías', current_date + 1, null),
  (current_date - 2,  'Néstor',                          '3142040506', 'organico',
   'Cover-up de un tatuaje viejo', '3', 'nuevo', null, null, 0, 'Antebrazo',
   'Pedir foto del tatuaje actual', current_date + 3, null),
  (current_date - 2,  'Brenda Calderón',                 '3142050607', 'tiktok',
   'Set de tres chiquitos', '1', 'nuevo', null, null, 0, 'Muñeca', 'Cotizar', current_date + 2, null),
  (current_date - 3,  'Iván Zepeda',                     '3142060708', 'referido',
   'Retrato de su perro', '3', 'nuevo', null, null, 0, 'Pantorrilla',
   'Pedir la foto en buena calidad', current_date + 4, null),
  (current_date - 3,  'Dulce María Herrera Quintanilla', '3142070809', 'meta',
   'Nombre de sus dos hijas con fecha', '2', 'nuevo', null, null, 0, 'Antebrazo',
   'Confirmar si van juntos o separados', current_date + 1, null),
  (current_date - 4,  'Emiliano',                        '3142080910', 'conocido',
   'Continuar la manga que empezó otro', '3', 'nuevo', null, null, 0, 'Brazo',
   'Verlo en persona', current_date + 6, null),
  (current_date - 5,  'Tania G.',                        '3142091011', 'tiktok',
   'Línea fina, flor', '1', 'nuevo', null, null, 0, 'Tobillo', 'Cotizar', current_date + 2, null),

  -- ── Cotizados: ya tienen precio y están decidiendo ──────────────────
  (current_date - 4,  'Rodrigo Alcántara',   '3142101112', 'meta',
   'Lettering en el pecho', '2', 'cotizado', 2400, current_date - 3, 0, 'Pecho',
   'Le dije que el pecho duele. Confirmar si sigue.', current_date + 3, null),
  (current_date - 6,  'Melissa Fuentes',     '3142111213', 'tiktok',
   'Rosa sombreada en el hombro', '2', 'cotizado', 1900, current_date - 5, 0, 'Hombro',
   'Mandar horarios de la otra semana', current_date + 1, null),
  (current_date - 7,  'Óscar Palencia',      '3142121314', 'organico',
   'Composición gótica antebrazo completo', '3', 'cotizado', 5600, current_date - 6, 0, 'Antebrazo',
   'Preguntó si se puede en pagos', current_date + 2, null),
  (current_date - 8,  'Ana Karen',           '3142131415', 'meta',
   'Fecha romana', '1', 'cotizado', 700, current_date - 8, 0, 'Muñeca',
   'Ya no contestó el último mensaje', current_date + 4, null),
  (current_date - 9,  'Jonathan Espinoza Madrigal', '3142141516', 'referido',
   'Manga cerrada, tres sesiones', '3', 'cotizado', 6800, current_date - 8, 0, 'Brazo',
   'Quiere empezar en enero', current_date + 7, null),
  (current_date - 10, 'Priscila',            '3142151617', 'tiktok',
   'Dos chiquitos atrás de la oreja', '1', 'cotizado', 900, current_date - 9, 0, 'Cuello',
   'Dijo que lo piensa', current_date + 5, null),

  -- ── Perdidos: la mitad del embudo, y la que más enseña ──────────────
  (current_date - 12, 'Sergio Domínguez',    '3142161718', 'meta',
   'Retrato realista', '3', 'perdido', 5200, current_date - 11, 0, 'Antebrazo',
   null, null, 'Le pareció caro.'),
  (current_date - 13, 'Nayeli',              '3142171819', 'tiktok',
   'Frase en el brazo', '1', 'perdido', 800, current_date - 13, 0, 'Brazo',
   null, null, 'Encontró a alguien más barato.'),
  (current_date - 15, 'Gustavo Iñiguez',     '3142181920', 'meta',
   'Cover-up grande', '3', 'perdido', 4400, current_date - 14, 0, 'Espalda',
   null, null, 'No le gustó que hubiera que ir tres veces.'),
  (current_date - 16, 'Alejandra Moreno Salcedo', '3142192021', 'organico',
   'Lettering fino', '2', 'perdido', 1600, current_date - 15, 0, 'Antebrazo',
   null, null, 'Dejó de contestar después de la cotización.'),
  (current_date - 17, 'Christian',           '3142202122', 'tiktok',
   'Tribal', '2', 'perdido', null, null, 0, 'Hombro',
   null, null, 'No hago tribal. Lo mandé con alguien más.'),
  (current_date - 18, 'Verónica Landeros',   '3142212223', 'meta',
   'Nombre de su mamá', '1', 'perdido', 700, current_date - 18, 0, 'Muñeca',
   null, null, 'Se arrepintió, dijo que mejor después.'),
  (current_date - 20, 'Ricardo Beltrán',     '3142222324', 'referido',
   'Manga completa', '3', 'perdido', 7200, current_date - 19, 0, 'Brazo',
   null, null, 'Le pareció caro. Quería todo en una sesión.'),
  (current_date - 21, 'Fátima',              '3142232425', 'tiktok',
   'Chiquito en el dedo', '1', 'perdido', null, null, 0, 'Mano',
   null, null, 'En el dedo no aguanta. Se lo expliqué y ya no quiso.'),
  (current_date - 23, 'Mauricio Villagómez Rentería', '3142242526', 'meta',
   'Composición en el cuello', '3', 'perdido', 4200, current_date - 22, 0, 'Cuello',
   null, null, 'Su trabajo no le permite tatuajes visibles.'),
  (current_date - 25, 'Lizbeth',             '3142252627', 'organico',
   'Set de estrellas', '1', 'perdido', 950, current_date - 24, 0, 'Hombro',
   null, null, 'Nunca confirmó la cita.');
