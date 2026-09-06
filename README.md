# 🐉 D&D Companion — Asistente de Campaña & Gestor Virtual en Tiempo Real (D&D 5e)

![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-orange?style=for-the-badge&logo=firebase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwind-css)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel)

**D&D Companion** es una aplicación web interactiva en tiempo real diseñada para potenciar las partidas de **Dungeons & Dragons 5ª Edición (D&D 5e)**. Permite a **Dungeon Masters (DM)** y **Jugadores** gestionar campañas, hojas de personaje, orden de iniciativa en combate, estado crítico/salvaciones contra la muerte y ascensos de nivel sincronizados al instante mediante **Firebase Firestore**.

---

## 🌟 Características Principales

### 🏰 Panel Maestro del DM (Dungeon Master)
* **Gestor de Combate & Iniciativa**: Inicia combate con un clic; realiza tiradas de iniciativa d20 + Modificador de DEX automáticas para todos los integrantes presentes.
* **Carrusel de Iniciativa en Tiempo Real**: Visualización interactiva del orden de turnos con banners flotantes de notificación en la pantalla de cada jugador.
* **Gestión de Campaña**: Modificación en vivo del nombre de sala, contraseña de acceso, visibilidad pública y preferencia de nomenclatura de vida (**HP** o **PG**).
* **Control de Presencia & Limpieza**: Detección visual de integrantes **🟢 En línea** vs **🔴 Ausentes**, con filtro de vista y botón para limpiar ausentes.
* **Control Absoluto**: Herramientas para revivir, auxilios rápidos (+1 HP), matar o expulsar personajes de la sala sin destruir sus datos personales.

---

### 📜 Hoja de Personaje Interactiva (Jugador)
* **Cálculos Automáticos D&D 5e**: Cálculo de Puntos de Vida Máximos segun clase (Guerrero, Mago, Clérigo, etc.), Clase de Armadura (CA), Bonificador de Competencia y Salvaguardias.
* **Inventario & Hechizos**: Gestión de objetos (equipables/consumibles) y espacios de conjuro con restauración en Descanso Largo.
* **Efectos Temporales (Modificadores)**: Modificadores temporales de atributos (Fuerza, Destreza, etc.), CA o HP Máximo que reducen su duración automáticamente con cada ronda de combate.
* **Lanzador de Dados 3D Integrado**: Lanzamiento de d20, d12, d10, d8, d6 y d4 con animaciones y registro automático en el historial de acciones.

---

### 🩸 Sistema Moribundo & Salvaciones contra la Muerte
* **Transición a 0 HP**: Al caer a 0 HP, el personaje pasa automáticamente a estado **🩸 Moribundo**.
* **Salvaciones d20 Sincronizadas**:
  * **20 Natural (Crítico)**: Recupera 1 HP de inmediato y recobra la consciencia.
  * **1 Natural (Pifia)**: Suma 2 fallos automáticos contra la muerte.
  * **≥ 10 (Éxito)**: Suma 1 Éxito (3 Éxitos = 🛡️ **Estabilizado a 0 HP**).
  * **< 10 (Fallo)**: Suma 1 Fallo (3 Fallos = ☠️ **Fallecimiento**).
* **Confirmación de Dados**: El estado de salud solo se actualiza tras aceptar el resultado final del dado en pantalla.

---

### 🌟 Ascenso Celestial (Subida de Nivel)
* **Animación Victorial en Pantalla Completa**: Modal `CelestialLevelUpModal` con partículas celestiales y doradas en movimiento.
* **Filtro Inteligente de Presencia**: Notifica únicamente a los aventureros que estuvieron presentes durante el evento de subida de nivel, ignorando personajes creados con posterioridad o fuera de la sala.

---

## 🛠️ Tecnologías Utilizadas

* **Framework Front-End**: [Next.js 16 (App Router)](https://nextjs.org/) con TypeScript.
* **UI & Animaciones**: [Tailwind CSS v4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/) y [Lucide React Icons](https://lucide.dev/).
* **Gestión de Estado**: [Zustand](https://github.com/pmndrs/zustand) con sincronización entre pestañas (BroadcastChannel) y persistencia offline.
* **Base de Datos & Auth**: [Firebase (Firestore & Authentication)](https://firebase.google.com/).

---

## 🚀 Guía de Instalación y Uso Local

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/dnd-companion.git
cd dnd-companion
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
Crea un archivo `.env.local` en la raíz del proyecto copiando las variables de `.env.example`:

```bash
cp .env.example .env.local
```

Rellena tus credenciales de Firebase en `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

### 4. Ejecutar el Servidor de Desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---
