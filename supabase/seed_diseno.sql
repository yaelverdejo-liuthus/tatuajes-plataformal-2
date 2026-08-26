-- ═══════════════════════════════════════════════════════════════════════
--  Datos SINTÉTICOS para el pase de diseño. No son reales.
--
--  `seed_ejemplo.sql` existe para otra cosa: son las filas azules del Excel
--  y sirven para comprobar que los cálculos cuadran. Una fila por tabla.
--  Con eso no se puede diseñar: una lista de un elemento no dice nada sobre
--  densidad, ni sobre qué pasa cuando un nombre es largo, ni sobre cómo se
--  ven tres semáforos distintos uno junto al otro.
--
--  Esto llena las mismas tablas con volumen y con VARIEDAD deliberada:
--
--   · Los tres colores de semáforo aparecen a la vez en el Tablero.
--   · "Requiere tu atención" tiene entradas de los cinco tipos.
--   · Hay nombres largos, nombres cortos y textos que desbordan.
--   · Hay filas en todos los estatus, incluidos los feos (perdido,
--     cancelado, sin anticipo, retoque pendiente).
--   · La pauta tiene diez días de gasto para que la gráfica sea una curva
--     y no dos puntos.
--
--  Las fechas son relativas a CURRENT_DATE, así que el seguimiento vencido
--  sigue estando vencido dentro de un mes.
--
--  Para borrarlo: Ajustes → "Vaciar datos de la plataforma". Respeta el
--  catálogo y los umbrales.
--
--  NO CORRER EN PRODUCCIÓN.
-- ═══════════════════════════════════════════════════════════════════════


-- ── Catálogo ──────────────────────────────────────────────────────────
-- Seis diseños más sobre los tres que ya trae la migración 0002. Mezcla
-- deliberada: los tres niveles, las tres autorías, publicados y sin
-- publicar, y varios sin imagen para ver la trama de stencil.
--
-- 'Mano' obliga a retoque_incluido = true (constraint mano_requiere_retoque).

insert into catalogo (id, nombre, nivel, tipografia, tamano_cm, zona_recomendada,
                      precio_base, autoria, retoque_incluido,
                      tiempo_diseno_estimado_min, publicado, notas)
values
  ('N1-02', 'Fecha romana',              '1', 'Trajan',     '8 x 2',  'Muñeca',    700,  'propio',     false, 25,  true,
   'La venta de entrada. Se traza en una sesión.'),
  ('N1-03', 'Línea fina minimalista',    '1', null,         '6 x 6',  'Tobillo',   850,  'propio',     false, 30,  true,  null),
  ('N2-02', 'Rosa sombreada',            '2', null,         '12 x 9', 'Hombro',    1900, 'referencia', false, 70,  true,
   'Diseño de referencia, ejecución mía. Se publica con crédito.'),
  ('N2-03', 'Lettering con ornamento',   '2', 'Blackletter','14 x 5', 'Antebrazo', 2100, 'hibrido',    false, 85,  true,  null),
  ('N3-02', 'Manga cerrada antebrazo',   '3', null,         '30 x 15','Antebrazo', 6800, 'propio',     true,  240, true,
   'Tres sesiones. El precio es del total, no por sesión.'),
  ('N3-03', 'Composición cuello',        '3', null,         '10 x 10','Cuello',    4200, 'propio',     true,  180, false,
   'Sin publicar todavía: falta la foto buena.')
on conflict (id) do nothing;


-- ── Leads ─────────────────────────────────────────────────────────────
-- Diez leads repartidos en los cuatro estatus.
--
-- Reglas que hay que respetar y por qué cada fila las cumple:
--   · 'cotizado' y 'agendado' exigen monto_cotizado  (lead_cotizado_requiere_monto)
--   · 'agendado' exige además fecha_tatuaje y anticipo > 0  (lead_agendado_requiere_cita)
--   · anticipo <= monto_cotizado  (lead_anticipo_no_excede)
--
-- Los tres primeros llevan fecha_seguimiento en el pasado y no están
-- agendados ni perdidos: son los que encienden "seguimiento vencido" en el
-- Tablero.

