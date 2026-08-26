# Arcilla — el sistema visual del tablero

Documenta lo que está construido, no lo que se pensaba construir. Si el
código y este archivo se contradicen, manda el código y este archivo está
desactualizado.

Los valores viven en [`src/estilos/arcilla.css`](src/estilos/arcilla.css).
Las utilidades del material, en [`src/index.css`](src/index.css). El
vocabulario de movimiento, en [`src/lib/animacion.ts`](src/lib/animacion.ts).

---

## La tesis

**Todo está hecho de una sola cosa: barro.** Una masa blanda, mate, de
pared gruesa, apoyada sobre una mesa que no es de su color.

Lo que esto reemplazó era un tablero oscuro genérico: rectángulos con
borde de 1px, sombras con alfas tan bajas que en tema oscuro no movían un
solo nivel de gris, y todo al mismo plano. Funcionaba y no decía nada.

La regla que ordena el sistema entero es una:

> Lo que se apoya **sobresale**. Lo que se contiene **se excava**.

Una tarjeta sobresale. Un campo de formulario se excava. Una insignia
sobresale. El carril de un filtro se excava. No hay una tercera opción, y
por eso un formulario se entiende sin leer las etiquetas: lo que sobresale
se aprieta, lo que se hunde se llena.

### Por qué no es neumorfismo

Se parecen, y la diferencia es la que hace que uno sea usable y el otro no.

El neumorfismo extruye la pieza **del mismo color que el fondo**: el botón
*es* el fondo, abultado. Por eso no puede tener contraste — si lo tuviera,
dejaría de ser el fondo — y por eso su texto nunca llega a 4.5:1. Compra su
efecto pagando con accesibilidad.

La arcilla es una pieza **separada** que se posa encima. Tiene su propio
color, su propia sombra proyectada, y por lo tanto todo el contraste que
quiera. El volumen no sale de fundirse con el fondo: sale del grosor de la
pared.

---

## El material

Cada pieza lleva cuatro capas, siempre en este orden dentro de la
declaración de `box-shadow`:

| Capa | Qué es | Qué pasa si falta |
|---|---|---|
| **Filo** | Línea clara de 1–2px pegada al canto superior | La pieza es plana |
| **Bruñido** | Halo de luz que se derrama hacia dentro desde ese canto | Tiene canto y sombra pero la cara de en medio queda plana |
| **Pared** | Sombra interior ancha que sube desde la base: el espesor | Es una calcomanía con borde brillante |
| **Apoyo** | Contacto corto y denso + proyección larga y difusa | Está pintada encima, no puesta encima |

### La escalera

| Token | Para qué |
|---|---|
| `--arcilla-1` | Piezas chicas apoyadas dentro de otra: insignias, chips, avatares |
| `--arcilla-2` | El peldaño de trabajo: tarjetas, botones, la mayoría de las cosas |
| `--arcilla-3` | Lo que de verdad flota: botón flotante, avisos, modales |
| `--arcilla-hoja` | Hojas y paneles. La sombra va hacia **arriba**: vienen de abajo |
| `--arcilla-hundida` | La pieza mientras el dedo la aprieta |
| `--arcilla-pozo` | Un hueco excavado. **Sin apoyo**: un hoyo no proyecta sombra |

### Las utilidades

```
.arcilla         superficie + arcilla-2      → tarjetas
.arcilla-sutil   superficie-2 + arcilla-1    → piezas chicas
.arcilla-alta    superficie + arcilla-3      → lo que flota
.pozo            fondo hondo + arcilla-pozo  → campos, carriles, huecos
.pozo-error      el pozo + un filo rojo por dentro
.pulsable        el hundido al apretar
```

Cualquier pieza nueva usa una de estas. **Ninguna se inventa su propia
sombra.**

### Dos trampas que ya costaron caro

