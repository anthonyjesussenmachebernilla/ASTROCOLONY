# HORIZONTE 🚀🔴

> **Educational Mars Colony Simulation & 3D Interactive WebGL Experience**  
> Built with Next.js 16 (Turbopack), React 19, WebGL / Three.js, PostgreSQL (Prisma), and real scientific data from NASA.

---

## 📋 Table of Contents
1. [Overview](#-overview)
2. [Key Features](#-key-features)
   - [10-Sol Educational Campaign](#10-sol-educational-campaign)
   - [Interactive 3D Colony Modules](#interactive-3d-colony-modules)
   - [Verified NASA Scientific Discoveries](#verified-nasa-scientific-discoveries)
   - [Space Weather Simulation (NASA DONKI)](#space-weather-simulation-nasa-donki)
3. [Architecture & Tech Stack](#-architecture--tech-stack)
4. [Quickstart Guide for Evaluators / Jury](#-quickstart-guide-for-evaluators--jury)
5. [Environment Variables](#-environment-variables)
6. [Testing & Quality Assurance](#-testing--quality-assurance)
7. [AI Assistance & Scientific Attribution](#-ai-assistance--scientific-attribution)

---

## 🌟 Overview

**HORIZONTE** is an immersive educational web simulation that puts players in command of *Aurora-1*, humanity's pioneer research outpost on Mars. The project combines real-time WebGL 3D graphics, genuine NASA space science data, and resource-management gameplay designed to teach the fundamentals of space engineering, life support, power generation, and planetary survival.

---

## 🎮 Key Features

### 10-Sol Educational Campaign
The core narrative takes place across ten Martian days (*Sols*):
- **Sols 1–3 (Tutorial & Systems Familiarization):** Exploration of the base, inspection of the solar array, power distribution, and greenhouse initialization. Sol 1 teaches panel orientation and dust management.
- **Sols 4–6 (Survival Challenges):** Resource trade-offs under escalating environmental pressure, including simulated solar storm alerts.
- **Sols 7–9 (Signal Investigation):** Analysis of an unknown beacon transmission detected near the outpost.
- **Sol 10 (Conclusion):** Narrative resolution revealing the beacon originated from the expedition's own lost telemetry package (purely fictional narrative; not a scientific assertion by NASA).

#### Resource System & Mechanics
- **4 Primary Resources (Percentages 0–100%):**
  - ϟ **Energy:** Solar generation and battery storage.
  - 💧 **Oxygen:** MOXIE extraction and atmospheric recycling.
  - 🌿 **Food:** Hydroponic and aeroponic greenhouse yields.
  - ⬡ **Shielding:** Habitat radiation protection and thermal integrity.
- **Educational Upkeep:** Starting on Sol 4, a daily upkeep cost is applied: **-4 Energy, -4 Oxygen, -3 Food, -1 Shielding**.
- **Transparent Decisions:** Every option displays before-and-after resource deltas before confirmation, with undo capabilities prior to ending the sol.
- **Astrobot Emergency Assistance:** If any resource drops to zero, the autonomous assistant *Astrobot* offers a practice recovery option (replenishing vital reserves to a 35% baseline). This intervention is transparently documented in the mission log.
- **Pure Didactic Focus:** No monetization, pay-to-win mechanics, arbitrary microtransactions, or cosmetics shops.

---

### 🏛 Interactive 3D Colony Modules

Players can interact with the colony either directly in the primary 3D terrain canvas or explore dedicated interactive 3D module workstations:

1. **Habitat (`/horizonte/habitat.html`):** Crew quarters, environmental life-support consoles, atmospheric scrubbers, and MOXIE controls.
2. **Energy Center (`/horizonte/energia.html`):** Power grid routing, battery banks, capacitor balancing, and solar array telemetry.
3. **Greenhouse (`/horizonte/invernadero.html`):** Crop growth chambers, nutrient aeroponics, and LED light spectrum optimization.
4. **Maintenance Workshop (`/horizonte/taller.html`):** Robotic rover diagnostic bay, tool calibration, and mechanical repair.
5. **Thermal Regulator (`/horizonte/regulador.html`):** Radiator loops, coolant cycles, and heat dissipation across extreme Martian day/night cycles.

---

### 🔭 Verified NASA Scientific Discoveries

Each station features an interactive **ⓘ Image & Scientific Information** notebook linking colony technology with real NASA space exploration records:

| Colony Module | Scientific Topic | NASA Identifier | Location of Capture | Scientific Credit |
| :--- | :--- | :--- | :--- | :--- |
| **Solar Panels** · Array | Dust Accumulation on InSight | [PIA25286](https://images.nasa.gov/details/PIA25286) | Mars Surface (Elysium Planitia) | NASA / JPL-Caltech |
| **Greenhouse** · Crops | Veggie Lettuce Cultivation | [iss055e000821](https://images.nasa.gov/details/iss055e000821) | International Space Station (LEO) | NASA |
| **Habitat** · Life Support | MOXIE Oxygen Generator | [PIA24203](https://images.nasa.gov/details/PIA24203) | Pre-Launch Cleanroom (Earth) | NASA / JPL-Caltech |
| **Thermal Regulator** · Cooling | Curiosity Rover Thermal Vacuum Tests | [PIA13805](https://images.nasa.gov/details/PIA13805) | Jet Propulsion Laboratory (Earth) | NASA / JPL-Caltech |
| **Energy Center** · Power | Curiosity MMRTG Nuclear Power Generator | [KSC-2011-6694](https://images.nasa.gov/details/KSC-2011-6694) | Kennedy Space Center (Earth) | NASA / Cory Huston |

- **Direct NASA Integration:** Queries the public NASA Image Library API (`https://images-api.nasa.gov`) using specific curated NASA IDs with independent client-side caching.
- **Accurate Context:** Educational notes explicitly distinguish between photographs taken on Mars, experiments aboard the ISS, and pre-flight validation on Earth.
- **Bilingual Context:** Educational text is presented in Spanish with the original English NASA catalog description accessible via an expandable drawer.

---

### ☀️ Space Weather Simulation (NASA DONKI)
The game interfaces with the **NASA Space Weather Database of Notifications, Knowledge, Information (DONKI)** to retrieve solar flare observations, coronal mass ejections (CMEs), and geomagnetic activity indicators, translating real solar data into in-game environmental alerts.

---

## 🛠 Architecture & Tech Stack

- **Framework:** [Next.js 16.4.6](https://nextjs.org/) (App Router, Turbopack, React 19)
- **3D Graphics & Rendering:** WebGL, Three.js, GLSL custom shaders (fog, solar storm atmosphere, dust particle systems)
- **Styling & UI:** Tailwind CSS, Framer Motion, Lucide React Icons
- **Database & Persistence:** PostgreSQL 16 via Docker, Prisma ORM (`@prisma/client`, `@prisma/adapter-pg`)
- **Testing Framework:** [Vitest](https://vitest.dev/) with JSDOM environment (83 unit and flow tests)
- **State Management:** Zustand and LocalStorage Version 2 schema

---

## 🚀 Quickstart Guide for Evaluators / Jury

To evaluate HORIZONTE locally, follow these simple steps:

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.x or 20.x recommended)
- [Docker & Docker Desktop](https://www.docker.com/) (for the local PostgreSQL container)

### Step 1: Clone the Repository
```bash
git clone https://github.com/anthonyjesussenmachebernilla/ASTROCOLONY.git
cd ASTROCOLONY
```

### Step 2: Start the Database Container
Run the included Docker Compose configuration to start PostgreSQL on port `5433`:
```bash
docker compose up -d
```
*(Verify container status with `docker compose ps`)*

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Run the Development Server
```bash
npm run dev
```

### Step 5: Open in Your Browser
- **Main Mission Portal:** [http://localhost:3000](http://localhost:3000)
- **Direct 3D Mars Outpost (HORIZONTE):** [http://localhost:3000/horizonte/index.html](http://localhost:3000/horizonte/index.html)
- **Interactive Greenhouse:** [http://localhost:3000/horizonte/invernadero.html](http://localhost:3000/horizonte/invernadero.html)
- **Interactive Habitat:** [http://localhost:3000/horizonte/habitat.html](http://localhost:3000/horizonte/habitat.html)
- **Interactive Energy Center:** [http://localhost:3000/horizonte/energia.html](http://localhost:3000/horizonte/energia.html)
- **Interactive Maintenance Bay:** [http://localhost:3000/horizonte/taller.html](http://localhost:3000/horizonte/taller.html)
- **Interactive Thermal Regulator:** [http://localhost:3000/horizonte/regulador.html](http://localhost:3000/horizonte/regulador.html)

---

## 🔐 Environment Variables

For the jury's convenience, the `.env` file is included directly in the repository with the necessary development settings:

```env
DATABASE_URL="postgresql://astrocolony:astrocolony_dev_password@localhost:5433/astrocolony"
NASA_API_KEY="BDWn8dBrmmwwrmqRwB8kdM8Mt9NWpkgt6rHczkTk"
```

- `DATABASE_URL`: Pre-configured to match the local PostgreSQL credentials in `docker-compose.yml`.
- `NASA_API_KEY`: NASA Open Data API key (defaults safely to `'DEMO_KEY'` if omitted).

---

## 🧪 Testing & Quality Assurance

The codebase includes comprehensive unit tests verifying campaign decision trees, collision detection, NASA API discovery integration, wardrobe persistence, and WebGL startup fallbacks.

Run the full test suite with:
```bash
npm run test:run
```
*(All 83 tests across 14 test suites are designed to pass out-of-the-box without requiring live network calls).*

---

## 🤖 AI Assistance & Scientific Attribution

- **AI Assistance Disclosure:** In accordance with evaluation guidelines, ChatGPT and Codex models were utilized during development to assist with code architecture, didactic copy translation, campaign decision balancing, and unit test structuring.
- **Scientific Attribution:** All planetary and spaceflight photography is the intellectual property of NASA, JPL-Caltech, and their respective instrument teams as cataloged under public domain Open Access guidelines. The colony simulation, resource values, and narrative elements are educational models designed for learning engagement.
