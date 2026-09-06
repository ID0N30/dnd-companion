# ⚙️ Guía Paso a Paso para Configurar Firebase en Dungeon & Dragos

Esta guía te acompañará paso a paso para crear tu proyecto en la consola de Firebase, obtener tus llaves de acceso e iniciar la base de datos y la autenticación.

---

## 1. Crear el Proyecto en Firebase Console

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/).
2. Haz clic en **"Agregar proyecto"** (o "Add project").
3. Escribe un nombre para tu proyecto (ej. `dnd-companion-web`) y presiona **Continuar**.
4. *(Opcional)* Puedes desactivar o activar Google Analytics según prefieras y haz clic en **Crear proyecto**.

---

## 2. Registrar la Aplicación Web

1. En la pantalla principal de tu proyecto en la consola de Firebase, haz clic en el icono de la Web `</>` (Agregar aplicación).
2. Ponle un apodo a la app (ej. `D&D Companion Web`).
3. **No** es necesario marcar Firebase Hosting por ahora (lo desplegaremos en Vercel más adelante).
4. Haz clic en **Registrar app**.
5. Verás un bloque de código con el objeto `firebaseConfig`. **Copia los valores de las siguientes llaves**:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

---

## 3. Crear tu archivo `.env.local`

1. En tu computadora, dentro de la carpeta del proyecto (`dnd-companion`), crea un archivo llamado **`.env.local`**.
2. Copia la estructura de `.env.local.example` y pega tus valores reales:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=dnd-companion-web.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dnd-companion-web
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=dnd-companion-web.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abc123def456
```

> 🔒 **Seguridad**: El archivo `.env.local` ya está incluido en `.gitignore`, por lo que tus llaves nunca se subirán a GitHub ni se compartirán públicamente.

---

## 4. Habilitar la Autenticación (Google + Anónimo)

Para permitir que los **invitados** jueguen sin registrarse y luego puedan **vincular su personaje a Google**:

1. En el menú lateral izquierdo de Firebase Console, ve a **Build (Construir) > Authentication**.
2. Haz clic en **Comenzar** (Get Started).
3. En la pestaña **Proveedor de inicio de sesión** (Sign-in method):
   - **Google**: Haz clic en Google, activa el interruptor de **Habilitar**, selecciona tu correo de soporte y guarda.
   - **Anónimo (Anonymous)**: Haz clic en Anónimo, activa el interruptor de **Habilitar** y guarda. *(¡Esto es vital para que los invitados tengan un ID temporal sin pedir contraseña!)*.

---

## 5. Habilitar la Base de Datos (Cloud Firestore)

1. En el menú lateral de Firebase Console, ve a **Build (Construir) > Firestore Database**.
2. Haz clic en **Crear base de datos**.
3. Selecciona la ubicación de tu base de datos (puedes dejar la sugerida por defecto).
4. En **Reglas de seguridad**, selecciona **Comenzar en modo de prueba** (*Start in test mode*) durante el desarrollo.
5. Haz clic en **Crear**.

### Reglas de Seguridad Recomendadas (Pestaña "Reglas" en Firestore):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura a todos los usuarios (incluidos invitados anónimos)
    match /rooms/{roomId} {
      allow read: if true;
      // Solo usuarios autenticados (no anónimos) pueden crear o ser DM de la sala
      allow create: if request.auth != null && request.auth.token.firebase.sign_in_provider != 'anonymous';
      allow update, delete: if request.auth != null && (request.auth.uid == resource.data.dmId || request.auth.token.firebase.sign_in_provider != 'anonymous');
      
      // Permitir a jugadores (invitados o loggeados) editar su propio personaje
      match /players/{playerId} {
        allow read, write: if request.auth != null;
      }
      
      match /logs/{logId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

---

## 6. ¡Listo! ¿Cómo se conecta con la App?

El cliente de Firebase ya está creado en `src/lib/firebase.ts`. Tan pronto como crees tu archivo `.env.local` y pegues tus llaves, la aplicación detectará Firebase automáticamente y podremos migrar las salas y hojas de personaje a tiempo real en la nube.
