# 🎵 Musa Hub

> **Plataforma operativa todo-en-uno para equipos comerciales modernos.**
> CRM, prospección geográfica, telefonía, email marketing y automatizaciones — orquestados por agentes de IA.

[![Status](https://img.shields.io/badge/status-production-8DC63F?style=flat-square)]()
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20Supabase-4ECDC4?style=flat-square)]()
[![Automations](https://img.shields.io/badge/automations-n8n-FF6B6B?style=flat-square)]()
[![License](https://img.shields.io/badge/license-Private-333?style=flat-square)]()

---

## 🌟 Visión

**Musa Hub** centraliza todo el ciclo de vida comercial — desde el primer pin en el mapa hasta la llamada cerrada — en una única interfaz coherente, rápida y bonita. Está diseñado para que un equipo pequeño rinda como uno grande, apoyándose en automatizaciones (n8n), telefonía VoIP (Zadarma), email transaccional (Brevo) y agentes de IA visualizables en tiempo real desde el **Backstage**.

---

## ✨ Funcionalidades Principales

### 📊 Dashboard
- KPIs diarios: **60 llamadas**, **30 contestadas**, **20 emails**, **10 llamadas válidas**.
- Feed de actividad en vivo y gráficas de progreso por agente.
- Llamadas válidas del mes corriente con desglose por estado.

### 🗂️ CRM Pipeline
- Vista **Kanban** con etapas configurables y código de color.
- Valor por defecto, asignación automática de leads y tracking de actividad.
- Filtrado por agente, etapa y rango temporal.

### 🗺️ Prospecting Tool
- Búsqueda geográfica por **polígonos** sobre Google Maps.
- Generación de PINs seguros y enriquecimiento de contactos vía edge function `scrape-contacts`.
- **Categorías de prospección con multi-selección** — un mismo lead puede clasificarse en más de una categoría a la vez.
- **Snippets con vista previa** — fragmentos de mensaje reutilizables para no reescribir la prospección desde cero.

### 📞 Calls Analytics
- Integración nativa con **Zadarma**: sincronización, estados, duración y grabaciones.
- Criterio de validez: **contestada Y duración ≥ 60s**.
- Reproducción de audios desde la API de Zadarma con resolución de PBX call IDs.

### 📧 Email Campaigns & Metrics
- Campañas multi-step con secuencias programadas y envío como hilo.
- Callbacks de n8n para tracking real-time.
- Métricas Brevo: aperturas, clicks, **Hard Bounces** y goals diarios.

### 📚 Knowledge Base
- Categorías, restricciones por autor y búsqueda **fuzzy**.

### 🎭 Backstage
- Visualización de los workflows n8n como **agentes vivos**:
  - **Grid View** — listado clásico con detalle, filtros y panel de workflow (`WorkflowCard`, `WorkflowFilters`, `WorkflowDetailPanel`, `FlowDiagram`).
  - **Orbit View** — sistema solar pixel-art en 3D (React Three Fiber) con planetas, satélites y skybox.
- Sincronización periódica del estado de los workflows vía la edge function `backstage-sync`.

> **Nota:** la vista **Pixel Office** (oficina isométrica) que documentaban versiones
> anteriores de este README fue descontinuada. Solo quedan Grid View y Orbit View.

### 🔐 Auth & RBAC
- Supabase Auth con roles **admin** y **team**.
- Roles almacenados en tabla separada (`user_roles`) + función `has_role` SECURITY DEFINER.

---

## 🛠️ Stack Técnico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 18 · Vite 5 · TypeScript 5 · Tailwind v3 · shadcn/ui |
| **3D / Pixel** | three.js · React Three Fiber · Canvas 2D engine |
| **Backend** | Lovable Cloud (Supabase) · Edge Functions (Deno) |
| **Automatizaciones** | n8n (webhooks bidireccionales) |
| **Telefonía** | Zadarma API |
| **Email** | Brevo (transaccional + marketing) |
| **Mapas** | Google Maps JavaScript API |
| **IA** | Lovable AI Gateway (Gemini · GPT-5) |

---

## 🎨 Identidad Visual

- **Lime Green** `#8DC63F` — primario, energía y acción.
- **Turquoise** `#4ECDC4` — secundario, claridad y datos.
- Tipografía bold, esquinas redondeadas, jerarquía clara.
- Pixel-art retro reservado para el Backstage (Orbit View).

---

## 🏗️ Arquitectura

### Hooks de datos

| Hook | Para qué |
|---|---|
| `useBackstageData.ts` | Trae el estado de los workflows n8n para Grid View y Orbit View, sincronizado vía `backstage-sync` |
| `useReducedMotion.ts` | Respeta `prefers-reduced-motion`; envuelve toda la app en `MotionConfig` de framer-motion |
| `use-mobile.tsx` | Breakpoint responsive compartido |
| `use-toast.ts` | Sistema de notificaciones (shadcn) |

> La mayoría de la lógica de datos vive directo en las páginas en vez de
> extraerse a hooks por módulo: `CRM.tsx` (54 KB), `Prospecting.tsx` (24 KB) y
> `Calls.tsx` (26 KB) son los archivos más grandes del repo.

### Código huérfano (no eliminar sin revisar antes)

La ruta `/` no renderiza una landing — desde marzo 2026 `Index.tsx` es un
simple `<Navigate to="/dashboard" />`. Como resultado, estos componentes del
template original **no están conectados a ninguna ruta activa**:

```
src/components/
├── Hero.tsx / HeroCanvas.tsx      # huérfano
├── About.tsx                       # huérfano
├── Services.tsx                    # huérfano
├── Portfolio.tsx                   # huérfano
├── Blog.tsx                        # huérfano
├── Contact.tsx                     # huérfano
├── Navigation.tsx / TopBar.tsx     # huérfano
├── Marquee.tsx                     # huérfano
├── Footer.tsx                      # huérfano
└── three/HeroScene.tsx             # huérfano — escena 3D del hero sin uso
```

Y en el Backstage hay **dos implementaciones de escena 3D**; solo una está
activa:

| Componente | Estado |
|---|---|
| `components/backstage/BackstageScene3D.tsx` | ✅ Activa — es la que `BackstageViewer.tsx` importa y renderiza en la vista Orbit |
| `components/three/BackstageScene.tsx` | ⚠️ Huérfana — no la importa ningún archivo de rutas ni `BackstageViewer.tsx` |

### Base de datos

14 migraciones SQL versionadas (marzo → abril 2026), con Supabase Auth + RLS
por rol (`admin` / `team`) vía la función `has_role` (`SECURITY DEFINER`).

### Estructura completa

```
src/
├── components/
│   ├── backstage/          # Grid View, WorkflowCard/Filters/DetailPanel, FlowDiagram, BackstageScene3D (Orbit — activa)
│   ├── three/               # HeroScene, BackstageScene — ambos huérfanos, sin ruta que los use
│   ├── motion/               # Wrappers de animación
│   ├── ui/                   # shadcn primitives
│   ├── ProspectingMap.tsx    # Mapa de polígonos (Google Maps)
│   ├── AppSidebar.tsx / AppLayout.tsx / ProtectedRoute.tsx
│   └── Hero / About / Services / Portfolio / Blog / Contact / Footer / Navigation / Marquee / TopBar / HeroCanvas  # huérfanos — ver nota arriba
├── pages/                   # Dashboard · CRM (54KB) · Calls (26KB) · Prospecting (24KB) · EmailCampaigns · EmailMetrics · Knowledge · Backstage · Settings · Login · Index (redirect a /dashboard)
├── hooks/                    # useBackstageData, useReducedMotion, use-mobile, use-toast
├── lib/
│   ├── motion.ts
│   ├── pixel-office/         # Motor heredado, sin uso activo (Pixel Office view descontinuada)
│   └── supabase.ts / utils.ts
├── integrations/supabase/    # Cliente + types autogenerados
└── contexts/                  # AuthContext

supabase/
├── functions/                 # 8 edge functions — ver tabla arriba
└── migrations/                # 14 migraciones (mar–abr 2026)
```

---

## 🚀 Edge Functions

| Función | Propósito |
|---------|-----------|
| `backstage-sync` | Sincroniza el estado de los workflows de n8n mostrados en el Backstage |
| `brevo-email-stats` | KPIs y bounces de Brevo |
| `email-campaign-callback` | Webhook entrante desde n8n |
| `get-call-recording` | Resuelve y sirve audios Zadarma |
| `process-scheduled-steps` | Ejecuta steps programados de campañas |
| `scrape-contacts` | Enriquecimiento de leads del prospecting |
| `send-email-campaign` | Disparo a n8n con variables dinámicas |
| `sync-zadarma-calls` | Sincronización periódica de llamadas |

---

## 📐 Convenciones

- **Fechas sin hora**: concatenar `'T00:00:00'` antes de parsear ISO (evita timezone shifts).
- **Llamadas válidas**: `answered === true && duration >= 60`.
- **Secretos**: gestionados vía Lovable Cloud — nunca hardcoded.
- **Diseño**: tokens semánticos HSL en `index.css` y `tailwind.config.ts`. **Nunca** colores directos en componentes.

---

## 🧭 Roadmap (alto nivel)

- [ ] Reportes PDF programados desde el Dashboard.
- [ ] Multi-tenant con workspaces aislados.
- [ ] Agente IA conversacional sobre el CRM.
- [ ] Mobile-first redesign del Pipeline.

---

## 📜 Licencia

Proyecto privado — © Musa Hub. Todos los derechos reservados.
