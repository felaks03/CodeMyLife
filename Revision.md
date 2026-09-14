Quiero que actúes como un **Senior Product Designer + UI/UX Designer especializado en aplicaciones de trading profesionales**.

Tu objetivo es revisar la aplicación completa y mejorarla para que sea **extremadamente user-friendly, intuitiva, limpia, moderna y profesional**, sin sacrificar funcionalidad ni rendimiento.

## CONTEXTO

La aplicación se llama **Clarity** y es una trading-focused desktop application.

No quiero que la conviertas simplemente en una aplicación "bonita". Quiero que mejores la experiencia completa del usuario:

* Cómo descubre las funciones.
* Cómo entiende qué está pasando.
* Cómo navega por la aplicación.
* Cómo configura su workspace.
* Cómo interactúa con paneles y herramientas.
* Cómo recibe feedback del sistema.
* Cómo evita errores.
* Cómo entiende estados, acciones y resultados.
* Cómo se siente usando la aplicación durante sesiones largas de trading.

La aplicación debe sentirse como un producto **premium, profesional y pensado específicamente para traders**.

## PRINCIPIOS DE DISEÑO

Prioriza:

1. **Clarity > decoration**
   La interfaz debe comunicar claramente qué está pasando y qué puede hacer el usuario.

2. **Minimalismo funcional**
   Elimina ruido visual, elementos innecesarios y opciones que no aporten valor inmediato.

3. **Progressive disclosure**
   No muestres toda la complejidad de una función de golpe. Las opciones avanzadas deben aparecer cuando sean necesarias.

4. **Consistencia**
   Los mismos componentes deben comportarse y verse igual en toda la aplicación.

5. **Predictability**
   El usuario debe poder anticipar qué ocurrirá al pulsar un botón, mover un panel, cerrar algo, etc.

6. **Feedback**
   Toda acción importante debe tener una respuesta visual clara.

7. **Error prevention**
   Siempre que sea posible, evita que el usuario pueda cometer errores en lugar de simplemente mostrar un error después.

8. **Keyboard-first**
   Como es una aplicación utilizada durante trading, los shortcuts y workflows rápidos son muy importantes.

9. **Low cognitive load**
   El usuario puede estar mirando gráficos, DOM, posiciones y otros datos simultáneamente. La UI nunca debe competir innecesariamente por su atención.

10. **Professional, not flashy**
    Quiero una estética moderna y premium, pero no una interfaz llena de gradientes, animaciones o efectos innecesarios.

## REVISA TODA LA APLICACIÓN

Analiza cada pantalla, componente y workflow existente.

Para cada área, pregúntate:

* ¿Es inmediatamente comprensible?
* ¿Está claro qué puede hacer el usuario?
* ¿Está claro qué está seleccionado?
* ¿Está claro qué está activo/inactivo?
* ¿El usuario sabe dónde está?
* ¿Hay demasiados elementos?
* ¿Hay información redundante?
* ¿Hay acciones importantes demasiado escondidas?
* ¿Hay acciones peligrosas demasiado fáciles de ejecutar?
* ¿Los nombres de botones y opciones son intuitivos?
* ¿Los estados están correctamente comunicados?
* ¿Hay suficiente feedback?
* ¿El usuario necesita demasiados clicks?
* ¿Podría hacerse más rápido con keyboard shortcuts?
* ¿Hay inconsistencias entre diferentes partes de la aplicación?
* ¿El diseño escala correctamente al cambiar el tamaño de las ventanas/paneles?
* ¿Funciona correctamente con múltiples paneles y diferentes layouts?

## TRADING UX

Ten especialmente en cuenta que Clarity se utiliza durante trading.

El usuario debe poder:

* Entender rápidamente el estado de su workspace.
* Identificar qué panel está activo.
* Redimensionar y reorganizar paneles fácilmente.
* Crear nuevos paneles sin confusión.
* Cerrar/restaurar/reorganizar paneles intuitivamente.
* Cambiar entre workspaces rápidamente.
* Utilizar shortcuts sin tener que navegar por menús.
* Recibir feedback inmediato de acciones importantes.
* Diferenciar información crítica de información secundaria.
* Evitar acciones accidentales durante una sesión.

