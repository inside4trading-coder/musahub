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
  - **Grid View** — listado clásico con detalle.
  - **Orbit View** — sistema solar pixel-art con planetas, satélites y skybox.
  - **Pixel Office** — oficina isométrica donde cada agente se mueve, lee, trabaja o patrulla según su trigger.

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
- Pixel-art retro reservado para el Backstage (Orbit + Office).

---

## 🚀 Edge Functions

| Función | Propósito |
|---------|-----------|
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

## 📂 Estructura

```
src/
├── components/
│   ├── backstage/        # Grid · Orbit · Pixel Office
│   ├── ui/               # shadcn primitives
│   └── ...
├── pages/                # Dashboard · CRM · Calls · Prospecting · Backstage...
├── lib/
│   └── pixel-office/     # Motor pixel-art (sprites, layout, engine)
├── integrations/supabase # Cliente + types autogenerados
└── contexts/             # AuthContext, etc.
supabase/functions/       # Edge functions (Deno)
```

---

## 🧭 Roadmap (alto nivel)

- [ ] Reportes PDF programados desde el Dashboard.
- [ ] Multi-tenant con workspaces aislados.
- [ ] Agente IA conversacional sobre el CRM.
- [ ] Mobile-first redesign del Pipeline.

---

## 📜 Licencia

Proyecto privado — © Musa Hub. Todos los derechos reservados.

---

<p align="center">
