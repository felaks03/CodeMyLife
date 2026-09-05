# CodeMyLife

## Resumen

CodeMyLife sera una aplicacion de escritorio para Windows que permite a las personas usuarias activar scripts que modifican el comportamiento de su ordenador durante periodos definidos. Un caso inicial es bloquear YouTube entre dos horas elegidas para cumplir un compromiso semanal.

## Estado

Aplicacion funcional en desarrollo. Implementado: cuentas con email y contrasena, compromisos con horario por dias, bloqueo real mediante el archivo `hosts`, ejecucion en segundo plano desde la bandeja del sistema, notificaciones, estadisticas con racha y calendario, e interfaz en espanol e ingles.

Pendiente de implementar: inicio de sesion con Google, verificacion de email y recuperacion de contrasena con Amazon SES, auto-actualizacion y suscripcion de pago. Todas requieren credenciales o infraestructura todavia no disponibles.

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

## Tecnologia y Arquitectura

- App de escritorio: Electron (JS/TS).
- Backend/API: Node.js.
- Base de datos: MongoDB.
- Hosting del backend: nube grande (AWS/Azure/GCP, por concretar cual).
- Autenticacion: login social con Google ademas de email/contrasena propios.
- Envio de emails (verificacion, recuperacion de contrasena): Amazon SES.
- La app pedira permisos de administrador/elevados en Windows para poder bloquear paginas y protegerse de cierres del proceso.
- La aplicacion tendra auto-actualizacion cuando se publiquen nuevas versiones.
- El backend vive en la carpeta `backend/` de este mismo repositorio (CodeMyLife), junto al frontend en `frontend/`; la landing page sigue en su propio repositorio (CodeMyLifeLP).
- Experiencia previa del equipo: backend con Node.js, frontend con Angular.
- Proveedor de nube: AWS.

## Modelo de Negocio

- Suscripcion mensual/anual.

## Publico Objetivo

- Cualquier persona con problemas de procrastinacion o adiccion digital que quiera imponerse compromisos de bloqueo.

## Accesibilidad

- No es prioridad para la primera version.

## Catalogo de Scripts

- El primer lanzamiento incluira unicamente el script de bloqueo de YouTube.
- El resto de scripts se disenaran y desarrollaran por separado mas adelante.

## Metodo Tecnico de Bloqueo

- Bloqueo mediante modificacion del archivo hosts de Windows combinado con un proxy/servicio local que intercepta y filtra el trafico, ya que cubre navegador, apps de escritorio/PWA y enlaces externos con un unico mecanismo.
- El proceso de la app se ejecutara como servicio o con proteccion adicional para dificultar su cierre mientras un compromiso este activo (requiere los permisos de administrador ya acordados).

## Recuperacion ante Fallos

- No existira una via para que la persona usuaria se desbloquee antes de tiempo durante un compromiso activo.
- Debera existir una recuperacion tecnica solo para casos de fallo real del sistema (por ejemplo corrupcion de datos o error de la app), gestionada por el equipo de CodeMyLife, nunca accesible directamente por la persona usuaria.

## Decisiones Pendientes

- Necesidades concretas y casos de uso detallados de las personas usuarias objetivo.
- Permisos y alcance exacto del script de bloqueo de YouTube.
- Precio y planes de la suscripcion.

## Como Ejecutar

Requisitos: Node.js 22.12 o superior y una base de datos MongoDB accesible (por ejemplo un cluster gratuito de MongoDB Atlas).

Arranque completo (API + aplicacion) desde la raiz del repositorio:

```bash
./run.sh
```

Antes del primer arranque, copia `backend/.env.example` a `backend/.env` y rellena `MONGODB_URI` y `JWT_SECRET`.

Comandos por proyecto:

```powershell
# backend/
npm install; npm run build; npm start

# frontend/
npm install; npm test; npm start
```

El bloqueo modifica el archivo `hosts` de Windows, asi que la aplicacion debe ejecutarse como administrador para que las restricciones se apliquen. Sin permisos elevados la app funciona, pero muestra un aviso y no bloquea.

Al cerrar la ventana la aplicacion sigue ejecutandose en la bandeja del sistema para mantener el bloqueo. Salir mientras hay un compromiso activo pide confirmacion explicita.

## Publicar

```bash
./produccion.sh
```

Valida el repositorio, compila, ejecuta los tests, genera el instalador de Windows en `frontend/dist_electron/` y sube la version etiquetada. El despliegue del backend se ejecuta a traves de la variable `CODEMYLIFE_DEPLOY_CMD`.

## Estructura

```text
CodeMyLife/
├── backend/       # API Node.js + Express + MongoDB
├── frontend/      # Aplicacion de escritorio Electron
│   ├── assets/    # Iconos generados con scripts/generate-icons.js
│   ├── src/main/  # Proceso principal: bandeja, sesion, planificador, bloqueo
│   ├── src/shared/# Logica pura de horarios y archivo hosts (con tests)
│   └── src/renderer/ # Interfaz
├── run.sh         # Arranque local
└── produccion.sh  # Publicacion
```

## Proceso de Definicion

Las respuestas de producto y tecnologia se iran incorporando a este README antes de iniciar la implementacion.