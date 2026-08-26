-- ═══════════════════════════════════════════════════════════════════════
--  Datos de ejemplo del Excel — SOLO para validar que los cálculos cuadran.
--
--  Son exactamente las filas azules de Tablero_Tatuajes_v2.xlsx. Sirven para
--  comprobar contra el Excel que el filtro de contenido, el veredicto de ads
--  y el dashboard dan lo mismo (criterio de aceptación §10 de la spec).
--
--  NO correr esto en producción. Para borrarlos, el botón de Ajustes →
--  "Vaciar datos de la plataforma" hace exactamente eso y respeta el
--  catálogo y los umbrales.
--
--  ── Estaba roto y no se había notado ─────────────────────────────────
--
--  Este archivo se quedó escrito contra el esquema de la migración 0001 y
--  desde entonces dejaron de correr dos cosas:
--
--   · `ads` ya no tiene plataforma, creativo, objetivo ni presupuesto. La
--     migración 0009 partió la pauta en tres niveles —campaña, creativo y
--     captura diaria— y esas cuatro columnas subieron de nivel. Ahora `ads`
--     solo guarda el gasto del día contra un `creativo_id`.
--   · Un lead en 'cotizado' exige `monto_cotizado`: es el constraint
--     `lead_cotizado_requiere_monto` que agregó la 0006 para que no se
--     pueda declarar una etapa sin la información que la sostiene.
--
--  Los números son los mismos de siempre; lo único que cambió es por dónde
--  entran.
-- ═══════════════════════════════════════════════════════════════════════

insert into leads (fecha, nombre, whatsapp, origen, que_pidio, nivel_estimado,
                   estatus, monto_cotizado, cotizado_en, zona,
                   siguiente_accion, fecha_seguimiento)
values ('2026-08-20', 'Ejemplo: Luis M.', '3149876543', 'meta',
        'Nombre de su hija, antebrazo', '2', 'cotizado',
        1500, '2026-08-20', 'Antebrazo',
        'Mandar 2 horarios + pedir foto de zona', '2026-08-21');

insert into trabajos (id, cliente, whatsapp, diseno, catalogo_id, nivel, zona,
                      fecha_trazado, fecha_tatuaje, hora, precio_total, anticipo,
                      tiempo_diseno_min, tiempo_aplicacion_min, estatus, origen,
                      retoque_pendiente)
values ('T-001', 'Ejemplo: Ana López', '3141234567', 'Lettering ''Emilia''',
        'N2-01', '2', 'Antebrazo', '2026-08-20', '2026-08-22', '16:00',
        1500, 200, 60, 90, 'agendado', 'tiktok', false);

insert into contenido (fecha, titulo, plataforma, formato, trabajo_id,
                       precio_en_pantalla, vistas_4h, guardados_4h, comentarios,
                       promocionado, gasto_promocion)
values ('2026-08-20', 'Cuanto cuesta el nombre de tu hija', 'tiktok', 1, 'T-001',
        true, 1400, 32, 9, true, 150);

/*
 * La pauta, en sus tres niveles. El Excel pone "Meta" como plataforma del
 * anuncio y ahora sí hay dónde ponerlo tal cual: `plataforma_ads` admite
 * 'meta' y 'tiktok', que es como de verdad se compra la pauta. Antes había
 * que fingir que era 'facebook' porque el enum era el de contenido.
 *
 * El gasto y las conversaciones van juntos en una sola sentencia con CTEs
 * para no tener que copiar a mano los ids que genera la base.
 */
with c as (
  insert into campanas (nombre, plataforma, objetivo, presupuesto_total, fecha_inicio)
  values ('Ejemplo: Atraer leads', 'meta', 'Mensajes a WhatsApp', 3000, '2026-08-20')
  returning id
), cr as (
  insert into creativos (campana_id, nombre, presupuesto)
  select id, 'Creativo A - gotico mano', 120 from c
  returning id
)
insert into ads (fecha, creativo_id, gasto_real, conversaciones)
select '2026-08-20', id, 118, 4 from cr;


-- ── Comprobación contra el Excel ──────────────────────────────────────
--  Verificado corriendo este archivo sobre una base limpia:
--
--   select pasa_filtro from v_contenido_filtro;
--     → true   (1400 >= 800 y 32 >= 15)          Excel: "SI"
--
--   select costo_por_conversacion, veredicto from v_ads_veredicto;
--     → 29.50, 'escalar'  (118/4 = 29.5 <= 40)   Excel: 29.5, "ESCALAR"
--
--   select ingreso_cobrado, conversaciones, agendados, terminados
--   from v_dashboard;
--     → 200, 1, 1, 0
--       El trabajo está 'agendado', no 'terminado', así que aporta solo el
--       anticipo de 200. Igual que la fórmula B5 del TABLERO.
--
--   OJO con "tarifa real por hora": el Excel la calcula sobre TODOS los
--   trabajos (1500 / 2.5 h = 600). La spec solo cuenta los terminados, y
--   aquí no hay ninguno, así que la app muestra "—". No es un bug: es la
--   spec siendo más estricta que el Sheet.
