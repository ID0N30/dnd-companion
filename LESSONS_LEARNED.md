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

---

## 7. Blindaje de Reglas de Seguridad (`firestore.rules`) y Subcolección `/whispers`

### ⚠️ Restricción Granular en `/rooms/{roomId}` y Excepción Quirúrgica de Turnos
- **El Problema**: Otorgar permisos globales `allow update: if isAuthenticated();` permitía que cualquier jugador en la sala modificara la contraseña, el nombre de la campaña o el estado de combate del DM.
- **La Solución**:
  - `/rooms/{roomId}` restringe el permiso general de actualización exclusivamente al DM (`resource.data.dmId == request.auth.uid`).
  - Para permitir que un jugador avance el turno de combate cuando finaliza su acción (en modo fallback de Firestore), se implementó una excepción quirúrgica controlada por CEL:
    ```javascript
    allow update: if isAuthenticated() && (
      resource.data.dmId == request.auth.uid || 
      (request.resource.data.dmId == resource.data.dmId && 
       request.resource.data.diff(resource.data).affectedKeys().hasOnly(['currentTurnIndex', 'lastTurnEvent']))
    );
    ```
  - Esta regla asegura que ningún cliente no privilegiado pueda modificar campos ajenos a la rotación de turnos.

### ⚠️ Validación de Propiedad y Límite de Campos en `/players/{playerId}`
- Al crear o actualizar un personaje, se valida estrictamente `ownerId == request.auth.uid` o que el solicitante sea el DM de la sala.
- Se prohíbe la usurpación de personajes impidiendo modificar el `ownerId` original una vez creado (`request.resource.data.ownerId == resource.data.ownerId`).
- Se impide la escalada de privilegios prohibiendo que un jugador se auto-asigne el campo `dmId` y se limita el tamaño de cada documento a `request.resource.data.keys().size() <= 45`.

### ⚠️ Subcolección `/whispers` y la Regla "Rules Are Not Filters"
- **El Principio de Firestore**: En Firestore, las reglas de seguridad son binarias y evaluadas antes de ejecutar la consulta; no actúan como filtros automáticos sobre los datos. Si un cliente solicita una colección completa mediante `collection()` pero una sola regla prohíbe un documento dentro de esa colección, Firestore rechaza la petición completa con `permission-denied`.
- **La Solución Arquitectónica**:
  1. En **Realtime Database (Motor Primario)**, los susurros se agrupan por hilo privado en `/rooms/{roomId}/whispers/{playerUid}/{msgId}`, donde las reglas `database.rules.json` autorizan la lectura y escritura del nodo completo únicamente a `$playerUid === auth.uid` o al DM (`root.child('rooms/' + $roomId + '/meta/dmId').val() === auth.uid`).
  2. En **Firestore (Motor Fallback)**, cada documento almacena `senderUid` y `playerUid`, ejecutando consultas filtradas para cumplir *"rules are not filters"*.

---

## 8. Escalabilidad de Consultas en Firestore (`limit(1)` y `collectionGroup`)

### ⚠️ Prevención de Escaneos Masivos en Validación de Nombres
- **El Problema**: Descargar toda la colección de salas públicas mediante `getDocs(collection(db, "rooms"))` para comprobar en memoria si un nombre estaba duplicado generaba $N$ lecturas innecesarias de Firestore que crecían con el número de campañas.
- **La Solución**:
  - Se almacena el campo indexado `nameLower` al crear cada sala.
  - La comprobación ejecuta consultas puntuales ultra-rápidas con costo $O(1)$ de lectura:
    ```typescript
    const dupQuery = query(collection(db, "rooms"), where("nameLower", "==", nameLower), limit(1));
    ```

### ⚠️ Recuperación Cruzada de Personajes con `collectionGroup`
- **El Problema Previo**: `fetchUserCharactersAcrossRooms` recorría en un bucle secuencial las $N$ salas visitadas por el usuario, consultando cada subcolección individualmente.
- **La Solución Óptima**:
  - Uso de `collectionGroup(db, "players")` con filtro `where("ownerId", "==", userId)` para recuperar en un único disparo todas las fichas del usuario en toda la base de datos, siempre verificando antes que `user?.uid` esté presente para no disparar consultas huérfanas.

---

## 9. Resiliencia (`withRetry` / `withTimeout`), Transacciones Atómicas y Rate-Limiting