**1. `ring-*` de Tailwind pisa el material.** Las utilidades `ring-*` se
implementan sobre `box-shadow`, que es donde vive la arcilla, y como las
utilidades ganan a la capa de componentes, un `ring` sobre `.pozo` no se
suma: lo sustituye. Por eso existe `.pozo-error` como clase propia. Un
`ring` sí compone con las utilidades `shadow-arcilla*`, porque ahí las dos
pasan por el mismo sistema de variables de Tailwind.

**2. Teñir con alfa no funciona en oscuro.** `bg-danger/12` se mezcla con
lo que tiene **debajo**, y debajo está el fondo de la página, que es casi
negro: el resultado es un rojo tan oscuro que el aviso deja de avisar. Los
tintes van con `color-mix` contra `--surface`:

```
bg-[color-mix(in_srgb,rgb(var(--danger))_16%,rgb(var(--surface)))]
```

---

## Color

Dos temas completos, no un filtro invertido. Canales RGB para que Tailwind
pueda aplicar opacidad.

**Oscuro es el default, y lo decide la escena de uso:** esto se usa de
noche, en el estudio, en un teléfono. Barro oscuro bajo una lámpara cálida.

**El fondo no puede ser negro.** Es regla dura del material: con `--bg` en
`#000` las sombras proyectadas no existirían y la escalera entera se cae.
El fondo oscuro está en 13 y teñido de violeta; la superficie, bastante más
arriba, en 39. Esa distancia es lo que hace posible el relieve.

**En claro es al revés.** Ahí la sombra tiene todo el rango del mundo y el
filo blanco sobre superficie casi blanca no aporta nada, así que manda el
apoyo — y va **teñido de violeta, nunca gris**. Una sombra gris sobre
pastel es lo que delata que el barro es en realidad un div. El fondo claro
tampoco es blanco: es lavanda, para que la pieza blanca tenga dónde
proyectar.

| Rol | Oscuro | Claro |
|---|---|---|
| `--primary` | violeta 146 118 255 | violeta 106 74 238 |
| `--accent` | terracota 226 138 96 | terracota 190 88 42 |

La terracota es el color del barro y el segundo acento del estudio.

### La excepción: los avisos no son material

Los avisos de "Requiere tu atención" son **la única familia de color de la
app que no cambia con el tema**. Sus tokens viven en `:root`, fuera de los
bloques de `.dark` y `.light`.

Todo lo demás se adapta porque es material: barro que cambia de color según
la luz de la escena. Un aviso no es material — es una **señal**, y una señal
que cambia de intensidad según el tema deja de ser una señal.

Estuvieron teñidos contra la superficie (`color-mix` con `--surface`) y no
funcionaba: en oscuro quedaban casi negros, en claro casi blancos, y en los
dos casos la fila se veía igual que una tarjeta normal. Un aviso que se
confunde con lo que no es aviso ya falló, por bien resuelto que esté el
material.

Ahora la pieza **es** roja o **es** ámbar, con el mismo valor en ambos temas.

**Sobre fondo saturado el texto va a contraste pleno, y no es negociable.**
Atenuarlo lo destruye: bajar la opacidad acerca el texto al fondo en
luminancia, y un blanco al 80% sobre este rojo da **2.3:1** — peor que el
gris que se estaba evitando. Por eso el segundo renglón de cada aviso no es
más tenue; se distingue por tamaño y peso, y su color es un segundo valor a
contraste pleno.

El reparto sale de la señalética de toda la vida, y sale de ahí porque ahí
funciona: **rojo con blanco, ámbar con tinta negra**. Un ámbar lo bastante
vivo para leerse como ámbar es demasiado claro para sostener texto blanco.

| Par | Contraste |
|---|---|
| `--aviso-peligro` + `--aviso-peligro-fg` | 6.19:1 |
| `--aviso-peligro` + `--aviso-peligro-fg-2` | 5.59:1 |
| `--aviso-aviso` + `--aviso-aviso-fg` | 8.86:1 |
| `--aviso-aviso` + `--aviso-aviso-fg-2` | 6.42:1 |

