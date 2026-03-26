# Simon (Shenghua) Jin — 3D Interactive Portfolio

Hi, I'm Simon! Welcome to the source code for my interactive 3D web portfolio. I'm a mechatronics engineer and software developer, and I built this site to showcase my projects spanning robotics, machine learning, and low-level software engineering through a dynamic, interactive dodecahedron interface.

**Live Project:** [simonjin.ca](https://www.simonjin.ca)

## 🚀 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **3D Engine:** React Three Fiber (R3F), `@react-three/drei`, Three.js
- **Styling:** Tailwind CSS v4 (CSS-variable based)
- **Language:** TypeScript
- **Deployment:** Vercel (recommended) / Static Export

## 📁 Project Structure

```
src/
├── app/                  # Next.js App Router root
│   ├── globals.css       # Tailwind v4 configuration and global CSS variables
│   ├── layout.tsx        # Root HTML layout, font setup, and ThemeProvider
│   ├── page.tsx          # Main entry route: 3D Canvas and Terminal UI
│   ├── resume/           # Resume viewer and PDF embedded subpage
│   └── projects/         # Individual project detail pages (Markdown/Prose)
│       ├── air-mouse/
│       ├── hardhaq/
│       ├── hudson/
│       └── ... 
├── components/           # Reusable React components
│   ├── Dodecahedron.tsx  # Core 3D visualization and interaction logic
│   ├── ThemeProvider.tsx # Dark/Light mode context manager
│   └── ThemeToggle.tsx   # Floating theme toggle button
└── lib/                  # Utility functions (if any)
```

## 🧩 Key Components

### `Dodecahedron.tsx`
The primary centerpiece of the website. It handles:
- Mathematical generation of the 12 pentagonal faces of a dodecahedron.
- Three-phase morphing animation (flat polygons → expanding lines → 3D solid).
- Raycasting and intersection logic for hovering over faces.
- Camera tweening to focus on selected faces using quaternions.
- Bridging 3D canvas and 2D HTML overlays using Drei's `<Html>` wrapper.

### `ThemeProvider.tsx` & `ThemeToggle.tsx`
Manages the application's global dark/light state.
- Defaults to Dark Mode.
- Persists user preference via `localStorage`.
- Safely handles React Hydration errors by resolving layout CSS structurally and avoiding hidden SSR wrapper elements.

### `TerminalText` (in `page.tsx`)
A custom typewriter effect that runs on the side of the 3D canvas.
- Efficiently renders text progressively.
- Fully compatible with Tailwind's dark variants (`dark:`).

## ⚖️ Tradeoffs & Architecture Decisions

1. **React Three Fiber (R3F) vs Vanilla Three.js**
   - *Decision:* R3F was chosen to allow declarative composition of logic.
   - *Tradeoff:* R3F introduces slight React rendering overhead compared to raw WebGL calls. I mitigate this using `useMemo` for complex geometry calculations (like the Dodecahedron dihedral angles) and by ensuring `new THREE.Material()` or `new THREE.Geometry()` are never instantiated inside a `useFrame` render loop.

2. **Tailwind v4 CSS-Based Dark Mode**
   - *Decision:* I used Tailwind v4's modern CSS variable-based configuration rather than a heavy JS theme library.
   - *Tradeoff:* Requires a custom `<script>` injected into `layout.tsx`'s `<head>` to prevent the dreaded "theme flash" before React hydrates, but results in a lighter client bundle and native CSS execution immediately upon paint.

3. **2D HTML Overlays in a 3D Canvas (`@react-three/drei`)**
   - *Decision:* Project details and hover cards are rendered as standard DOM elements mapped into my 3D space using `<Html transform>`.
   - *Tradeoff:* True 3D text in WebGL is difficult to style, wrap, and make accessible. HTML overlays are fully accessible, selectable, and styleable with standard Tailwind. The tradeoff is DOM syncing overhead, which I manage via strict boolean toggles (`isFacingFront`) to disable pointer events and opacity on faces rotating away from the camera.

4. **Component Coupling & Decoupling**
   - *Decision:* The 3D state, interaction logic, and the Data Schema (the `FaceData` objects) are kept highly decoupled. The core Dodecahedron loops over an array of standard objects, making it trivial for me to add or remove faces without writing new WebGL logic.

## 🛠️ Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

*Ensure you use `--yes --legacy-peer-deps` if resolving dependency tree clashes with R3F libraries.*
