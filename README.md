# 🐉 D&D Companion — Centro de Mando en Tiempo Real para D&D 5e

[![Estado del Proyecto](https://img.shields.io/badge/Estado-Beta_Pública_(v0.8)-gold?style=for-the-badge)](https://dnd-companion-web.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel)](https://dnd-companion-web.vercel.app/)

> **D&D Companion** es una aplicación web interactiva en tiempo real diseñada para potenciar las partidas de **Dungeons & Dragons 5ª Edición (D&D 5e)**, tanto en mesas presenciales como en sesiones a través de Discord. Combina la atmósfera inmersiva de un grimorio arcano con la sincronización instantánea y reactiva de **Cloud Firestore**.

🎮 **[¡Probar la Mesa de Pruebas Interactiva (Demo sin Registro ni Conexión)!](https://dnd-companion-web.vercel.app/demo)**

---

## 🌟 Características Destacadas de la Beta

### 🛡️ Para el Dungeon Master (Panel Maestro)
* **Combate & Iniciativa Táctica**: Inicia combate con un clic; tiradas automáticas de iniciativa ($1d20 + \text{Modificador de DES}$) para todos los aventureros presentes con rueda de turnos sincronizada.
* **Control de Party en Vivo**: Inspección en tiempo real de HP, Clase de Armadura (CA), Percepción Pasiva, ranuras y equipo de cada integrante.
* **Reparto de Botín & Magia Directa**: Concede objetos mágicos legendarios o conjuros directamente al inventario de un aventurero o a todo el grupo en segundos.
* **Buzón Secreto del DM (Susurros)**: Sistema de mensajería privada bidireccional entre el DM y jugadores para revelar secretos de trasfondo, trampas ocultas o comunicaciones sigilosas sin alertar al resto de la mesa.
* **Ascenso Celestial (Subida de Nivel)**: Sube de nivel a un jugador o a toda la party con animación celebratoria en pantalla completa y recálculo oficial de HP (fijo o por tirada de dado de golpe) y nuevas ranuras mágicas.
* **Gestión de Campaña**: Control de presencia (🟢 En línea / 🔴 Ausente), purga de inactivos, personalización de terminología de salud (**HP** / **PG**) y protección por contraseña.

---

### 📜 Para el Aventurero (Hoja de Personaje 5e)
* **Automatización Oficial de Reglas 5e**: Cálculo automático de modificadores de atributo, CA dinámica según armadura/escudo equipado, dados de golpe según clase y bonificador de competencia.
* **Tiradas Animadas & Modificadores Automáticos 5e**: Lanzador interactivo para $d4, d6, d8, d10, d12, d20 \text{ y } d100$ con modificadores en vivo, sonidos y registro automático en el diario de la campaña.
* **Gestión de Recursos & Descansos**:
  * **Descanso Corto**: Gasto interactivo de Dados de Golpe con recuperación de HP y reseteo de rasgos por descanso corto (*Segundo Aliento*, *Oleada de Acción*, etc.).
  * **Descanso Largo**: Restauración total de vida máxima, recuperación de dados de golpe y recarga completa de ranuras de conjuro.
* **Monedero Multidivisa**: Gestión de monedas de Cobre (CP), Plata (SP), Electro (EP), Oro (GP) y Platino (PP) con conversor a valor estándar.
* **Sistema Moribundo & Salvaciones contra la Muerte**:
  * Al caer a 0 HP, la interfaz transiciona automáticamente a estado **🩸 Moribundo**.
  * Rueda de salvaciones d20 interactiva con reglas oficiales: **20 Natural** (reanimación a 1 HP), **1 Natural** (2 fallos inmediatos), **3 Éxitos** (estabilización) o **3 Fallos** (muerte del personaje).

---

### 🎪 Mesa de Pruebas & Sandbox Aislado (`/demo`)
* **Entorno 100% Desconectado**: Diseñado como carta de presentación y laboratorio de pruebas sin necesidad de registrarse ni conectarse a la base de datos.
* **Party Legendaria de 4 Héroes**: Alterna al instante entre **Drizzt Do'Urden** (Guerrero Drow), **Lyra Brillacero** (Clériga de la Luz), **Varis Sombraluna** (Pícaro Mediano) y **Elidoris Vane** (Mago Semielfo).
* **Explorador de Funciones en 1 Clic**: Simuladores rápidos para probar daño (-15 HP), estado agonizante (0 HP), descansos, recepción de botín legendario y concesión de inspiración.
* **Restauración a Fábrica**: Botón `🔄 Restaurar Fábrica` para reiniciar todo el laboratorio a sus valores limpios de origen en cualquier momento.

---

### ⏳ Campañas Recientes & Nombres Únicos
* **Shelf de Campañas Recientes**: Historial inteligente almacenado en local para reanudar aventuras previas con 1 solo clic.
* **Validación contra Duplicados**: Prevención en tiempo real de nombres de campaña repetidos para evitar confusiones al buscar y unirse a salas.

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
* **Infraestructura Cloud**: [Firebase Firestore](https://firebase.google.com/docs/firestore) y [Firebase Authentication](https://firebase.google.com/docs/auth) (Google OAuth).
* **Despliegue & Analítica**: [Vercel](https://vercel.com/) con `@vercel/analytics`.

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
Crea un archivo `.env.local` en la raíz del proyecto con tus credenciales de Firebase Console:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

### 4. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador para comenzar la aventura.

---

## 📬 Feedback & Contribuciones

¿Encontraste un error o tienes una idea para mejorar la experiencia de juego en mesa?
* Abre un **Issue** en este repositorio para reportar bugs o solicitar nuevas funciones.
* Los comentarios de la comunidad durante esta fase Beta son fundamentales para calibrar el balance y las herramientas que llegarán a la versión final.