Estas piezas usan `--arcilla-color`, no la escalera normal: sus capas están
calibradas contra una superficie neutra, y sobre un rojo saturado un filo de
blanco al 16% no se ve mientras una pared de negro al 60% ensucia el color
hasta volverlo marrón. El filo sube y la pared baja.

**Contraste:** `--fg-subtle` está calibrado en los dos temas para dar ≥4.5:1
contra `--surface`, porque lo usan las versalitas, los pies de ficha y las
notas — texto normal, no decorativo. Al aclarar la superficie para que la
sombra tuviera de dónde salir, hubo que subirlo con ella.

---

## Movimiento

### El momento de autor: el hundido

Todo lo que se puede apretar se comprime contra la mesa: encoge un 2.5%,
pierde el apoyo y se le cierra la pared interior. **Es un solo gesto,
repetido en cada control**, y es lo que hace que la interfaz se sienta
hecha de un material en vez de pintada.

Vive en CSS (`.pulsable`), no en framer. Tres razones, en orden de peso:

1. No es solo escala, también es la sombra — cinco capas que además dependen
   del tema. En CSS es un cambio de variable.
2. Las animaciones de CSS corren fuera del hilo principal. Un botón se
   aprieta justo cuando la app está guardando, o sea cuando el hilo está
   más ocupado, que es cuando framer pierde fotogramas.
3. Es el control más repetido de la app. En una lista de treinta tarjetas,
   quitarle el runtime de framer a cada una es trabajo que el teléfono no
   tiene por qué hacer para dibujar un encogido del 2.5%.

130 ms, dentro de los 100–160 que pide una pulsación.

### La entrada de Ajustes: el engranaje

La única pantalla con una animación de autor propia, y se la gana por la
misma pregunta que se la quitó a los iconos del menú: **¿cuántas veces al
día se ve esto?**

Ajustes es solo de admin y sus 7 umbrales son "supuestos de arranque" que
se ponen una vez. En la tabla de frecuencias eso es *raro / primera vez*,
el único renglón donde cabe añadir encanto.

Y no decora: **arrastra**. La pantalla dice que cambiar un umbral recalcula
el filtro, el veredicto y los semáforos — es la maquinaria del sistema. Así
que el engranaje gira, y las tarjetas entran **durante** su giro (retraso de
260 ms, escalonadas cada 55 ms, terminando antes que él). No son dos
animaciones que coinciden en el tiempo: es una causa y su efecto. Quitarla
se lleva un significado, no un adorno.

**Nace en el centro y se va a acomodar.** A 88 px en una esquina no se
aprecia nada de la extrusión, así que la pieza aparece grande (190 px) en
medio del área de contenido, voltea ahí —que es donde se ve el canto— y
después viaja a su hueco del encabezado encogiéndose.

Es **una sola pieza que nunca cambia de sitio en el DOM**: vive siempre en
su hueco, y lo que se anima es un `transform` que empieza llevándola al
centro y termina en `none`. El JavaScript solo mide una vez (cuánto hay de
su hueco al centro, y cuánto tiene que crecer) y lo escribe como variables
CSS. La alternativa habitual —overlay centrado y luego `layoutId` para
remontarla— serían dos elementos, así que el volteo se reiniciaría al
cambiar de sitio, y framer la mediría en cada fotograma desde el hilo
principal.

**El volteo se pinta a mano en un canvas; el viaje sigue siendo CSS.** Son
dos animaciones con dos trabajos distintos y por eso viven en dos sitios:
el **envoltorio** cruza el plano con `--recorrido` (ease-in-out: no entra
ni sale, se desplaza) y se compone fuera del hilo; el **sólido** voltea y
gira con `--vuelo`, dibujado fotograma a fotograma. Duran lo mismo, 1500
ms, para que el engranaje deje de girar exactamente cuando aterriza — un
giro que se apaga antes de llegar delata que las dos animaciones no tienen
nada que ver una con otra.

#### Por qué CSS no bastaba, y qué se aprendió intentándolo