insert into leads (fecha, nombre, whatsapp, origen, que_pidio, nivel_estimado,
                   estatus, monto_cotizado, cotizado_en, anticipo, zona,
                   catalogo_id, fecha_trazado, fecha_tatuaje, hora,
                   siguiente_accion, fecha_seguimiento, motivo_perdida)
values
  -- Vencidos: el seguimiento ya pasó y siguen abiertos.
  (current_date - 9, 'Mariana Ochoa Villalpando', '3141112233', 'meta',
   'Retrato de su abuela, hombro completo. Mandó tres fotos y quiere que se parezca a la del centro.',
   '3', 'cotizado', 5200, current_date - 8, 0, 'Hombro', 'N3-02',
   null, null, null, 'Le urge saber si alcanza para diciembre', current_date - 3, null),

  (current_date - 7, 'Beto R.', '3142223344', 'tiktok',
   'Fecha romana en la muñeca', '1', 'cotizado', 700, current_date - 7, 0, 'Muñeca', 'N1-02',
   null, null, null, 'Mandar 2 horarios', current_date - 2, null),

  (current_date - 6, 'Karla Jiménez', '3143334455', 'organico',
   'Rosa en el hombro, quiere ver referencias', '2', 'nuevo', null, null, 0, 'Hombro', null,
   null, null, null, 'Pedir foto de la zona', current_date - 1, null),

  -- Al corriente: el seguimiento es a futuro.
  (current_date - 4, 'Sofía Nava', '3144445566', 'meta',
   'Lettering del nombre de su hijo, antebrazo', '2', 'cotizado', 1500, current_date - 4, 0,
   'Antebrazo', 'N2-01', null, null, null, 'Confirmar si es con florituras', current_date + 2, null),

  (current_date - 3, 'Diego', '3145556677', 'referido',
   'Línea fina, tobillo', '1', 'nuevo', null, null, 0, 'Tobillo', null,
   null, null, null, 'Cotizar', current_date + 1, null),

  (current_date - 2, 'Fernanda Estrada Cordero', '3146667788', 'tiktok',
   'Manga completa, quiere empezar en enero', '3', 'nuevo', null, null, 0, 'Antebrazo', null,
   null, null, null, 'Agendar videollamada para ver el brazo', current_date + 5, null),

  -- Agendados: llevan cita y anticipo, como exige el constraint.
  (current_date - 5, 'Paola Iturbe', '3147778899', 'meta',
   'Script con florituras, antebrazo', '2', 'agendado', 2100, current_date - 5, 500,
   'Antebrazo', 'N2-03', current_date + 1, current_date + 3, '16:00',
   'Recordar que llegue comida', null, null),

  (current_date - 8, 'Ángel Domínguez', '3148889900', 'conocido',
   'Composición gótica en la mano', '3', 'agendado', 3500, current_date - 8, 1000,
   'Mano', 'N3-01', current_date - 1, current_date + 6, '12:30', null, null, null),

  -- Perdidos: con motivo, que es lo que hace útil la lista.
  (current_date - 11, 'Luis Alberto Mendoza', '3149990011', 'meta',
   'Retrato realista antebrazo', '3', 'perdido', 4800, current_date - 10, 0, 'Antebrazo', null,
   null, null, null, null, null, 'Le pareció caro. Se fue con alguien de $2000.'),

  (current_date - 14, 'Regina', '3141010101', 'tiktok',
   'Tatuaje chiquito atrás de la oreja', '1', 'perdido', null, null, 0, 'Cuello', null,
   null, null, null, null, null, 'Dejó de contestar después de la cotización.');


