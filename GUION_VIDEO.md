# Guion de video · Prueba Técnica AI Interns 2026

**Video grabado:** https://youtu.be/yX3YcnpyEiA
**Duración objetivo:** 10:00 minutos
**Autor:** Juan Felipe Ledesma Velásquez
**Proyecto:** Rappi · AI-Powered Availability Dashboard

---

## 🎬 Estructura por bloques

| Bloque | Tiempo | Objetivo |
|---|---|---|
| 1. Intro | 0:00–0:40 | Presentarme y el plan |
| 2. Entendimiento del problema | 0:40–2:00 | Demostrar que leí el enunciado con criterio |
| 3. Entendimiento de los datos | 2:00–3:30 | Mostrar el rigor con el que los exploré |
| 4. Arquitectura | 3:30–4:30 | Explicar el cómo y justificar cada pieza |
| 5. Decisión clave: Tool Use vs RAG | 4:30–6:00 | **El 30% de la nota — uso efectivo de AI** |
| 6. Demo del dashboard | 6:00–8:00 | Funcionalidad + UX |
| 7. Demo del chatbot | 8:00–9:30 | La parte semántica, con transparencia |
| 8. Cierre | 9:30–10:00 | Qué dejé fuera y por qué, gracias |

---

## 📝 Guion palabra por palabra

### 1. Intro — 0:00 a 0:40 (40 seg)

> Hola, soy **Juan Felipe Ledesma Velásquez**. Lo que van a ver en los próximos diez minutos es mi solución a la prueba técnica: un dashboard con chatbot semántico sobre los datos de disponibilidad de tiendas de Rappi.
>
> El plan es este: primero les cuento cómo entendí el problema, después cómo entendí los datos — que fue la parte más interesante —, luego la arquitectura, la decisión más importante que tomé respecto al uso de AI, y cierro con una demo en vivo de la aplicación.
>
> Todo corre local con `docker compose up`. Vamos.

**💡 Nota para grabar:** Mirar a cámara. No leer. Tono conversado.

---

### 2. Entendimiento del problema — 0:40 a 2:00 (1:20 min)

> El enunciado pedía dos cosas: un dashboard que muestre datos históricos de disponibilidad de tiendas, y un chatbot semántico que permita conversar con esos datos. La duración era hora y media y el stack libre.
>
> Pero lo importante no es lo que pedían — es **por qué** lo piden. En Rappi, la disponibilidad de una tienda es el dato que decide si un usuario puede comprar o no. Si una tienda está offline y el dashboard no lo muestra rápido, o si operaciones no puede preguntar *"¿cuántas tiendas cayeron esta mañana?"* sin abrir una hoja de cálculo, hay plata que se está perdiendo en tiempo real.
>
> Entonces hay dos tipos de usuarios implícitos:
> - Un **analista de operaciones** que quiere ver tendencias y detectar patrones → para él es el dashboard.
> - Un **líder o on-call** que llega a la herramienta con preguntas concretas tipo *"¿qué pasó ayer entre 3 y 5?"* → para él es el chatbot.
>
> Mi regla de oro fue: el dashboard resuelve las preguntas que uno **no sabía** que tenía. El chatbot resuelve las que uno **llega con ellas**. Son complementarios, no redundantes.

**💡 Imagen de apoyo:** Slide con los dos personajes (analista y on-call) o simplemente la frase resaltada.

---

### 3. Entendimiento de los datos — 2:00 a 3:30 (1:30 min)

> El zip traía **201 archivos CSV**. El formato era incómodo: una fila por archivo, timestamps en columnas, valores cada 10 segundos. Lo primero que hice fue consolidar todo en una sola serie temporal: terminé con **67 141 puntos entre el 1 y el 11 de febrero de 2026 — diez días de datos**.
>
> Los CSVs tienen 20 segundos de solapamiento en los bordes, así que hice dedup por timestamp.
>
> Ahora, lo interesante: cuando grafiqué la serie descubrí un patrón muy limpio. La métrica baja casi a cero en la madrugada, arranca un ramp-up a las 8 de la mañana, llega al pico entre 3 y 5 de la tarde, y baja gradualmente en la noche. Ese patrón se repite todos los días, con variaciones entre días de semana y fin de semana.
>
> Eso me dijo dos cosas. Primero: los valores **no son** tiendas visibles en un instante puntual — Rappi no pasa de cero a seis millones de tiendas entre las seis y las tres. Es o bien un contador acumulado diario, o una métrica que crece con la actividad del día.
>
> Segundo, y más importante para el diseño: esa forma de campana es exactamente la razón por la que necesitas un **heatmap día-de-la-semana por hora** y un chart de **promedio por hora del día**. Sin esas dos vistas estás ocultando la estructura más rica del dataset. Por eso los incluí.