### ⚠️ Módulo Central de Resiliencia (`src/lib/firestoreResilience.ts`)
- Todas las operaciones de red críticas de Firestore se envuelven en `withRetry` y `withTimeout`:
  1. **Timeout Determinado**: Límite de 8000 ms mediante `Promise.race` para evitar llamadas colgadas en redes móviles inestables, limpiando siempre el temporizador en el bloque `finally`.
  2. **Backoff Exponencial con Jitter**: Reintento de hasta 3 veces ante errores transitorios (`unavailable`, `deadline-exceeded`, `resource-exhausted`, `network-request-failed`), espaciando los reintentos con variación aleatoria para prevenir el problema del rebaño atronador (*thundering herd*).
  3. **Refresco Proactivo de Token**: Si el primer intento devuelve `permission-denied`, se invoca `auth.currentUser.getIdToken(true)` para renovar el token JWT de Firebase Auth y se reintenta la petición.

---

## 10. Estándar Visual de Cero Emojis, Banners Full-Screen y Modularización (`React.memo`)

### ⚠️ Cero Emojis en la Interfaz y Filosofía de Diseño Grimorio
- Los emojis nativos del sistema operativo se renderizan de manera inconsistente y rompen la estética medieval y arcana de D&D.
- **Estandarización**:
  - Uso exclusivo de activos vectoriales e ilustraciones personalizadas centralizadas en `src/lib/assets.ts` (`ASSETS.banners.*`, `ASSETS.icons.*`) e iconografía SVG mediante `lucide-react`.

---

## 11. Arquitectura Híbrida Firestore + Realtime Database (Optimización Extrema Plan Spark)

### ⚠️ El Problema de los Eventos Efímeros en Firestore
- **El Problema**: En una sesión de D&D de 3 horas con 5 jugadores, los latidos de presencia (`lastSeen` cada 45s), los cambios de turno de combate, las tiradas de dados en el log y los susurros generaban miles de lecturas y escrituras por documento en Cloud Firestore, amenazando con agotar los límites diarios del plan gratuito Spark (50,000 lecturas / 20,000 escrituras por día).
- **La Solución Híbrida de Doble Motor**:
  - **Cloud Firestore (Estado Persistente)**: Almacena únicamente los documentos estructurales que cambian con baja frecuencia: campañas (`rooms/{roomId}`), fichas de personaje (`rooms/{roomId}/players/{playerId}`), perfiles (`users/{uid}`), índice de nombres (`usernames/{nameLower}`) y notas privadas (`users/{uid}/privateNotes/{charId}`). Además, utiliza caché persistente multitab (`persistentLocalCache({ tabManager: persistentMultipleTabManager() })`) y guardas de visibilidad (`document.visibilityState === 'visible'`) para evitar lecturas en pestañas en segundo plano.
  - **Firebase Realtime Database (Telemetría de Tiempo Real y Alta Frecuencia)**: Factura por ancho de banda (10 GB/mes gratis) en lugar de por operación individual. Se migraron a RTDB 4 subsistemas clave bajo `/rooms/{roomId}/`:
    1. **`presence/{uid}`**: Usa el socket nativo `.info/connected` y `onDisconnect().update({ online: false, lastSeen: serverTimestamp() })`. Elimina el polling de escrituras periódicas cada 45s.
    2. **`combat`**: Sincroniza `isCombatMode`, `initiativeOrder`, `currentTurnIndex`, `combatMonsters` y eventos efímeros (`lastTurnEvent`, `lastDiceRoll`, `lastLevelUpEvent`) mediante transacciones atómicas (`runTransaction` de RTDB).
    3. **`logs`**: Historial de tiradas de dados limitado con `limitToLast(45)` y **poda incremental en memoria (`roomActiveLogKeys`)**, evitando descargar los 60 logs previos en cada tirada antes de borrar el más antiguo.
    4. **`whispers/{playerUid}`**: Hilos privados de susurros con autopoda a 15 mensajes y mapa en memoria `whisperMsgThreadMap` para que el DM pueda marcar como leído o borrar mensajes directamente en el nodo del jugador sin descargas adicionales.

### ⚠️ Auto-Hidratación de `/rooms/{roomId}/meta` y Helper `isCharacterOnline`
- **Retrocompatibilidad de Salas Previas**: Si una campaña fue creada antes de la integración con RTDB, carecerá del nodo `/rooms/{roomId}/meta/dmId` necesario para que `database.rules.json` reconozca al DM. En `subscribeRoom`, cuando el DM abre la sala, el cliente verifica y auto-hidrata `/rooms/{roomId}/meta` de forma transparente.
- **Unificación de Presencia (`isCharacterOnline`)**: Para evitar que la interfaz muestre como "En línea" a un jugador desconectado durante 65 segundos por el cálculo heredado de `lastSeen`, el helper `isCharacterOnline(p)` en `useStore.ts` prioriza el booleano instantáneo `p.isOnline` proveniente de RTDB.

