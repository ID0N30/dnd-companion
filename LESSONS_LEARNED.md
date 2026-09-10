# Lecciones Aprendidas y Reglas Arquitectónicas del Proyecto (D&D Companion)

Este documento registra los aprendizajes críticos, patrones de diseño probados y resoluciones a problemas complejos dentro de la aplicación para evitar regresiones futuras.

---

## 1. Botones Flotantes (Floating Action Buttons - FAB) y Posicionamiento CSS

### ⚠️ Regla de Oro: Jamás combinar `.relative` con `.fixed`
- **El Problema**: Si una clase de Tailwind como `.relative` se incluye en un elemento con `.fixed` (por ejemplo, para intentar posicionar un badge o icono secundario con `absolute`), en la cascada de CSS `.relative` puede anular `position: fixed`.
- **Efecto Secundario Detectado**:
  - En contenedores Flex en columna (`flex flex-col`), un hijo `relative` sin ancho fijo se estira ocupando el 100% del ancho de la pantalla justo antes del footer.
  - En contenedores normales, el botón se alinea a la izquierda dentro del flujo del documento y se desplaza al hacer scroll.
- **La Solución**:
  - `position: fixed` ya establece un contexto de posicionamiento para hijos con `position: absolute`.
  - Definir dimensiones explícitas e inmutables: `w-14 h-14 min-w-[3.5rem] min-h-[3.5rem] shrink-0 rounded-full`.
  - Asegurar la posición flotante mediante estilos en línea para inmunidad total a clases externas:
    - **Botón de Dados**: `style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 100 }}`
    - **Buzón del DM**: `style={{ position: 'fixed', bottom: '1.5rem', right: '5.5rem', zIndex: 90 }}`
  - De esta forma, ambos botones quedan fijados en la esquina inferior derecha con una separación limpia de 8px y permanecen inmóviles ante cualquier scroll.

---

## 2. Patrón Singleton en Componentes React / Next.js SPA

### ⚠️ Evitar almacenar IDs de Singleton en `window`
- **El Problema**: En Next.js con navegación SPA (`next/navigation` y `useRouter`), el objeto global `window` no se limpia entre cambios de ruta. Si un componente monta antes de que la página previa termine de desmontarse o si ocurre una condición de carrera, el nuevo componente detecta `window.__activeId` aún presente, se considera secundario y retorna `null`.
- **Efecto Secundario Detectado**:
  - El botón de dados aparecía tras una recarga dura (F5), pero al salir a la página de inicio y volver a entrar a una sala, desaparecía por completo.
- **La Solución**:
  - Utilizar variables de módulo JavaScript en memoria (`let globalActiveId: string | null = null;`).
  - La instancia recién montada siempre reclama el control (`globalActiveId = instanceId; setIsPrimary(true);`).
  - Al desmontarse, solo limpia si la variable global corresponde a su propio ID.

---

## 3. Seguridad y Restricción de Roles en la Interfaz

### ⚠️ Triple Escudo de Autorización para Vistas del DM
- El Buzón del DM (`DMInboxFloatingButton`) contiene información privada enviada por los jugadores. Jamás debe mostrarse a jugadores normales.
- **Implementación en 3 Capas**:
  1. **En la Sala de Campaña (`room/[roomId]/page.tsx`)**: Renderizado condicional `{isDM && <DMInboxFloatingButton roomId={roomId} isDM={isDM} />}`.
  2. **En la Hoja de Personaje (`sheet/page.tsx`)**: Renderizado condicional `{(isDemoMode || isDM) && <DMInboxFloatingButton ... />}`.
  3. **Dentro del Propio Componente (`DMInboxFloatingButton.tsx`)**: Valida internamente contra `currentRoom.dmId === user.uid` o `isDemo`. Si el usuario no es el DM, el componente retorna `null` inmediatamente.

---

## 4. Reasignación de Personajes y Aislamiento por Sala

- Cada personaje creado pertenece estrictamente a una campaña (`char.roomId`).
- En el menú **Ajustes de Cuenta** (exclusivo de la cabecera del Home `/`):
  - Los personajes de prueba (`drizzt_dourden_demo`) se filtran para no saturar la cuenta del usuario.
  - La sala de pruebas (`sin_campaña`, `demo`, `prueba`) se excluye de los destinos de reasignación.
  - Los códigos internos de Firestore (`room.id`) se traducen a sus nombres públicos visibles (`room.name`) mediante `getCampaignDisplayName`.
  - Si una campaña destino requiere contraseña, se valida en Firestore con `verifyRoomPassword` antes de ejecutar la transferencia con `assignCharacterToRoom`.