**💡 Imagen de apoyo:** Captura del heatmap o del hourly chart del dashboard.

---

### 4. Arquitectura — 3:30 a 4:30 (1:00 min)

> La arquitectura tiene tres piezas, todo orquestado con docker-compose:
>
> **Backend**: FastAPI con pandas. Al arrancar lee los 201 CSVs, los consolida y los deja en memoria. Son apenas dos megas, no hay razón para tocar disco en cada request. Expone diez endpoints REST — nueve para el dashboard y uno para el chat.
>
> **Frontend**: Next.js 14 con Tailwind y Recharts. Va en modo standalone y uso el mecanismo de rewrites para que el navegador hable con `/api` y Next proxea al backend. Ventaja: cero configuración de CORS.
>
> **AI**: la API de Claude, integrada solamente en el backend. El frontend nunca habla con Anthropic directamente. Si mañana cambio de Claude a otro proveedor, el frontend ni se entera.
>
> Los CSVs van montados como **volumen read-only** — el backend no puede modificarlos por accidente. Hay healthcheck; el frontend espera a que el backend esté healthy antes de arrancar.

**💡 Imagen de apoyo:** Diagrama de arquitectura.

---

### 5. Decisión clave: Tool Use vs RAG — 4:30 a 6:00 (1:30 min)

> Esta es la parte más importante, porque el enunciado dice que el 30% de la nota es uso efectivo de AI.
>
> Cuando uno oye *"chatbot que conversa con datos"*, la primera idea es RAG: vectorizas los datos con embeddings, el usuario hace una pregunta, buscas los vectores más similares y se los pasas al modelo. Eso funciona bien para documentos y texto.
>
> **Para series temporales numéricas no sirve.** Un embedding no sabe decirte el promedio de un rango. No detecta caídas. No compara dos días. Y además vectorizar sesenta y siete mil puntos es caro y lento.
>
> Lo que hice fue **Tool Use**. Le di a Claude un toolbox de ocho funciones analíticas reales:
>
> - `get_stats_for_range` — estadísticas descriptivas
> - `get_hourly_profile` — promedio por hora
> - `get_daily_profile` y `get_weekday_profile` — agregaciones temporales
> - `find_drops` — detección de caídas
> - `get_peak_hours` y `get_trough_hours` — horas pico y valle
> - `compare_ranges` — diferencia entre dos rangos
>
> El flujo es así: el usuario pregunta algo, Claude decide qué tool llamar, el backend ejecuta pandas sobre los datos reales, la respuesta vuelve en JSON, y Claude la traduce a lenguaje natural.
>
> Tres ventajas concretas: **uno**, Claude nunca inventa cifras porque los números salen de pandas, no de su cabeza. **Dos**, el costo por pregunta es constante — no importa si los datos son dos megas o dos terabytes. **Tres**, si mañana necesito una tool nueva — digamos *detectar anomalías con isolation forest* — la agrego al toolbox y el chatbot empieza a usarla sin reentrenar nada.
>
> Hay un detalle más: el loop es agéntico, hasta seis rondas. O sea, si pregunto *"compara el día con más tiendas contra el que tuvo menos"*, Claude primero llama `get_daily_profile` para encontrar ambos, y después llama `compare_ranges` con los resultados. Encadena tools automáticamente.

**💡 Imagen de apoyo:** Tabla con las 8 tools y una flecha conceptual "Pregunta → Claude → Tools → Pandas → Claude → Respuesta".

---

### 6. Demo del dashboard — 6:00 a 8:00 (2:00 min)

**[Cambiar a pantalla completa del dashboard]**

> Esto es lo que ve el usuario. Arriba los **KPI cards**: promedio, máximo, mínimo con timestamps, percentil 95, desviación. Noten que el máximo tiene la fecha y hora exacta de cuándo ocurrió — eso lo calcula el backend con `idxmax`.
>
> Debajo hay un **filtro de rango**. Si elijo, por ejemplo, solo el 5 de febrero entre 10 y 4 de la tarde... **[aplicar filtro]** ...los KPIs se recalculan automáticamente. No es puro UI — es una ventana real sobre la serie.
>
> El **chart principal** tiene dos cosas que vale la pena señalar. **Primero**, los botones de agregación: puedo ver los datos crudos cada diez segundos, o agregar en cinco minutos, o en un día. Cada agregación la hace el backend con `resample().mean()`. **Segundo**, abajo hay un **brush** — puedo arrastrarlo para hacer zoom sobre un subperiodo sin cambiar el filtro global. **[hacer brush]**
>
> **[scroll abajo]**
>
> Aquí está la gráfica de **promedio por hora del día**. Se ve claro: mínimo cerca de las 6am, pico entre 2pm y 4pm. La forma de esta curva es la que justifica el heatmap de al lado.
>
> El **heatmap semanal**: filas son días de la semana, columnas son horas. Los cuadrados más naranjas son más tiendas.
>
> **[Señalar el toggle arriba a la derecha del heatmap]** Un detalle de diseño que vale la pena: arriba tiene un toggle con tres escalas de color. Déjenme mostrarles por qué. **[Click "Lineal"]** Con la escala lineal — que es la default de cualquier librería — los valores de los picos saturan todo y se pierde el detalle en la madrugada. **[Click "Log"]** Con log se diferencian mejor las horas bajas pero los picos se comprimen. **[Click "Percentil"]** Con escala por percentil, cada nivel de color cubre la misma cantidad de celdas — hay diferenciación visual en toda la matriz, es lo que un analista quiere.
>
> Lo que salta a la vista ahora: los fines de semana son ligeramente distintos a los días laborales — el viernes es el día de más disponibilidad promedio.
>
> Finalmente, la **tabla de caídas**: el backend busca ventanas de cinco minutos donde el promedio cae más de X por ciento respecto a la ventana anterior. El umbral es configurable. Con umbral del diez por ciento, las caídas que aparecen son las más severas — esos son los incidentes reales.

