# Aventura educativa Aurora

La aventura completa se abre en `/game/legacy`. La introducción y la configuración permiten elegir **Con compañía** o **Por mi cuenta**, y activar botones de lectura en voz alta. No hay lectura automática; la voz disponible depende del navegador.

`/game` abre la demo independiente HORIZONTE. Sus tres objetivos y reservas viven en memoria y se reinician al recargar: todavía no usa el guardado de misiones ni el cuaderno de la aventura completa. El menú de pausa ofrece **Abrir aventura completa**. **Continuar**, el regreso desde resultados y el rescate dirigen a la versión persistida en `/game/legacy`.

La pantalla de exploración muestra las reservas y una sola tarjeta con el siguiente objetivo. No abre paneles automáticamente. La tarjeta abre **Misión**, y **Mi base** abre las decisiones: se revisa una tarea a la vez. El mismo panel incluye **Cuaderno**; el menú **Más opciones** contiene módulos, ciencia, ajustes y controles. La cámara se elige desde **Vista**, y Tab abre la base. Las pistas se muestran cuando se piden.

El recorrido comprende entrar al invernadero, orientar un panel, conectar un circuito, confirmar la decisión de cultivo, avanzar un sol, localizar una fuga y analizar una muestra. Termina al clasificar una observación y una hipótesis en el cuaderno. Los desafíos se pueden repetir sin cronómetro ni pérdida de recursos.

Las decisiones y el balance de los soles se guardan en PostgreSQL con el control de versión existente. La vista previa incluye los efectos pendientes conocidos, pero excluye nuevos eventos. Las reservas tienen un máximo de 100. Las luces, los cultivos y el ritmo de la tripulación reflejan el estado de la base.

Las preferencias y los desafíos completados se guardan en `localStorage` por ID de misión, para las últimas 20 aventuras de ese navegador. No se sincronizan entre dispositivos. Si se borran los datos del navegador se pierde este progreso local, aunque la simulación haya sido guardada en el servidor.

Una misión interrumpida permite practicar una reparación y solicitar un rescate. El servidor verifica sesión, versión y uso previo. Conserva el ID y la historia, lleva las reservas vitales a un mínimo de 45 y la salud a un mínimo de 70, elimina eventos y efectos pendientes y permite continuar. Se registra una decisión de tipo `REPAIR_SYSTEMS` con `kind: RESCUE` dentro del JSON existente; no requiere migración de la base de datos. Solo se concede una vez por misión. Es una ayuda educativa ficticia, explícitamente identificada.

Aurora-1, la baliza, la muestra del relato y las unidades de los desafíos son ficción o modelos de aprendizaje. Las páginas del cuaderno enlazan documentación de NASA sobre Veggie y moléculas orgánicas de Marte. Una molécula orgánica no confirma por sí sola que haya existido vida.

Validación: `npm run typecheck`, `npm run lint`, `npm run test:run`. Las pruebas de integración requieren acceso a PostgreSQL configurado por `DATABASE_URL`. Las pruebas crean y eliminan únicamente sus propias misiones.
