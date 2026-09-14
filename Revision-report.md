# Revision Report - CodeMyLife

## Resumen ejecutivo

CodeMyLife es una aplicacion Electron local de productividad y bloqueos. Sus workflows principales son scripts de bloqueo web, bloqueos de procesos de videojuegos, bloqueo de descanso, foco diario, uso limitado de Instagram y tienda de recompensas.

La experiencia actual es funcional para esos workflows, pero no corresponde al contexto de trading descrito en la primera parte de `Revision.md`: no existen workspaces, paneles acoplables, charts, DOM, posiciones ni layouts persistentes. Esos puntos requieren una arquitectura de producto diferente y no se pueden declarar completados sin inventar funcionalidad.

En esta revision se corrigieron riesgos de alto impacto que si pertenecen al producto actual:

- persistencia atomica de wallet, compromisos, cache y foco diario;
- errores del scheduler visibles en el estado de bloqueo;
- reintentos de sincronizacion de hora confiable y dialogo de arranque claro;
- avisos cerrables y autoexpirables;
- contador del inventario expresado en minutos totales;
- accesibilidad del countdown de descanso;
- soporte para reduced motion;
- lista de preview de foco con scroll responsive;
- preview de foco separada del progreso real de la manana;
- bloqueo diario real entre 08:00 y 15:00 con ventana fullscreen;
- bloqueo diario que respeta la ausencia de Gym durante fines de semana;
- proteccion de datos ante escrituras parciales.

## User Journey completo

### Arranque

`run.cmd` -> elevacion de administrador -> instala/compila backend y frontend -> API opcional -> sincroniza hora remota -> carga perfil local -> inicia scheduler -> muestra ventana principal.

Estados: elevacion pendiente, API offline con modo local, hora no disponible con dialogo explicativo, arranque correcto.

### Primer uso

Ventana principal -> perfil personal local -> catalogo de scripts -> expandir un script -> revisar dominios y horario -> activar bloqueo semanal o crear un compromiso.

Errores: sin scripts, compromiso ya creado, permisos insuficientes, hora remota no disponible.

### Bloqueo semanal

Pulsar `Bloquear semana` -> confirmar -> calcular semana usando hora confiable -> detectar scripts ya configurados -> crear compromisos restantes -> refrescar scheduler -> mostrar resultado.

### Bloqueo de prueba

Pulsar `Bloqueo de prueba` -> confirmar -> crear ventanas cortas para scripts aplicables -> activar scheduler -> mostrar bloqueos activos -> cancelar desde el panel de bloqueos activos.

### Bloqueo de dormir

Scheduler detecta compromiso con `showLockScreen` -> crea ventana fullscreen/kiosk -> muestra countdown -> mantiene el foco -> destruye la ventana cuando termina el horario.

### Foco diario

Pulsar `Vista previa` o usar `Ctrl+Shift+P` -> ventana fullscreen de 30 segundos -> cargar progreso persistente -> iniciar una tarea -> esperar su duracion -> completar -> cerrar por timeout.

La tarea `Backtesting` libera el kiosk para permitir trabajar con el ordenador mientras el progreso sigue almacenado.

### Instagram

Script de Instagram -> 15 minutos gratuitos diarios -> iniciar/pausar ventana de Instagram -> guardar tiempo consumido -> comprar tiempo adicional por 15 monedas -> objeto en `Mis objetos` -> usarlo -> sumar minutos al mismo contador.

### Videojuegos

Crear bloqueo permanente de videojuegos -> comprar objeto -> guardar en inventario -> usar -> liberar Steam/Minecraft durante el tiempo comprado -> pausar y guardar restante -> reanudar con `Usar` -> cerrar procesos al terminar el tiempo de desbloqueo.

### Tienda

Saldo -> comprar recompensa -> confirmacion -> descontar monedas -> inventario persistente -> usar objeto -> feedback -> scheduler actualizado.

Estados de error: saldo insuficiente, objeto no disponible, bloqueo objetivo inexistente, escritura fallida, doble accion.

### Reinicio y recuperacion