-- ── Leads, segunda tanda: el resto del embudo ─────────────────────────
--
-- Los diez de arriba cubren los cuatro estatus. Estos veinticuatro cubren
-- otra cosa: la FORMA del embudo.
--
-- Sin ellos el Tablero mostraba una tasa de cierre del 110%, y no era un
-- error de la app. `v_dashboard` define "conversaciones" como
-- `count(*) from leads` y "agendados" como todos los trabajos no
-- cancelados, así que:
--
--     tasa de cierre = trabajos vivos / leads
--
-- Con diez leads y once trabajos daba más del 100%. Un seed con tantos
-- trabajos como leads describe un estudio donde cierra todo el mundo, y
-- eso no existe: la mayoría pregunta, cotiza y no vuelve.
--
-- Con estos, quedan 34 leads contra 11 trabajos — 32% de cierre, verde — y
-- el costo por conversación cae de $193 a unos $57, ámbar. De paso la
-- lista de Leads llega a 34 filas, que es lo que hace falta para ver
-- densidad, orden y scroll de verdad.

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


-- ── Trabajos ──────────────────────────────────────────────────────────
-- Nueve piezas. Ids T-1xx para no chocar con el T-001 de seed_ejemplo.sql.
--
-- Reglas:
--   · 'agendado' y 'terminado' exigen anticipo > 0  (agendado_requiere_anticipo)
--   · anticipo + abonos <= precio_total  (cobrado_no_excede_precio)
--
-- Los dos en 'trazado_agendado' con anticipo 0 son los que encienden
-- "trabajos sin anticipo" en el Tablero: es legal en la base y es
-- exactamente la situación que el aviso existe para señalar.
--
-- Los terminados llevan tiempos capturados, que es de donde salen la tarifa
-- real por hora y el % del tiempo que es diseño. Sin ellos los dos KPI se
-- quedan en "—" y no hay nada que mirar.
--
-- Los tiempos de diseño van deliberadamente altos: suman 985 de 1925
-- minutos, o sea 51%, y eso deja ese KPI en ROJO con el mensaje "estás
-- regalando horas". Es el único rojo del Tablero, y lo quiero: un tablero
-- de ejemplo donde todo sale verde no permite ver cómo se comporta el
-- diseño cuando algo va mal, que es justo cuando esta herramienta importa.

insert into trabajos (id, cliente, whatsapp, diseno, catalogo_id, nivel, zona,
                      fecha_trazado, fecha_tatuaje, hora, precio_total, anticipo, abonos,
                      tiempo_diseno_min, tiempo_aplicacion_min, estatus, origen,
                      retoque_pendiente)
values
  -- Terminados: alimentan ingreso, horas y tarifa real.
  ('T-101', 'Ana López', '3141234567', 'Lettering ''Emilia''', 'N2-01', '2', 'Antebrazo',
   current_date - 22, current_date - 20, '16:00', 1500, 500, 1000, 95, 85, 'terminado', 'tiktok', false),

  ('T-102', 'Jorge Pantoja', '3142345678', 'Manga cerrada, primera sesión', 'N3-02', '3', 'Antebrazo',
   current_date - 30, current_date - 26, '11:00', 6800, 2000, 4800, 380, 400, 'terminado', 'meta', true),

  ('T-103', 'Cecilia Ruvalcaba', '3143456789', 'Rosa sombreada hombro', 'N2-02', '2', 'Hombro',
   current_date - 18, current_date - 15, '13:00', 1900, 600, 1300, 130, 120, 'terminado', 'organico', false),

  ('T-104', 'Emilio', '3144567890', 'Fecha romana muñeca', 'N1-02', '1', 'Muñeca',
   current_date - 12, current_date - 10, '17:30', 700, 200, 500, 50, 45, 'terminado', 'referido', false),

  ('T-105', 'Valeria Sandoval Mercado', '3145678901', 'Composición gótica mano', 'N3-01', '3', 'Mano',
   current_date - 9, current_date - 7, '12:00', 3500, 1000, 2500, 330, 290, 'terminado', 'conocido', true),

  -- Agendados: llevan anticipo, saldo pendiente y cita a futuro.
  ('T-106', 'Paola Iturbe', '3147778899', 'Script con florituras', 'N2-03', '2', 'Antebrazo',
   current_date + 1, current_date + 3, '16:00', 2100, 500, 0, 80, null, 'agendado', 'meta', false),

  ('T-107', 'Ángel Domínguez', '3148889900', 'Composición gótica mano', 'N3-01', '3', 'Mano',
   current_date - 1, current_date + 6, '12:30', 3500, 1000, 0, 160, null, 'agendado', 'conocido', false),

  -- Sin anticipo: legales porque no están agendados, y por eso mismo
  -- son los que el Tablero tiene que gritar.
  ('T-108', 'Renata Bustamante', '3149012345', 'Línea fina tobillo', 'N1-03', '1', 'Tobillo',
   current_date + 2, null, null, 850, 0, 0, null, null, 'trazado_agendado', 'tiktok', false),

  ('T-109', 'Marco Antonio Villaseñor de la Torre', '3140123456', 'Composición cuello, boceto inicial',
   'N3-03', '3', 'Cuello', current_date + 4, null, null, 4200, 0, 0, null, null, 'trazado_hecho', 'meta', false),

  -- Cancelado: que la lista no sea solo el camino feliz.
  ('T-110', 'Hugo Cárdenas', '3141357924', 'Manuscrita simple antebrazo', 'N1-01', '1', 'Antebrazo',
   current_date - 16, null, null, 900, 300, 0, 25, null, 'cancelado', 'organico', false);


