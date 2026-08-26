-- ═══════════════════════════════════════════════════════════════════════
--  El gasto de promoción de contenido entra al tablero
--
--  `contenido.gasto_promocion` existía desde 0001 pero no lo sumaba nadie:
--  se pintaba en el badge de la tarjeta y ahí moría. Resultado: impulsar un
--  video costaba dinero real que no aparecía en el margen, ni en el ROAS,
--  ni en el costo por conversación. Se veía un negocio más rentable de lo
--  que era, y justo del lado que la plataforma quiere empujar.
--
--  Se agrega como columna PROPIA en vez de meterla dentro de gasto_pauta:
--  así la pantalla de Pauta y el tablero siguen cuadrando entre sí, y el
--  desglose queda a la vista en lugar de escondido en una suma.
--
--  La columna nueva va AL FINAL: `create or replace view` solo permite
--  agregar columnas después de las existentes, nunca intercalarlas.
-- ═══════════════════════════════════════════════════════════════════════

create or replace view v_dashboard
with (security_invoker = on) as
with t as (select * from trabajos where estatus <> 'cancelado')
select
  -- Terminado aporta precio completo; pendiente solo el anticipo cobrado
  coalesce((select sum(precio_total) from t where estatus='terminado'),0)
    + coalesce((select sum(anticipo) from t where estatus<>'terminado'),0) as ingreso_cobrado,
  (select count(*) from t where estatus='terminado')
    * (select valor from config where clave='costo_insumos_pieza')       as costo_insumos,
  coalesce((select sum(gasto_real) from ads),0)                          as gasto_pauta,
  (select count(*) from leads)                                          as conversaciones,
  (select count(*) from t)                                              as agendados,
  (select count(*) from t where estatus='terminado')                    as terminados,
  (select count(*) from t where nivel='1')                              as nivel_1,
  (select count(*) from t where nivel='2')                              as nivel_2,
  (select count(*) from t where nivel='3')                              as nivel_3,
  coalesce((select sum(minutos_totales) from t where estatus='terminado'),0)/60.0
                                                                        as horas_invertidas,
  coalesce((select sum(tiempo_diseno_min) from t where estatus='terminado'),0)
                                                                        as min_diseno,
  -- min_aplicacion no está en la spec; se agrega para poder mostrar
  -- "% del tiempo que es diseño no facturado" (fila 31 del TABLERO del Excel)
  -- sin recalcular tiempos en el cliente.
  coalesce((select sum(tiempo_aplicacion_min) from t where estatus='terminado'),0)
                                                                        as min_aplicacion,
  (select count(*) from contenido)                                      as videos_publicados,
  coalesce((select sum(vistas_4h) from contenido),0)                    as vistas_totales,
  (select count(*) from v_contenido_filtro where pasa_filtro)           as videos_aptos,
  -- Lo gastado en impulsar videos que ya funcionaron orgánico.
  coalesce((select sum(gasto_promocion) from contenido),0)              as gasto_promocion_contenido;
