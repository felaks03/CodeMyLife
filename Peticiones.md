# Peticiones Y Requisitos De CodeMyLife

Documento vivo. Cada nueva petición debe añadirse aquí, con su estado y una prueba asociada.

## Reglas Funcionales

- [x] Los bloqueos activos no deben cortar la conexión general a Internet.
- [x] Un bloqueo solo puede afectar a los dominios o procesos que define su propio script.
- [x] Activar el bloqueo de videojuegos no debe bloquear YouTube, Instagram ni otros dominios no relacionados.
- [x] Activar el bloqueo semanal invalida excepciones temporales antiguas y aplica el bloqueo de Instagram inmediatamente.
- [x] Bloquear semana no muestra el mensaje obsoleto de integración con Chrome para Instagram.
- [x] El bloqueo de YouTube solo debe actuar dentro de su horario configurado.
- [x] Las entradas antiguas de bloqueos no deben seguir activas fuera de su horario o después de cancelarse.
- [x] Cualquier cambio en dominios bloqueados debe reflejarse en hosts sin borrar entradas ajenas del usuario.

## Tienda E Inventario

- [x] Comprar Tiempo de videojuegos crea o aumenta el inventario sin iniciar accidentalmente una sesión pausada.
- [x] Comprar durante una sesión activa suma el tiempo restante real y no vuelve a 60 minutos.
- [x] Varias compras de videojuegos se consolidan en los minutos totales disponibles.
- [x] Pausar guarda el tiempo restante y no deja la interfaz atascada en `Guardando...`.
- [x] Las compras activas con `unlockUntil` no deben convertirse automáticamente en objetos usados.
- [x] El primer render tras `Usar` no debe mezclar el reloj local con la hora confiable y saltar de 59 minutos a valores incorrectos.
- [x] Al cerrar la app o apagar el ordenador, los timers activos deben pausarse y guardar el restante automáticamente.
- [x] El selector de aplicaciones se retiró por decisión del usuario; `Usar Juegos` activa directamente el tiempo.
- [x] Revisar todas las transiciones: comprar, usar, pausar, reanudar, agotar, reiniciar, comprar activo y comprar pausado.
- [x] El inventario debe mostrar siempre los minutos reales disponibles y los botones correctos.
- [x] Instagram debe conservar sus 15 minutos gratuitos diarios y los minutos comprados después de reiniciar.
- [x] Instagram conserva sesiones compradas en wallet con `Usar` y `Pausar`.
- [x] Instagram y videojuegos deben compartir el mismo componente visual de timer `MM:SS`; videojuegos usa variante verde.
- [x] Instagram y videojuegos muestran el timer en la misma posicion y formato `MM:SS`; videojuegos usa variante verde e Instagram azul.
- [x] Instagram y videojuegos comparten exactamente la misma estructura: titulo, descripcion, timer y boton alineados.
- [x] Tiempo de videojuegos cuesta 20 monedas y dura 20 minutos.
- [x] Tiempo de Instagram cuesta 5 monedas y dura 5 minutos.
- [x] Las filas usan una cuadrícula común fija para que timer y botón queden en la misma posición real.
- [x] Los mensajes de éxito aparecen en verde y los mensajes de error aparecen en rojo.
- [x] Se eliminaron de la interfaz las vistas previas y los bloqueos de prueba.
- [x] El bloqueo diario cubre todos los monitores conectados con una ventana kiosk por pantalla.
- [x] Cold shower dura 10 minutos.
- [x] Gym dura 60 minutos.
- [x] Existe un botón de desarrollo para saltar el bloqueo diario solo durante el día actual.
- [x] El botón de desarrollo de saltar bloqueo aparece en la pantalla fullscreen de tareas.
- [x] Las notificaciones aparecen como una capa fija y no desplazan la interfaz.
- [x] La build empaquetada usa un directorio de datos de producción separado y no reutiliza datos de pruebas.
- [x] La build empaquetada migra el wallet legacy si el almacén de producción aún no existe, conservando monedas y recompensas.

## Foco Diario

- [x] Se eliminó la preview temporal de 30 segundos.
- [x] El bloqueo diario usa únicamente el progreso real de la mañana.
- [x] El bloqueo real de 08:00 a 15:00 debe usar el progreso persistente.
- [x] Solo puede haber una tarea activa.
- [x] Gym no debe exigirse durante el fin de semana.
- [x] La cuenta atrás de cada tarea debe actualizarse cada segundo en el bloqueo real.
- [x] Completar una tarea diaria añade sus monedas al wallet y revierte el progreso si falla la recompensa.