-- ── Contenido ─────────────────────────────────────────────────────────
-- Ocho videos. El filtro es vistas_4h >= 800 Y guardados_4h >= 15.
--
-- Repartidos a propósito:
--   · Tres pasan el filtro y NO están promocionados → aviso en el Tablero.
--   · Dos pasan y ya se promocionaron → gasto de promoción real.
--   · Tres no pasan, y cada uno falla por un motivo distinto: pocas vistas,
--     pocos guardados, y uno que se queda justo debajo en los dos.

insert into contenido (fecha, titulo, plataforma, formato, trabajo_id,
                       precio_en_pantalla, vistas_4h, guardados_4h, comentarios,
                       promocionado, gasto_promocion, tags)
values
  -- Pasan y no se han promocionado.
  (current_date - 2,  'Cuánto cuesta el nombre de tu hija',        'tiktok',    1, 'T-101', true,  2400, 61,  38, false, 0,   '{precio,lettering}'),
  (current_date - 4,  'Tres horas de manga en 40 segundos',        'tiktok',    2, 'T-102', false, 5100, 143, 96, false, 0,   '{proceso,manga}'),
  (current_date - 6,  'Por qué la mano duele más',                 'instagram', 3, null,    false, 1900, 47,  22, false, 0,   '{educativo}'),

  -- Pasan y ya se promocionaron.
  (current_date - 9,  'La rosa que casi no hago',                  'tiktok',    1, 'T-103', true,  3300, 88,  54, true,  320, '{proceso,rosa}'),
  (current_date - 13, 'Lo que nadie te dice del retoque',          'instagram', 2, null,    false, 1250, 31,  17, true,  180, '{educativo,retoque}'),

  -- No pasan, cada uno por su motivo.
  (current_date - 3,  'Limpieza del área antes de empezar',        'facebook',  4, null,    false, 210,  4,   1,  false, 0,   '{proceso}'),
  (current_date - 7,  'Timelapse de la fecha romana',              'tiktok',    2, 'T-104', true,  1600, 9,   6,  false, 0,   '{proceso,precio}'),
  (current_date - 11, 'Respondiendo comentarios de precios',       'instagram', 1, null,    true,  760,  14,  29, false, 0,   '{precio}');


-- ── Pauta ─────────────────────────────────────────────────────────────
-- Dos campañas, cinco creativos y diez días de gasto por creativo.
--
-- El veredicto de un creativo sale de su costo por conversación acumulado
-- contra los umbrales de Ajustes (bueno 40, malo 80). Los cinco están
-- calibrados para caer en los tres veredictos: dos claramente para escalar,
-- dos en la franja de vigilar, y uno para matar — que es el que enciende el
-- aviso rojo del Tablero.
--
-- Van en tres sentencias sueltas y no en un CTE encadenado: los ids se
-- resuelven uniendo por nombre, que se lee de un vistazo y no depende de
-- que las filas salgan en un orden concreto.