Hubo tres versiones. Las dos primeras eran CSS puro y las dos se veían
planas. Los diagnósticos se guardan porque cada uno es un error fácil de
repetir:

**1. La perspectiva estaba diez veces demasiado lejos.** `perspective:
900px` sobre una pieza de 88 px es una proyección casi ortográfica: las
caras lejanas miden lo mismo que las cercanas, no hay escorzo, y girar deja
de leerse como girar en profundidad. La regla práctica es dejarla en el
orden del tamaño del objeto, entre una y tres veces.

**2. El movimiento dominante era un giro plano.** `rotateY` valía lo mismo
al principio y al final, así que no giraba nada en ese eje; lo único que se
movía era `rotateZ`, que ocurre *en* el plano. **Rotar sobre Z nunca revela
profundidad: es el eje que apunta al ojo.** Con eso más un `scale`, la
entrada era literalmente 2D por mucho `preserve-3d` que hubiera debajo.

**3. La curva se comía el gesto.** `--salida` concentra el 85% del
recorrido en el primer 30% del tiempo. Está bien para lo que es —acuse de
recibo instantáneo— pero aplicada a algo que existe para verse, lo mata: el
volteo entero pasaba en unos 150 ms. De ahí sale `--vuelo`, que también
frena al final pero reparte. **Se usa solo donde el movimiento es el
contenido, no la respuesta.**

**Y aun corregidos los tres, seguía sin funcionar.** El techo era la
técnica: la extrusión eran copias planas apiladas en `translateZ`. Eso
insinúa grosor y no puede hacer más, porque las copias se proyectan casi
una encima de otra —el canto queda como un borde emborronado en vez de una
superficie— y sobre todo porque **ninguna copia recibe luz distinta según
su orientación**. Ese cambio de brillo al girar es exactamente lo que el
ojo usa para decidir que algo es un sólido. Además los planos se estrechan
hasta desaparecer al ponerse de perfil, así que ni siquiera se podía girar
lo suficiente.

#### El renderizador

[`src/lib/engranaje3d.ts`](src/lib/engranaje3d.ts) construye geometría de
verdad: dos tapas, un quad por segmento del contorno para la pared
exterior, y otro tanto para la pared del barreno. Cada cara tiene su normal
y se sombrea con la luz del sistema —arriba a la izquierda y algo de
frente, la misma dirección que justifica que el filo vaya arriba y la pared
en sombra abajo en el resto de la app.

Sin dependencias. Meter una librería 3D serían ~150 kB comprimidos para un
icono decorativo, contra los **6 kB** que costó esto. Y el precio real
—correr en el hilo principal— se paga porque son ~120 caras, en una
pantalla de admin que se abre poco, durante 1.5 s, y **termina**: no queda
ningún bucle.

Dos cosas que costaron una corrección:

- **El orden de pintado de una extrusión es determinista.** La primera
  versión metía las 120 caras en un solo `sort` por profundidad media y
  salía rota: una tapa plana y las paredes que la rodean tienen
  profundidad media casi idéntica, así que el desempate era arbitrario y
  las paredes se pintaban *encima* de la cara frontal. El orden correcto es
  tapa de atrás → barreno → pared exterior → tapa de delante, ordenando
  solo *dentro* de cada grupo.
- **Las tapas se pintan con el agujero recortado** (`fill('evenodd')`). Una
  tapa maciza tapa la pared interior del barreno, que es justo donde el
  desalineamiento entre las dos bocas más vende el volumen.

El canvas es un mapa de bits, así que **no se entera solo de un cambio de
tema**: un `MutationObserver` sobre la clase de `<html>` lo repinta. Es el
único elemento de la app que necesita eso; todo lo demás sigue las
variables CSS por su cuenta.

**Las tarjetas no esperan a que aterrice.** Entran a los 600 ms, mientras
el engranaje todavía cruza por encima, y la última llega a los 950. Esperar
a que se coloque habría quedado más ordenado y habría violado una regla
explícita: una pantalla de tipo Operate no hace esperar a nadie a través de
una coreografía de carga. Así se conservan las dos cosas — la lectura
causal y una pantalla usable a un segundo.

