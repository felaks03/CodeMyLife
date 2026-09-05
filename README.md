# CodeMyLife

## Resumen

CodeMyLife sera una aplicacion de escritorio para Windows que permite a las personas usuarias activar scripts que modifican el comportamiento de su ordenador durante periodos definidos. Un caso inicial es bloquear YouTube entre dos horas elegidas para cumplir un compromiso semanal.

## Estado

Proyecto en fase de definicion. Aun no se ha implementado codigo de la aplicacion.

## Decisiones Confirmadas

- El producto sera una aplicacion de escritorio para Windows.
- La funcion principal sera activar y configurar scripts de control del equipo.
- La primera version incluira inicio de sesion y registro obligatorios.
- Los datos se sincronizaran en la nube; algunas funciones podran requerir conexion a Internet.
- La interfaz estara disponible inicialmente en espanol e ingles.
- La experiencia visual sera sencilla, utilitaria y orientada a productividad, con VS Code como referencia.
- La aplicacion no esta prevista para manejar datos sensibles.
- El bloqueo debe seguir activo aunque la persona usuaria cierre la aplicacion.
- El flujo de exito inicial es: iniciar sesion, elegir el script de bloqueo de YouTube, configurar su horario, bloquear los ajustes para la semana y mantener la restriccion activa fuera de la aplicacion.
- Los scripts los podra crear el equipo de CodeMyLife y tambien los usuarios (crear/importar los suyos).
- El bloqueo de YouTube (ejemplo inicial, no exclusivo) cubrira el sitio web, la app de escritorio/PWA y enlaces abiertos desde otras apps, en todos los navegadores instalados.
- El horario de bloqueo se podra configurar por dias concretos de la semana, no solo toda la semana.
- Mientras un compromiso este activo no se podra pausar ni modificar; no habra periodo de gracia.
- Se busca dificultar que la persona usuaria rompa un compromiso voluntario (por ejemplo cerrando el proceso o desinstalando la app), aunque siempre debe existir una via clara de recuperacion si algo sale mal.
- Nadie podra desbloquear un compromiso antes de tiempo, ni el propio usuario.
- No habra sincronizacion de perfiles/configuracion entre varios equipos Windows del mismo usuario (de momento).
- Los datos minimos de cuenta seran email, nombre, historial de bloqueos y estadisticas de cumplimiento.
- La verificacion de email y recuperacion de contrasena se hara mediante un servicio de envio de emails (por definir cual).
- Si no hay Internet durante un bloqueo ya configurado, el bloqueo se mantiene activo (modo offline).
- Habra notificaciones antes de empezar/terminar un bloqueo y al intentar abrir contenido restringido.
- La aplicacion no se iniciara automaticamente al encender Windows por ahora; podria anadirse en el futuro.
- Se mostraran estadisticas completas: tiempo bloqueado, compromisos cumplidos, rachas y calendario.
- El proyecto esta pensado como un producto publico.

## Alcance Inicial

- Scripts configurables para modificar determinadas funciones del ordenador, creados por el equipo o importados por la persona usuaria.
- Un script de ejemplo para bloquear el acceso a YouTube segun un horario (no es el unico bloqueo previsto).
- Configuracion de horarios de bloqueo por dias concretos de la semana.
- Mecanismo para impedir que los ajustes se desactiven o el proceso se cierre durante un compromiso activo, con una via de recuperacion clara.
- Registro e inicio de sesion, con verificacion de email y recuperacion de contrasena via servicio de email.
- Notificaciones de inicio/fin de bloqueo y de intentos de acceso a contenido restringido.
- Estadisticas de uso: tiempo bloqueado, compromisos cumplidos, rachas y calendario.

## Decisiones Pendientes

- Personas usuarias objetivo y sus necesidades concretas.
- Tecnologia y arquitectura de escritorio, servicio y sincronizacion.
- Catalogo de scripts del primer lanzamiento (mas alla del ejemplo de YouTube) y sus permisos.
- Metodo tecnico exacto de bloqueo por navegador/sistema.
- Definicion exacta de "bloquear los ajustes" y procedimiento tecnico de recuperacion ante fallos.
- Servicio de envio de emails a utilizar.
- Modelo de negocio, si aplica.
- Opciones de accesibilidad.

## Proceso de Definicion

Las respuestas de producto y tecnologia se iran incorporando a este README antes de iniciar la implementacion.