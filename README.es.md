# MusaHub

Plataforma operativa todo-en-uno para equipos comerciales: CRM Kanban, prospección geográfica por polígonos, telefonía Zadarma, email marketing con Brevo y visualización de workflows n8n en tiempo real mediante Backstage.

**Producción:** https://musahub.vercel.app

## Qué hace

- **CRM** — gestión de contactos y oportunidades mediante un tablero Kanban.
- **Prospección geográfica** — creación y gestión de polígonos en Google Maps para organizar zonas comerciales.
- **Telefonía** — integración con Zadarma para llamadas y seguimiento de actividad.
- **Email marketing** — campañas y métricas mediante Brevo.
- **Backstage** — visualización operativa de workflows n8n mediante Grid View y Orbit View 3D.
- **Dashboard** — resumen de actividad y métricas del equipo.
- **Configuración** — ajustes de la plataforma y del equipo.

## Arquitectura

### Hooks de datos

| Hook | Para qué |
|---|---|
| `useBackstageData.ts` | Obtiene el estado de los workflows n8n para Grid View y Orbit View, sincronizado mediante `backstage-sync`. |
| `useReducedMotion.ts` | Respeta `prefers-reduced-motion` y configura `MotionConfig` de Framer Motion. |
| `use-mobile.tsx` | Breakpoint responsive compartido. |
| `use-toast.ts` | Sistema de notificaciones basado en shadcn. |

La mayor parte de la lógica de datos vive directamente en las páginas: `CRM.tsx` (54 KB), `Prospecting.tsx` (24 KB) y `Calls.tsx` (26 KB) son los archivos más grandes del repositorio.

### Componentes activos y heredados

La ruta `/` redirige a `/dashboard`; `Index.tsx` es un redirect y no una landing pública activa.

Los siguientes componentes del template original no están conectados a rutas activas y deben considerarse código huérfano hasta ser revisados:

- `Hero.tsx` / `HeroCanvas.tsx`.
- `About.tsx`, `Services.tsx`, `Portfolio.tsx`, `Blog.tsx` y `Contact.tsx`.
- `Navigation.tsx`, `TopBar.tsx`, `Marquee.tsx` y `Footer.tsx`.
- `three/HeroScene.tsx`.

Backstage contiene dos implementaciones de escena 3D:

| Componente | Estado |
|---|---|
| `components/backstage/BackstageScene3D.tsx` | Activa; la importa y renderiza `BackstageViewer.tsx` en Orbit View. |
| `components/three/BackstageScene.tsx` | Huérfana; ninguna ruta activa ni `BackstageViewer.tsx` la importa. |

### Base de datos y estructura

La aplicación utiliza Supabase Auth y RLS por rol (`admin` / `team`) mediante la función `has_role` con `SECURITY DEFINER`. El proyecto contiene 14 migraciones SQL versionadas de marzo a abril de 2026 y 8 edge functions.

```text
src/
├── components/
│   ├── backstage/          # Grid View, Orbit View, cards, filtros y paneles
│   ├── three/               # Escenas heredadas sin ruta activa
│   ├── motion/              # Wrappers de animación
│   ├── ui/                  # Primitivas shadcn
│   ├── ProspectingMap.tsx   # Mapa de polígonos de Google Maps
│   ├── AppSidebar.tsx / AppLayout.tsx / ProtectedRoute.tsx
│   └── componentes de landing heredados
├── pages/                   # Dashboard, CRM, Calls, Prospecting, EmailCampaigns,
│                            # EmailMetrics, Knowledge, Backstage, Settings, Login
├── hooks/                   # Backstage, reduced motion, mobile y toast
├── lib/
│   ├── motion.ts
│   ├── pixel-office/        # Motor heredado sin uso activo
│   └── supabase.ts / utils.ts
├── integrations/supabase/   # Cliente y tipos autogenerados
└── contexts/                # AuthContext

supabase/
├── functions/               # Edge functions
└── migrations/              # 14 migraciones
```

## Stack técnico

```text
Frontend    React + TypeScript + Vite
UI          shadcn/ui + Tailwind CSS
Animación   Framer Motion
Mapas       Google Maps
Telefonía   Zadarma
Email       Brevo
Backend/DB  Supabase (Postgres, Auth, RLS, Realtime)
Workflows   n8n + Backstage sync
Deploy      Vercel
```

## Desarrollo local

```bash
npm install
npm run dev
```

## Roadmap

- Reportes PDF programados desde el Dashboard.
- Mejoras en la sincronización y monitorización de workflows.
- Ampliación de automatizaciones comerciales y métricas.

## Estado del proyecto

Pixel Office está descontinuada y su motor heredado se conserva únicamente como referencia. Revisa los componentes marcados como huérfanos antes de eliminarlos.

## Licencia

Privado — plataforma operativa comercial.