Cuatro detalles que lo mantienen dentro del sistema:

- **Los dientes van con curvas.** Un engranaje de metal tiene aristas vivas;
  el barro no sostiene un canto vivo. Los controles de las curvas salen a un
  radio mayor que la punta, que es lo que da el bulto de masa apretada.
- **Lleva sombra de contacto**, la cuarta capa del material, y entra tarde
  (a los 1180 ms): mientras cruza la pantalla está en el aire y no se apoya
  en nada.
- **El envoltorio del viaje va a `width`/`height: 100%`.** Suena trivial y
  costó un bug del pase: un div metido entre el hueco y el lienzo, sin
  tamaño propio, rompe la cadena de alturas y todo colapsa a 0 px.
- **El lienzo se dimensiona para el tamaño mayor al que se va a ver**, no
  para el de la esquina: durante el viaje el CSS lo amplía 2.6×, y un
  canvas de 88 px estirado a 190 sale borroso.
- **El reposo es el fotograma final.** Si el canvas no pinta, si el JS
  falla o si el sistema pide reducir movimiento, se dibuja una vez en la
  pose de reposo y ya. La
  pieza se ve quieta, entera, en su ángulo. No hace falta ninguna regla
  especial de movimiento reducido.

### Continuidad: lo que se mueve, viaja

El indicador del menú y el del segmentado son **la misma pieza** para todas
las secciones, con `layoutId` y resorte. Un elemento que se apaga en un lado
y se enciende en otro obliga a buscarlo; uno que viaja se sigue con el ojo.

### Los resortes

Van en la forma de Apple (`duration` + `bounce`), no en física cruda, porque
se puede razonar sobre ella. **El rebote va corto en todo** (0.10–0.16): la
arcilla es un material mate y pesado, no goma. Un `bounce` alto la convierte
en un globo y deshace lo que las sombras están construyendo.

### El cambio más grande: los iconos dejaron de latir

Los seis iconos del menú se movían **en bucle infinito, siempre, en todas
las pantallas**. La intención era buena —dar vida sin esperar un cursor que
en el teléfono no existe— pero la primera pregunta del marco de decisión no
es "¿cómo lo animo?" sino **"¿cuántas veces al día se ve esto?"**.

Un menú se ve cientos de veces al día. A esa frecuencia una animación deja
de informar y pasa a ser ruido de fondo que compite contra los datos, que es
a lo que uno vino — y gasta batería en un teléfono que ya está corriendo
consultas.

**El gesto no se tiró: se le puso un disparador.** Ahora cada icono hace su
movimiento una sola vez, y solo cuando significa algo: al entrar a su
sección, o al pasarle el cursor donde haya cursor. El martillo martilla
cuando *abres* Trabajos, no eternamente.

Mismo criterio en el globo de WhatsApp: había uno por tarjeta, y con treinta
leads eran treinta repicando a la vez. Hacía falta pasarle a cada uno un
`animation-delay` distinto solo para que la pantalla no parpadeara en
bloque; ese apaño desapareció con el bucle.

Y la lluvia de billetes de los KPI **bajó el volumen** — cuatro piezas en
vez de seis, más lentas y más pálidas — porque se ve decenas de veces al día
detrás de las cifras que son el motivo de la pantalla. En un tablero, la
decoración que le compite al dato pierde.

### Los bucles se apagan solos

`useQuieto` para cualquier bucle decorativo cuando su contenedor sale del
viewport o la pestaña se va al fondo. En el Tablero hay siete lluvias y en
un teléfono se ven dos o tres a la vez.

Usa `animation-play-state: paused`, no `none`: la animación conserva su
posición y al volver sigue donde iba. Con `none`, los billetes saltarían
todos al inicio cada vez que la tarjeta reentra.

### Reducir movimiento