## Estabilidad Y Seguridad

- [x] La hora sensible usa autoridad remota con fallback.
- [x] Wallet, compromisos y foco diario usan escrituras atómicas.
- [x] Los errores del scheduler deben aparecer en la interfaz.
- [x] Revisar revalidación cuando un compromiso expira durante una compra o pausa.
- [ ] Añadir pruebas E2E de rollback de wallet y compromisos con fallos reales de escritura.
- [ ] Añadir pruebas E2E de reinicio y migración de inventario antiguo.

## UX Y Accesibilidad

- [x] Avisos cerrables y autoexpirables.
- [x] Focus states y reduced motion.
- [x] Countdown con `aria-live`.
- [x] Inventario con minutos totales en lugar de un contador ambiguo de registros.
- [x] Validar todos los botones con teclado y estados disabled explicados.
- [x] Mantener textos visibles y estados consistentes entre Instagram y videojuegos.

## Pruebas Pendientes

- [ ] Activar solo videojuegos: YouTube debe seguir funcionando (requiere prueba manual con UAC/hosts).
- [x] Activar solo YouTube dentro de horario: solo YouTube debe bloquearse (tests de horario y dominios).
- [x] Activar varios scripts: cada uno debe respetar su horario y dominios (tests de schedule).
- [x] Confirmar que no se crea una regla de hosts para dominios no activos (tests de hosts/schedule).
- [x] Añadir cobertura de todos los dominios de los scripts integrados y sus aliases en hosts.
- [x] Comprar con 42 minutos activos: resultado 102 minutos.
- [x] Comprar dos veces sin usar: un único saldo de 120 minutos.
- [ ] Pausar, reiniciar y reanudar sin perder tiempo (requiere prueba manual de Electron).
- [ ] Instagram gratis + compra de 5 minutos + reinicio (requiere prueba manual de Electron).
- [x] Ejecutar build y suite completa después de cada bloque.
- [x] Suite de contratos de producto: UI, updater, multi-monitor, `newversion`, timers, notificaciones, persistencia, rollback estructural y ausencia de pruebas.

## Registro De Cambios

### 2026-09-14

- Añadido el requisito: los bloqueos activos no deben cortar Internet ni bloquear elementos ajenos.
- Añadida la prueba específica de YouTube frente al bloqueo de videojuegos.
- Creado este documento como lista viva de peticiones y validaciones.
- Detectado un bloque stale de YouTube en `hosts`: el blocker asumía que un proceso nuevo ya estaba reconciliado porque su lista interna empezaba vacía.
- Corregido `HostsBlocker` para forzar la primera reconciliación y limpiar entradas administradas antiguas.
- Corregida la normalización del wallet: no marca como usados los objetos activos solo porque tengan `unlockUntil`.
- Confirmado el diseño final del inventario: un único saldo acumulado de videojuegos y solo dos acciones, `Usar` y `Pausar`.
- Corregido el renderer para mostrar una única fila de videojuegos, agregando todos los minutos no consumidos y ocultando históricos duplicados.
- Corregido el salto del timer tras `Usar`: el primer render usa `remainingSeconds` persistido y el ticker confiable descuenta después.
- Añadido selector de aplicación para videojuegos, apertura desde el proceso principal y monitorización del cierre.
- Implementado el flujo persistente de Instagram: el objeto comprado ya no se consume al activar, guarda `startedAt`/`remainingSeconds` y se pausa desde el mismo timer.
- Añadida pausa automática de sesiones activas al cerrar la ventana, salir de la app o recibir el evento de apagado de Windows.
- Eliminados los restos de preview, bloqueos de prueba y timer temporal de tareas; el foco diario solo usa la pantalla real de 08:00 a 15:00.
- Añadida revalidación de compromisos durante compra/pausa.
- Añadidos tests de horario de YouTube, aislamiento de videojuegos y preservación de entradas manuales de hosts.
- Añadidos estados ARIA para botones de compra y uso/pausa.
- Añadida suite `product-contract.test.ts` para verificar requisitos de producto y evitar regresiones estructurales.