Cerrar/reabrir -> leer JSON persistentes -> mantener saldo, compras, sesiones y compromisos -> scheduler reconcilia bloqueos y procesos.

## Problemas corregidos

### Critica / Alta

- Escrituras JSON parciales: corregido con escritura temporal y rename atomico.
- Fallos del scheduler ocultos: corregido; ahora se emiten mediante `BlockingState.lastError`.
- Fallos de hora remota transitorios: corregido con tres intentos y backoff.
- Fallo de sincronizacion en arranque sin explicacion: corregido con dialogo nativo.
- Preview de foco duplicada: eliminada la ruta obsoleta y conectada la persistencia real.
- Inventario usado visible como disponible: corregido; solo aparecen objetos utilizables o activos.

### Media

- Countdown de descanso sin anuncio accesible: corregido con `aria-live`.
- Movimiento no reducible: corregido con `prefers-reduced-motion`.
- Preview de foco desbordada en pantallas pequenas: corregido con scroll limitado.
- Capacidad del inventario ambigua: corregido mostrando objetos y minutos totales.
- La preview simulaba tareas reales: corregido con un estado efimero separado.
- El bloqueo diario no estaba conectado al scheduler: corregido con `dailyFocusActive` y una ventana propia.

## Gaps restantes

### Arquitectura de producto

- No existe sistema de workspaces.
- No existen paneles acoplables, resize, reorder, close/restore ni layouts persistentes.
- No existe contexto de trading real: charts, DOM, posiciones, ordenes o datos de mercado.
- No existe navegacion entre workspaces porque solo hay una vista de perfil.

Resolver estos puntos requiere definir el producto real de Clarity y crear un modelo de workspace/paneles antes de implementarlos.

### Riesgos tecnicos restantes

- Los JSON locales no tienen locking entre procesos independientes; el single-instance lock reduce el riesgo, pero no sustituye un lock de archivo.
- La hora confiable depende de red durante el arranque. Si todas las fuentes fallan, la app se detiene con un dialogo claro para evitar usar la hora manipulable local.
- El timer gratuito de Instagram conserva su estado en localStorage del renderer; conviene migrarlo completamente al store principal para centralizar la autoridad y evitar diferencias entre ventanas.
- La prueba automatica cubre logica compartida y compilacion, pero no sustituye pruebas E2E de Electron, teclado, multi-monitor o procesos reales de Windows.

## Mejoras UX priorizadas

1. Crear onboarding para explicar perfil, bloqueo semanal y diferencia entre comprar y usar un objeto.
2. Sustituir confirmaciones nativas restantes por un componente modal reutilizable.
3. Añadir un centro de ayuda con shortcuts visibles: `Ctrl+L` para bloqueo semanal y `Ctrl+Shift+P` para preview.
4. Añadir estado de conectividad y ultima sincronizacion de hora.
5. Añadir lock de archivo o una base de datos local transaccional si se abandona el modo single-instance.
6. Migrar el timer de Instagram al proceso principal.
7. Crear pruebas E2E con Electron para compra, uso, pausa, reinicio y bloqueo de procesos.

## Quick Wins

- Mantener avisos con cierre manual y expiracion automatica.
- Mantener botones con estados de carga y disabled durante IPC.
- Añadir descripciones accesibles a botones disabled.
- Añadir contadores y estados textuales, no solo color.
- Revisar todos los textos visibles para que pasen por i18n.
- Añadir una vista de diagnostico para permisos de administrador, hora remota y scheduler.

## Riesgos de abandono

- El usuario puede no saber que comprar no equivale a usar un objeto.
- Un error de permisos puede parecer un bloqueo que no funciona si no se explica.
- El requisito de internet para verificar la hora puede impedir el arranque en viajes o redes cautivas.
- El modelo actual puede sentirse como una app de productividad, no como una terminal de trading, porque el contexto de trading de Revision.md no existe en el codigo.

## Validacion

Comandos ejecutados en `frontend`:

- `npm.cmd run build`
- `npm.cmd test`

Resultado actual: build correcto y 62 tests pasados.