Menos movimiento y más suave, **no cero**. Quien lo pide quiere que las
cosas no se desplacen; apagarlo todo hace que un error de formulario
aparezca de golpe y que varias cosas se lean como parpadeos.

Se apaga el desplazamiento y se conservan opacidad y color. **El hundido es
la excepción deliberada:** `scale(0.975)` es acuse de recibo de una
pulsación, no transporte. Nadie se marea porque un botón confirme que lo
tocaron, y sin él la app deja de contestar.

Las dos lluvias se esconden enteras.

---

## Tipografía

- **Space Grotesk** (`font-display`) — títulos de pantalla y cifras grandes.
  Lo que se lee de un vistazo desde lejos.
- **Inter** (`font-sans`) — cuerpo, etiquetas, botones, formularios. El 90%.
- **Mono del sistema** — solo códigos (`T-001`, claves de Ajustes), donde lo
  que importa es que las cifras alineen.

Auto-hospedadas, subset `latin`, `font-display: swap`. No van desde Google
porque el service worker solo cachea el mismo origen: una fuente externa
dejaría de cargar justo en el caso que esta app promete cubrir, el estudio
sin señal.

> **Deuda conocida.** El detector de diseño marca las dos caras como
> "fuentes por defecto de UI generada", y tiene razón: son de las que
> aparecen en cada oleada de interfaces hechas con IA. Inter se defiende
> —en una herramienta operativa una cara de trabajo bien dibujada para
> tamaños chicos es la elección correcta— pero **Space Grotesk como voz de
> display es el default flagrante**, y una app de barro pide una cara con
> curvas más generosas. No se cambió porque exige conseguir y auto-hospedar
> un `.woff2` con licencia, y eso no se podía cerrar en este pase. Es la
> primera cosa que yo tocaría después.

---

## Las superficies que no dibujamos

Selección, cursor de texto, barra de scroll y aro de foco vienen de fábrica
en un gris de navegador que no pertenece a ningún sistema. Están tematizados
desde la paleta. Es lo más barato que separa una pantalla construida de una
pantalla ensamblada, y es lo que más se salta.

**El aro de foco va con `outline`, no con `box-shadow`.** Con box-shadow el
aro ocuparía la propiedad donde vive el material: al enfocar un campo se
comería el pozo y el hueco quedaría plano justo mientras lo usas.
`outline-offset` además lo separa de la pieza, que hace falta porque pegado
al canto se confunde con el filo de luz de la propia arcilla.

---

## Reglas duras

1. **Ningún borde de 1px dibuja una pieza.** El volumen lo hace la sombra.
   Los separadores tampoco: se hacen con una sombra corta o no se hacen.
2. **Nada de tarjetas anidadas.** Dos piezas de barro una encima de otra
   suman ocho capas de sombra y el resultado es papilla. Lo que va dentro de
   una pieza se **excava** en ella (`.pozo`, o el componente `Hueco`).
3. **El radio sube con el tamaño de la pieza.** Lo que se mantiene constante
   en un objeto de barro es el grosor de la pared, no el radio. Una pieza
   grande con el radio de una chica parece cartón.
4. **La sombra tiene un suelo.** A 8px cualquier sombra es una mancha sucia,
   no un volumen. El punto del semáforo no lleva.
5. **Ninguna animación de interfaz pasa de 300 ms.** Las dos que pasan son
   entradas coreografiadas que ocurren una vez por pantalla, y las dos son
   decoración sobre un dibujo que ya está completo y correcto sin ellas.
6. **Un aviso no se tiñe: se colorea.** Cualquier cosa que exista para
   interrumpir usa la paleta `aviso-*`, que es igual en los dos temas, con
   `--arcilla-color` y texto a contraste pleno. Teñir contra la superficie
   es para lo que acompaña, no para lo que avisa.
7. **Una animación decorativa nunca es requisito para ver un dato.** Todas
   nacen o mueren en su estado correcto: si no corrieran, la pantalla se ve
   completa.