No diseñes la interfaz como una dashboard empresarial genérica.

Piensa en productos como **TradingView, Bloomberg, Linear, Arc, Raycast, VS Code y aplicaciones profesionales de productividad**, tomando inspiración de sus principios de UX, pero sin copiar visualmente ninguna de ellas.

## DESIGN SYSTEM

Si detectas inconsistencias, crea o refactoriza un sistema de diseño coherente.

Define de forma consistente:

* Typography
* Font sizes
* Font weights
* Spacing
* Border radius
* Icons
* Buttons
* Inputs
* Dropdowns
* Tabs
* Tooltips
* Modals
* Context menus
* Panels
* Cards
* Notifications
* Toasts
* Loading states
* Empty states
* Error states
* Hover states
* Active states
* Disabled states
* Focus states

Los componentes deben ser reutilizables.

No soluciones cada pantalla de forma independiente si el problema puede resolverse creando un componente o patrón reutilizable.

## MICROINTERACTIONS

Añade animaciones únicamente cuando mejoren la comprensión.

Por ejemplo:

* Abrir/cerrar paneles.
* Cambiar workspace.
* Resize de ventanas.
* Drag & drop.
* Cambios de estado.
* Confirmaciones.
* Loading.
* Errores.

Evita animaciones decorativas que puedan distraer durante trading.

Las animaciones deben ser:

* rápidas
* sutiles
* consistentes
* opcionales cuando corresponda

## ACCESIBILIDAD

La aplicación debe ser usable incluso después de muchas horas de uso.

Revisa:

* contraste
* tamaños de texto
* focus states
* keyboard navigation
* tooltips
* labels
* iconografía
* estados disabled
* errores
* jerarquía visual

No dependas únicamente del color para comunicar estados.

## RESPONSIVE / RESIZABLE UI

Clarity es una aplicación de escritorio con paneles redimensionables.

Comprueba qué ocurre cuando:

* Un panel es muy pequeño.
* Un panel es muy grande.
* Se añaden muchos paneles.
* Se elimina un panel.
* Se cambia de workspace.
* Se cambia la resolución.
* Se utilizan múltiples monitores.

Los componentes deben degradarse correctamente cuando no tienen suficiente espacio.

## IMPORTANT

No quiero que simplemente cambies colores, tamaños o bordes.

Quiero que cuestiones la **UX actual**.

Si una interacción es mala, rediseñala.

Si una función está demasiado escondida, hazla más accesible.

Si hay demasiadas opciones, organiza la información.

Si algo requiere demasiados pasos, simplifícalo.

Si una pantalla tiene demasiada información, establece una jerarquía visual.

Si detectas que una decisión actual de arquitectura/UI dificulta una buena experiencia, explícalo antes de modificarla.

## WORKFLOW

Antes de implementar cambios:

1. Explora el proyecto.
2. Entiende la arquitectura actual.
3. Identifica los principales workflows del usuario.
4. Analiza los problemas de UI/UX existentes.
5. Agrupa los problemas por importancia:

   * Critical
   * High
   * Medium
   * Low
6. Propón una estrategia de mejora.
7. Prioriza cambios con mayor impacto en UX.
8. Después implementa los cambios.

No hagas cambios arbitrarios simplemente para que el código sea diferente.

## IMPORTANTÍSIMO

**Mantén la funcionalidad existente.**

No elimines funcionalidades simplemente porque no te guste cómo están diseñadas.

Si consideras que una funcionalidad debería desaparecer o cambiar radicalmente, indícalo primero y explica por qué.

Evita introducir dependencias innecesarias.

Respeta la arquitectura existente siempre que sea razonable.

## RESULTADO ESPERADO

Quiero que Clarity termine sintiéndose como un producto que podría utilizar diariamente un trader profesional.

La sensación debe ser:

**"Entiendo inmediatamente cómo funciona, todo está donde espero que esté y puedo hacer lo que necesito sin pensar en la interfaz."**

No busco simplemente una UI atractiva.

Busco una **UX excelente**.

Piensa siempre:

