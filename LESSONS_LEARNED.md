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

---

## 5. Aislamiento Estricto de Campañas y Eliminación Permanente en Firestore

### ⚠️ Eliminación Real vs Filtrado Local
- **El Problema**: Eliminar un personaje únicamente del estado en memoria (`set({ players: ... })`) y de `localStorage` deja el documento intacto en la subcolección de Firestore (`rooms/${roomId}/players/${playerId}`). Cuando cualquier usuario entra a la sala, la suscripción en tiempo real de Firestore (`onSnapshot`) vuelve a descargar y revivir el personaje eliminado.
- **La Solución**:
  - `deleteCharacter` y el modal de Ajustes de Cuenta deben invocar físicamente `deleteDoc(doc(db, "rooms", roomId, "players", playerId))` a través de `deletePlayerFromRoom`.
  - Al reasignar un personaje de Campaña A a Campaña B, el documento en Campaña A **debe borrarse de Firestore** antes de guardarse en Campaña B.
  - Las suscripciones (`subscribeRoomPlayers`) implementan auto-limpieza (self-healing): si se detecta un personaje remoto cuyo `roomId` no coincide con la sala actual, se descarta de la vista y se purga de Firestore.

### ⚠️ Barrera de Defensa en Profundidad en `savePlayerInRoom`
- Si una función intenta guardar un personaje cuyo `character.roomId` no coincide con el `roomId` destino, `savePlayerInRoom` aborta la escritura de inmediato. Ninguna operación masiva o desincronización puede inyectar personajes foráneos en una campaña ajena.
- Las acciones masivas del DM (`toggleCombatMode`, `levelUpParty`, `advanceTurn`) siempre filtran con `.filter(p => p.roomId === activeRoomId && p.id !== 'drizzt_dourden_demo')` antes de guardar.

### ⚠️ LocalStorage Seguro para Múltiples Campañas
- Jamás sobrescribir `dnd_all_local_players` con `get().players` si el estado en memoria está limitado a los personajes de una sola sala.
- Utilizar funciones de upsert y borrado selectivo (`syncAllLocalPlayersToStorage` y `removeLocalPlayerFromStorage`) que preservan los personajes de todas las demás campañas en el almacenamiento local.

### ⚠️ Prevención de `permission-denied` al Eliminar Personajes en Firestore
- **Causas Raíz Identificadas**:
  1. **Creación sin `ownerId`**: Si un personaje se creaba en `/create` sin adjuntar el `auth.currentUser.uid`, el documento de Firestore quedaba sin propiedad (`ownerId: undefined`). Al evaluar `resource.data.ownerId == request.auth.uid`, Firestore rechazaba la eliminación para jugadores normales.
  2. **Barrido indiscriminado de salas (`availableRooms.forEach`)**: Intentar ejecutar `deleteDoc` en salas ajenas donde el usuario no es DM ni dueño provoca violaciones de permisos.
  3. **Auto-limpieza de clientes sin privilegios**: Si un jugador ordinario detectaba un documento filtrado, no debe emitir `deleteDoc` a menos que sea el dueño de ese documento o el DM de la sala.
  4. **Token de autenticación desincronizado/caducado**: Al cambiar de pestaña o tras periodos de inactividad, el token de Firebase Auth puede desincronizarse.
- **La Solución en 5 Capas**:
  1. **`ownerId` garantizado**: `/create/page.tsx` usa `useAuth()`; `createCharacter`, `savePlayerInRoom` y `assignCharacterToRoom` garantizan que `ownerId` y `ownerName` se backfillen con `auth.currentUser.uid`.
  2. **Eliminación Quirúrgica**: Se elimina únicamente de la sala asignada (`char.roomId`).
  3. **Guardia de rol en Auto-limpieza**: Solo el DM o el `ownerId` del documento pueden invocar `deletePlayerFromRoom` en tiempo real.
  4. **Refresco de Token y Reintento Automático**: En `deletePlayerFromRoom`, si ocurre `permission-denied`, se invoca `auth.currentUser.getIdToken(true)` y se reintenta la eliminación.
  5. **Reglas de Firestore Resilientes**: `firestore.rules` previene errores de evaluación CEL (`resource == null`) y permite a usuarios autenticados limpiar personajes huérfanos sin `ownerId`.

---

## 6. Dinámica de Atributos, Puntos de Golpe y Dados de Golpe (D&D 5ª Edición Oficial)

### ⚠️ Reglas Oficiales de Puntos de Golpe (PG / HP)
1. **Primer Nivel (Puntos de Golpe Iniciales)**:
   - No se tiran dados. Se obtiene el valor máximo del Dado de Golpe de la clase + el modificador de Constitución (`Math.max(1, hitDie + conMod)`).
   - Ejemplo: Guerrero (d10) con CON 16 (+3) inicia con 13 PG.
2. **Subida de Nivel (Nivel 2+)**:
   - Soporte para los dos métodos oficiales de D&D 5e seleccionables por el DM:
     - **Método Fijo (Recomendado)**: Mitad del dado redondeado hacia arriba + 1 (`Math.floor(hitDie / 2) + 1`) + Modificador de CON. (d6 ➔ 4+CON, d8 ➔ 5+CON, d10 ➔ 6+CON, d12 ➔ 7+CON).
     - **Método de Dados (Al azar)**: Tirada de `1d[hitDie]` + Modificador de CON.
3. **Mínimo de 1 PG por Nivel**:
   - Aunque el modificador de CON sea negativo (ej. CON 6, mod -2), la regla oficial estipula que al subir de nivel siempre se gana al menos 1 PG (`Math.max(1, ganancia)`).
4. **Modificador de Constitución Retroactivo**:
   - Si la puntuación de CON aumenta o disminuye permanentemente (por subida de características, dotes o ajuste del DM), el total de PG máximos se recalcula retroactivamente para todos los niveles alcanzados:
     `hpDelta = (newConMod - oldConMod) * level`
   - La vida máxima no puede descender por debajo de `level` (garantía de 1 PG mínimo por nivel).
5. **Reserva de Dados de Golpe y Descansos**:
   - Cada personaje tiene un pool `hitDice: { current: level, max: level, die: classHitDie }`.
   - **Descanso Corto**: El jugador puede gastar dados de golpe individuales para curarse (`1d[die] + conMod` por dado gastado).
   - **Descanso Largo**: Se recupera toda la vida y se regenera la mitad del total de dados de golpe (`Math.max(1, Math.floor(max / 2))`).


