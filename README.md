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

## Alcance Inicial

- Scripts configurables para modificar determinadas funciones del ordenador.
- Un script inicial para bloquear el acceso a YouTube segun un horario.
- Configuracion de horarios de bloqueo semanales.
- Mecanismo para impedir que los ajustes se desactiven durante un compromiso activo.
- Registro e inicio de sesion.
- Sincronizacion de configuracion entre la aplicacion y el servicio en la nube.

## Decisiones Pendientes

- Personas usuarias objetivo y sus necesidades concretas.
- Tecnologia y arquitectura de escritorio, servicio y sincronizacion.
- Catalogo de scripts del primer lanzamiento y sus permisos.
- Metodo de bloqueo de YouTube y navegadores compatibles.
- Definicion exacta de "bloquear los ajustes" y procedimiento de recuperacion.
- Nivel de resistencia esperado ante la desinstalacion, modificacion del sistema o cierre de procesos.
- Modelo de negocio, si aplica.
- Opciones de accesibilidad.

## Proceso de Definicion

Las respuestas de producto y tecnologia se iran incorporando a este README antes de iniciar la implementacion.