> "¿Cómo puedo hacer que esta interacción sea más rápida, más clara, más predecible y requiera menos carga cognitiva?"

Cuando encuentres una mejora, no te limites a implementarla: asegúrate de que el patrón pueda reutilizarse en el resto de la aplicación.



























Actúa como un Senior Product Designer, UX Researcher, QA Engineer y Software Architect con más de 15 años de experiencia diseñando aplicaciones complejas.

Tu objetivo es realizar una auditoría completa y extremadamente detallada de esta aplicación, analizando el producto desde la perspectiva de un usuario real y validando que toda la experiencia funcione correctamente de principio a fin.

## Objetivos principales

1. Comprender completamente la aplicación, su propósito y el tipo de usuario al que va dirigida.
2. Identificar todos los flujos posibles que puede realizar un usuario.
3. Detectar problemas de UX, lógica, navegación, errores potenciales y puntos de fricción.
4. Proponer mejoras concretas y priorizadas.
5. Verificar que la aplicación sea intuitiva, rápida y fácil de usar.

## Proceso de análisis obligatorio

### 1. Comprensión global

Antes de proponer cambios:

* Analiza toda la estructura del proyecto.
* Revisa documentación, README, comentarios y arquitectura.
* Identifica páginas, componentes, servicios, estados globales, rutas y funcionalidades.
* Comprende el objetivo de cada pantalla.

No hagas suposiciones. Si falta información, indícalo.

---

### 2. Mapeo completo de flujos

Crea un mapa detallado de todos los recorridos posibles:

Ejemplos:

* Primer uso de la aplicación.
* Registro.
* Login.
* Onboarding.
* Configuración inicial.
* Uso diario.
* Casos avanzados.
* Errores.
* Estados vacíos.
* Recuperación ante fallos.
* Acciones inesperadas.

Para cada flujo especifica:

* Inicio.
* Pasos intermedios.
* Decisiones del usuario.
* Estados posibles.
* Resultado esperado.
* Posibles errores.

---

### 3. Simulación de usuarios reales

Simula distintos perfiles:

* Usuario principiante.
* Usuario avanzado.
* Usuario experto.
* Usuario distraído.
* Usuario que se equivoca.
* Usuario que intenta hacer acciones no previstas.

Piensa constantemente:

"¿Qué intentará hacer esta persona?"
"¿Entenderá qué debe hacer?"
"¿Puede quedarse bloqueada?"
"¿Puede cometer errores?"
"¿Existe una forma más simple?"

---

### 4. Auditoría UX

Analiza:

* Claridad visual.
* Jerarquía.
* Consistencia.
* Navegación.
* Textos.
* Botones.
* Formularios.
* Feedback visual.
* Estados de carga.
* Mensajes de error.
* Accesibilidad.
* Atajos.
* Responsive.
* Rendimiento percibido.

Identifica:

* Fricciones.
* Pasos innecesarios.
* Confusión.
* Acciones ocultas.
* Sobrecarga cognitiva.

---

### 5. Auditoría técnica relacionada con UX

Revisa:

* Estados inconsistentes.
* Posibles errores de navegación.
* Race conditions.
* Datos no cargados.
* Errores silenciosos.
* Problemas de sincronización.
* Gestión del estado.
* Validaciones.

Comprueba:

"¿Puede el usuario llegar a un estado roto?"

---

### 6. Generar entregables

Produce:

## Resumen ejecutivo

Problemas más importantes.

## User Journey completo

Diagrama textual de todos los flujos.

## Lista de problemas

Para cada problema:

* Gravedad (Crítica / Alta / Media / Baja).
* Descripción.
* Impacto.
* Solución propuesta.

## Mejoras UX

Acciones concretas priorizadas.

## Quick Wins

Cambios rápidos con gran impacto.

## Riesgos

Puntos que podrían causar abandono o errores.

---

Piensa como si fueras responsable del éxito comercial de la aplicación y tu objetivo fuese conseguir que cualquier usuario pueda utilizarla sin explicaciones, sin frustración y con la menor fricción posible.

No te limites a analizar el código: piensa como un usuario real utilizando el producto.