---

## 12. Blindaje de Seguridad, Privacidad de Datos y Prevención de DoS

### ⚠️ Lección Crítica de Firebase App Check: `appId` Real vs `measurementId` y Coincidencia de Proveedor
- **Síntoma Detectado**: Al activar el cumplimiento obligatorio (*Enforcement*) de App Check en Firestore, funciones públicas como `verifyRoomPassword` arrojaban `FirebaseError: Missing or insufficient permissions (permission-denied)` a pesar de que `firestore.rules` tenía `allow read: if true;`.
- **Causas Raíz Descubiertas**:
  1. **`NEXT_PUBLIC_FIREBASE_APP_ID` configurado con un ID de Google Analytics (`G-XXXXXXXX`)**: Mientras que Auth y Firestore pueden operar sin validar el formato de `appId`, el SDK de **Firebase App Check construye una URL REST con `appId`** (`.../apps/{appId}:exchangeRecaptcha...Token`). Si recibe un `G-...` en lugar del ID de aplicación web real (`1:388713990161:web:...`), el servidor de App Check responde `400/404`, no se emite token y Firestore bloquea todas las peticiones antes de evaluar las reglas.
  2. **Concordancia Estricta de Proveedor (`ReCaptchaV3Provider` vs `ReCaptchaEnterpriseProvider`)**: El proveedor instanciado en `src/lib/firebase.ts` debe coincidir exactamente con la pestaña donde se registró la clave en Firebase Console → App Check, y el dominio (`localhost` en desarrollo y `dnd-companion-chi.vercel.app` en producción) debe estar autorizado en la clave de Google Cloud.

### ⚠️ Privacidad Real: Aislamiento de Notas Personales y Protección contra Enumeración de Usuarios
1. **Notas Privadas del Jugador (`/users/{uid}/privateNotes/{charId}`)**:
   - Guardar el arreglo `notes` dentro de `/rooms/{roomId}/players/{playerId}` permitía que cualquier jugador de la sala (o el DM) leyera las notas privadas de otro jugador inspeccionando el tráfico de red de `subscribeRoomPlayers`.
   - `savePlayerInRoom`, `batchUpdatePlayersInRoom` y `updatePlayerFieldsInRoom` eliminan el campo `notes` antes de escribir en la sala pública, y las notas se respaldan de forma aislada en `/users/{uid}/privateNotes/{charId}` donde `firestore.rules` exige `allow read, write: if isOwner(userId);`.
2. **Prevención de Enumeración de Correos (`/usernames/{usernameLower}`)**:
   - La colección `/users/{userId}` está cerrada a lecturas de terceros (`allow read: if isOwner(userId);`).
   - Para verificar si un nombre de usuario está disponible sin abrir la colección `/users`, se utiliza la colección índice `/usernames/{usernameLower}` que almacena únicamente `{ uid, updatedAt }`.

### ⚠️ Hashing SHA-256 de Contraseñas de Sala + Rate-Limiting Anti-Fuerza Bruta
- Las contraseñas de campaña jamás se almacenan en texto plano (`password: ""`). Se calcula un digest criptográfico `SHA-256` con sal (`hashRoomPassword` vía `crypto.subtle.digest`) almacenado en `passwordHash`.
- `verifyRoomPassword` incluye un limitador en memoria (`MAX_PASSWORD_ATTEMPTS = 5` por ventana de 60 segundos por sala) para bloquear ataques de diccionario o fuerza bruta.

### ⚠️ Sanitización de Telemetría (`errorLogger.ts`) y Cabeceras HTTP (`next.config.ts`)
- **Redacción de PII/Tokens**: Antes de enviar cualquier reporte a la colección `error_logs`, `sanitizeErrorText` reemplaza direcciones de correo por `[REDACTED_EMAIL]`, tokens JWT/Bearer por `[REDACTED_TOKEN]` y trunca `message` (300 chars) y `stack` (1000 chars).
- **Cabeceras de Seguridad HTTP**: `next.config.ts` desactiva `X-Powered-By` e inyecta `Content-Security-Policy (CSP)`, `Strict-Transport-Security (HSTS)`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` y `Permissions-Policy`.
