# 🐉 D&D Companion — Centro de Mando en Tiempo Real para D&D 5e

[![Estado del Proyecto](https://img.shields.io/badge/Estado-Beta_Pública_(v0.9)-gold?style=for-the-badge)](https://dnd-companion-chi.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20RTDB%20%26%20Auth-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel)](https://dnd-companion-chi.vercel.app/)

> **D&D Companion** es una aplicación web interactiva en tiempo real diseñada para potenciar las partidas de **Dungeons & Dragons 5ª Edición (D&D 5e)**, tanto en mesas presenciales como en sesiones a través de Discord. Combina la atmósfera inmersiva de un grimorio arcano con una **arquitectura híbrida de doble motor en Firebase (Cloud Firestore + Realtime Database)** optimizada al extremo para operar dentro del plan gratuito Spark con latencia cero.

🎮 **[¡Probar la Mesa de Pruebas Interactiva (Demo sin Registro ni Conexión)!](https://dnd-companion-chi.vercel.app/demo)**

---

## 🌟 Características Destacadas de la Beta

### 🛡️ Para el Dungeon Master (Panel Maestro)
* **Bestiario & Rastreador de PNJs / Monstruos en Combate**: Despliegue de plantillas rápidas oficiales de D&D 5e en 1 clic (*Goblin, Orco, Esqueleto, Dragón Joven*), creación de monstruos/aliados personalizados, gestión de vida en vivo y rueda de iniciativa táctica mixta (Jugadores + PNJs/Monstruos).
* **Combate & Iniciativa Táctica Atómica (RTDB)**: Inicia combate con un clic; tiradas automáticas de iniciativa ($1d20 + \text{Modificador de DES}$) para todos los presentes, rueda de turnos sincronizada en **Firebase Realtime Database** y avance atómico con `runTransaction` libre de condiciones de carrera.
* **Control de Party en Vivo**: Inspección en tiempo real de HP, Clase de Armadura (CA), Percepción Pasiva, ranuras y equipo de cada integrante.
* **Reparto de Botín & Magia Directa**: Concede objetos mágicos legendarios o conjuros directamente al inventario de un aventurero o a todo el grupo en segundos.
* **Buzón Secreto Bidireccional (Jugador <-> DM)**: Sistema de mensajería privada bidireccional sobre nodos aislados `/rooms/{roomId}/whispers/{playerUid}` en Realtime Database (con respaldo en Firestore). Permite al DM responder a cada aventurero en hilos individuales (con autopoda a los últimos 15 mensajes), insignias de no leídos y confirmaciones de lectura en tiempo real.
* **Ascenso Celestial (Subida de Nivel)**: Sube de nivel a un jugador o a toda la party con animación celebratoria en pantalla completa y recálculo oficial de HP (fijo o por tirada de dado de golpe) y nuevas ranuras mágicas.
* **Gestión de Campaña**: Control de presencia instantáneo mediante sockets nativos `onDisconnect()` (🟢 En línea / 🔴 Ausente), purga de inactivos, personalización de terminología de salud (**HP** / **PG**) y protección por contraseña cifrada con hash **SHA-256**.

---

### 📜 Para el Aventurero (Hoja de Personaje 5e)
* **Automatización Oficial de Reglas 5e**: Cálculo automático de modificadores de atributo, CA dinámica según armadura/escudo equipado, dados de golpe según clase y bonificador de competencia.
* **Tiradas Animadas & Modificadores Automáticos 5e**: Lanzador interactivo para $d4, d6, d8, d10, d12, d20 \text{ y } d100$ con modificadores en vivo, sonidos y registro automático en el diario de la campaña.
* **Diario Privado Aislado en la Nube**: Notas personales del jugador sincronizadas exclusivamente en su bóveda privada `/users/{uid}/privateNotes/{charId}`, 100% invisibles para el DM y el resto de la mesa.
* **Banners de Estado en Combate**: Indicadores inmersivos a pantalla completa para turno activo, agonía / moribundo, estabilización y muerte con arte oficial y sin emojis.
* **Gestión de Recursos & Descansos**:
  * **Descanso Corto**: Gasto interactivo de Dados de Golpe con recuperación de HP y reseteo de rasgos por descanso corto (*Segundo Aliento*, *Oleada de Acción*, etc.).
  * **Descanso Largo**: Restauración total de vida máxima, recuperación de dados de golpe y recarga completa de ranuras de conjuro.
* **Monedero Multidivisa**: Gestión de monedas de Cobre (CP), Plata (SP), Electro (EP), Oro (GP) y Platino (PP) con conversor a valor estándar.
* **Sistema Moribundo & Salvaciones contra la Muerte**:
  * Al caer a 0 HP, la interfaz transiciona automáticamente a estado **🩸 Moribundo**.
  * Rueda de salvaciones d20 interactiva con reglas oficiales: **20 Natural** (reanimación a 1 HP), **1 Natural** (2 fallos inmediatos), **3 Éxitos** (estabilización) o **3 Fallos** (muerte del personaje).

---

### 🏛️ Salón de Campañas Dedicado (`/campaigns`) & Landing Page SEO (`/`)
* **Landing Page de Bienvenida (`/`)**: Portal de aterrizaje optimizado para SEO y accesibilidad, con navegación rápida al Salón de Campañas, vitrina del compendio y enlace directo al sandbox.
* **Salón de Campañas (`/campaigns`)**: Centro de mando para unirse a salas públicas, introducir códigos de acceso, gestionar contraseñas y crear nuevas aventuras.
* **Shelf de Campañas Recientes**: Historial inteligente almacenado en local para reanudar aventuras previas con 1 solo clic.
* **Validación contra Duplicados**: Prevención en tiempo real con consulta indexada `limit(1)` para evitar campañas con nombres repetidos.

---

### 🎪 Mesa de Pruebas & Sandbox Aislado (`/demo`)
* **Entorno 100% Desconectado**: Diseñado como carta de presentación y laboratorio de pruebas sin necesidad de registrarse ni conectarse a la base de datos.
* **Party Legendaria de 4 Héroes**: Alterna al instante entre **Drizzt Do'Urden** (Guerrero Drow), **Lyra Brillacero** (Clériga de la Luz), **Varis Sombraluna** (Pícaro Mediano) y **Elidoris Vane** (Mago Semielfo).
* **Explorador de Funciones en 1 Clic**: Simuladores rápidos para probar daño (-15 HP), estado agonizante (0 HP), descansos, recepción de botín legendario y concesión de inspiración.
* **Restauración a Fábrica**: Botón `Restaurar Fábrica` para reiniciar todo el laboratorio a sus valores limpios de origen en cualquier momento.

---

### 🛡️ Blindaje Cloud, Seguridad & Optimización Spark
* **Arquitectura Híbrida Firestore + Realtime Database**: Persistencia documental estructurada en **Cloud Firestore** (con caché persistente multitab IndexedDB) combinada con **Firebase Realtime Database** para eventos de alta frecuencia (presencia instantánea con `onDisconnect()`, combate y turnos atómicos, logs de tiradas con poda incremental en memoria y susurros en vivo), reduciendo en más de un 90% el consumo de lecturas/escrituras de Firestore.
* **Escudo Anti-Bots y Anti-DoS con Firebase App Check**: Integración nativa con **reCAPTCHA v3 / Enterprise** y cumplimiento obligatorio (*Enforcement*) en Firestore y RTDB para bloquear tráfico automatizado y abusos de cuota.
* **Reglas de Seguridad Granulares (`firestore.rules` y `database.rules.json`)**:
  * Aislamiento total de perfiles en `/users/{userId}` contra enumeración de correos, apoyado en el índice ligero `/usernames/{usernameLower}`.
  * Notas personales del aventurero aisladas en `/users/{uid}/privateNotes/{charId}` (100% privadas frente al DM y otros jugadores).
  * Contraseñas de sala protegidas con hash **SHA-256** (`Web Crypto API`) y *rate-limiting* contra fuerza bruta (máximo 5 intentos por minuto).
  * Hilos de susurros (`/whispers/{playerUid}`) restringidos exclusivamente al jugador participante y al DM de la campaña.
* **Cabeceras de Seguridad HTTP y Sanitización**: Políticas estrictas `Content-Security-Policy (CSP)`, `HSTS`, `X-Frame-Options: DENY` en `next.config.ts`, y redacción automática de PII/tokens en `errorLogger.ts`.
* **Capa de Resiliencia (`withRetry` / `withTimeout`)**: Reintentos automáticos con retroceso exponencial, temporizador de 8s y refresco proactivo de token ante expiraciones de sesión.

---

## 💎 Visión del Modelo Freemium & Monetización (En Definición)

> [!NOTE]
> La plataforma se encuentra actualmente en **Fase Beta Pública**. El siguiente modelo económico está en proceso de análisis y definición estratégica para asegurar una experiencia justa, equilibrada y sostenible.

Siguiendo la tradición de las mesas de rol clásicas donde **el Dungeon Master lidera la sesión y los aventureros juegan gratis**:

### 🟢 Aventureros / Jugadores (100% Gratuito)
* Creación y gestión de hojas de personaje ilimitadas.
* Acceso completo a tiradas animadas con modificadores automáticos 5e.
* Entrada sin restricciones a cualquier campaña como jugador.
* Uso libre de la Mesa de Pruebas / Sandbox para practicar.
* Mensajería directa y privada con el DM.

### 👑 Nivel Maestro / DM (Modelo de Suscripción para Directores de Juego)
* **Campañas con Horas Ilimitadas**: Sesiones continuas y salas de juego sin límite de tiempo mensual.
* **Compendio Arcano Completo & Homebrew**:
  * Biblioteca extendida de hechizos y conjuros oficiales.
  * Herramienta para diseñar y compartir **Hechizos Personalizados (Homebrew)** con la mesa.
* **Bestiario & Creador de Monstruos**:
  * Catálogo de criaturas listas para combate con estadísticas y acciones.
  * Editor para crear **Monstruos, Jefes y PNJs Propios** con tiradas automáticas integradas.
* **Herramientas de Campaña Avanzadas**: Gestión de múltiples campañas simultáneas, exportación de personajes y personalización de temas de grimorio.

### ☕ Apoyo Comunitario & Donaciones de la Mesa
* Módulo de aportaciones voluntarias donde los jugadores pueden apoyar económicamente a su DM o a la plataforma.
* **Recompensa Directa**: Cada donación contribuye exclusivamente a desbloquear **paquetes de horas adicionales de juego** para la campaña activa del DM, permitiendo que el costo de la mesa pueda compartirse democráticamente entre todos los participantes.

---

## 🎮 Ecosistema & Alianza Gamer

D&D Companion forma parte de un ecosistema de aplicaciones lúdicas en colaboración con **[TeamLobby](https://team-lobby.vercel.app/)** (centro de coordinación gamer en tiempo real con catálogo de Steam, votación democrática de partidas, ruleta del destino para desempates y vitrina de trofeos personales).

---

## 🛠️ Tecnologías Utilizadas

* **Framework Front-End**: [Next.js 16 (App Router)](https://nextjs.org/) con React 19 y TypeScript 5.
* **Estilos & Animaciones**: [Tailwind CSS v4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/) y [Lucide React Icons](https://lucide.dev/).
* **Gestión de Estado**: [Zustand](https://github.com/pmndrs/zustand) con persistencia local higienizada y desacoplamiento de sandbox.
* **Infraestructura Cloud**: [Firebase Cloud Firestore](https://firebase.google.com/docs/firestore), [Firebase Realtime Database](https://firebase.google.com/docs/database), [Firebase App Check](https://firebase.google.com/docs/app-check) y [Firebase Authentication](https://firebase.google.com/docs/auth) (Google OAuth + Email/Password).
* **Despliegue & Analítica**: [Vercel](https://dnd-companion-chi.vercel.app/) con `@vercel/analytics`.

---

## 🚀 Instalación y Despliegue Local

### 1. Clonar el Repositorio
```bash
git clone https://github.com/ID0N30/dnd-companion.git
cd dnd-companion
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
Crea un archivo `.env.local` en la raíz del proyecto (o toma como base `.env.example`) con tus credenciales de Firebase Console y servicios complementarios:

```env
# Credenciales Obligatorias de Firebase Web (Importante: APP_ID debe tener formato 1:...:web:..., nunca G-...)
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://tu_proyecto-default-rtdb.firebaseio.com

# Emuladores Locales (Opcional, false por defecto)
NEXT_PUBLIC_USE_EMULATOR=false

# Firebase App Check (Protección contra bots y abuso de cuota)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=tu_recaptcha_site_key
NEXT_PUBLIC_RECAPTCHA_ENTERPRISE=false
NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN=tu_debug_token_para_localhost

# Telemetría y Observabilidad de Errores (Opcional)
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
NEXT_PUBLIC_TELEMETRY_WEBHOOK_URL=https://tu-endpoint-webhook.com/api/errors
```

### 4. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador para comenzar la aventura, o visita la versión oficial desplegada en **[https://dnd-companion-chi.vercel.app/](https://dnd-companion-chi.vercel.app/)**.

---

## 📬 Feedback & Contribuciones

¿Encontraste un error o tienes una idea para mejorar la experiencia de juego en mesa?
* Abre un **Issue** en este repositorio para reportar bugs o solicitar nuevas funciones.
* Los comentarios de la comunidad durante esta fase Beta son fundamentales para calibrar el balance y las herramientas que llegarán a la versión final.