insert into campanas (nombre, plataforma, objetivo, presupuesto_total, fecha_inicio, activa, notas)
values
  ('Lettering — temporada alta', 'meta',   'Mensajes a WhatsApp', 9000, current_date - 12, true,
   'La que sostiene el mes. No tocarla mientras el CPC aguante.'),
  ('Manga — prospección fría',   'tiktok', 'Mensajes a WhatsApp', 4500, current_date - 10, true, null);

insert into creativos (campana_id, nombre, presupuesto, activo)
select c.id, v.nombre, v.presupuesto, v.activo
from campanas c
join (values
  ('Lettering — temporada alta', 'Gótico mano — plano cerrado', 1800::numeric, true),
  ('Lettering — temporada alta', 'Lettering — antes y después', 1600::numeric, true),
  ('Lettering — temporada alta', 'Testimonial de Ana',          1200::numeric, true),
  ('Manga — prospección fría',   'Manga timelapse 15s',         1400::numeric, true),
  ('Manga — prospección fría',   'Voz en off — precios',         900::numeric, true)
) as v(campana, nombre, presupuesto, activo) on v.campana = c.nombre;

-- El gasto y las conversaciones de cada día van escritos uno por uno, en
-- dos arreglos de diez.
--
-- Podrían salir de una fórmula con módulos, y así estaban: más cortas de
-- escribir y imposibles de calibrar. El veredicto de un creativo depende
-- del total acumulado contra los umbrales, así que "que se vean los tres
-- veredictos" es una condición sobre las SUMAS, no sobre el patrón. Con los
-- números a la vista, cuadrarlas es aritmética; con una fórmula, es prueba
-- y error hasta que sale.
--
-- Las conversaciones son casi siempre 0 o 1 al día. No es un dato pobre: un
-- estudio chico con $30 diarios de pauta recibe eso, y la lista tiene que
-- saber verse con esa escala y no con una inventada más generosa.

insert into ads (fecha, creativo_id, gasto_real, conversaciones)
select current_date - d.dia, cr.id, p.gasto[d.dia], p.convs[d.dia]
from creativos cr
join (values
  -- nombre                       gasto por día (10)                                        conversaciones (10)          total → costo/conv → veredicto
  ('Gótico mano — plano cerrado', array[32,28,35,30,26,34,29,31,27,28]::numeric[], array[1,1,2,1,0,1,1,1,1,1]),  -- 300 / 10 →  30 → escalar
  ('Lettering — antes y después', array[30,26,31,28,25,29,27,30,26,28]::numeric[], array[1,0,1,1,1,1,0,1,1,1]),  -- 280 /  8 →  35 → escalar
  ('Testimonial de Ana',          array[28,24,29,26,22,27,25,28,24,27]::numeric[], array[1,0,1,0,1,0,1,0,1,0]),  -- 260 /  5 →  52 → vigilar
  ('Manga timelapse 15s',         array[34,30,36,32,28,35,31,33,29,32]::numeric[], array[0,1,1,0,1,0,1,0,1,0]),  -- 320 /  5 →  64 → vigilar
  ('Voz en off — precios',        array[29,25,30,27,23,28,26,29,25,28]::numeric[], array[0,0,1,0,0,0,0,1,0,0])   -- 270 /  2 → 135 → matar
) as p(nombre, gasto, convs) on p.nombre = cr.nombre
cross join generate_series(1, 10) as d(dia);


-- ── Qué debería verse después de correr esto ──────────────────────────
--
--  Tablero → "Requiere tu atención" con cinco entradas:
--    3 leads con seguimiento vencido · 2 trabajos sin anticipo ·
--    1 creativo para matar · 3 videos que pasan filtro sin promocionar ·
--    2 retoques pendientes
--
--  Tablero → semáforos en los tres colores a la vez.
--  Pauta   → los tres veredictos (escalar / vigilar / matar) en la lista.
--  Contenido → cinco que pasan y tres que no, cada uno por su motivo.
--  Trabajos  → los cinco estatus representados, incluido cancelado.
--  Leads     → los cuatro estatus, con vencidos arriba.