**💡 Nota de grabación:** Mover el cursor con calma. No hablar más rápido de lo que se mueve el cursor. Hacer pausas cortas entre subsecciones.

---

### 7. Demo del chatbot — 8:00 a 9:30 (1:30 min)

> Abro el chatbot en la esquina inferior derecha. **[click]**
>
> Le hago una pregunta simple: *"¿Cuál es la hora del día con más tiendas disponibles en promedio?"* **[enviar]**
>
> Mientras piensa, algo importante: abajo de la respuesta hay un desplegable llamado **"tool calls"**. Ahí muestro exactamente qué herramienta llamó Claude y con qué parámetros. Esto no es decorativo — es auditabilidad. Si soy el líder de operaciones y el bot me dice un número, quiero poder revisar qué cálculo respalda ese número. Por eso lo hice visible, no escondido.
>
> **[Cuando responda]** Aquí dice que la hora pico es las 15:00. Y abajo, la tool call: `get_peak_hours({top_n: 1})`. Coherente.
>
> Ahora una pregunta compuesta: *"Compara el día con más tiendas contra el día con menos tiendas."* **[enviar]**
>
> Fíjense que esta pregunta **requiere encadenar tools**. Claude primero tiene que encontrar ambos días — usa `get_daily_profile` — y después comparar — usa `compare_ranges`. **[Cuando responda, señalar las dos tool calls]** Ahí están las dos llamadas, exactamente en ese orden.

**💡 Backup si falla el chatbot en vivo:** Tener pregrabadas las respuestas en capturas o video, para no quedarse clavado.

---

### 8. Cierre — 9:30 a 10:00 (30 seg)

> Para cerrar, algunas cosas que dejé fuera a propósito y puedo defender:
>
> - **Sin tests**: con tiempo habría testeado la capa de analytics, que es la candidata obvia. El chatbot es harder to test determinísticamente.
> - **Sin auth**: es un prototipo local.
> - **Respuesta no-stream**: mejor UX sería streaming pero el valor incremental era bajo para una hora y media.
>
> Y algo que **sí incluí** y que vale la pena: el código está en un repositorio público en mi GitHub, todo corre con un comando, y la UI muestra qué decisiones tomó el modelo de AI — porque si no puedes auditar a un LLM, no deberías ponerlo en producción.
>
> Gracias.

**💡 Nota:** Silencio de un segundo al final, no cortar abrupto.

---

## 🎥 Consejos de grabación

1. **Graba dos veces** mínimo. El segundo take siempre sale mejor.
2. **Audio > video.** Usa micrófono externo o AirPods con mic — el del portátil se oye mal.
3. **Pantalla nítida.** Resolución al menos 1920×1080; si grabas en 4K, exporta en 1080p para tamaño de archivo razonable.
4. **Cursor visible.** En macOS sube el tamaño del cursor en Accesibilidad para que se vea en el video.
5. **Modo oscuro del navegador** ya está resuelto porque el dashboard es dark. Cierra pestañas innecesarias.
6. **Demo con datos reales**, no mocks. Tener `docker compose up` corriendo antes de grabar.
7. **Para el chatbot en vivo**: hacer un warm-up privado antes para asegurar que hay crédito y la API responde rápido.

---

## 📊 Timing exacto para cronometrar

| Segundo | Sección |
|---:|---|
| 0:00 | Intro |
| 0:40 | Problema |
| 2:00 | Datos |
| 3:30 | Arquitectura |
| 4:30 | Tool Use vs RAG |
| 6:00 | Demo dashboard |
| 8:00 | Demo chatbot |
| 9:30 | Cierre |
| 10:00 | FIN |
