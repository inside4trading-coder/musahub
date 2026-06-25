# Propuesta de refresh UI/UX — Musa Hub

> Plataforma operativa todo-en-uno · CRM · Prospección · Llamadas · Email · Backstage
> Documento de trabajo · 20 jun 2026

---

## 0. Contexto del deploy revisado

| Punto | Hallazgo |
|-------|----------|
| Proyecto Vercel | `vend-ai-lab` (team *VendAI Lab's projects*), framework **Vite**, Node 24.x |
| Repo desplegado | `inside4trading-coder/VendAI-Lab` (privado) → dominio **vendai.es** |
| Último deploy | `READY` · producción · commit *"fix(hero): NeuralField 3D en móvil"* |
| Repo del producto | `inside4trading-coder/musahub` → la app operativa (CRM, prospección, etc.) |
| Marca | **Musa Hub**, producto de *Musa · Equipo Creativo*. El login lo titula "Agency Portal". |

**Observación clave:** hoy conviven dos marcas —**Musa Hub** (el producto) y **VendAI** (el dominio público con un hero 3D)—. El sistema (`index.css` + `tailwind.config.ts`) ya está limpio y bien tokenizado: light theme, **lime `#8DC63F` + teal `#4ECDC4`**, Inter, esquinas redondeadas y sombras suaves. La base es sólida; el refresh es de **evolución, no de reinvención**.

---

## 1. Diagnóstico del UI/UX actual

### Lo que funciona ✅
- **Sistema de tokens semántico** en HSL, sin colores hardcodeados (convención ya documentada en el README).
- Identidad clara: gradiente lime→teal, `lime-dot` como firma, `gradient-border-top` en las tarjetas KPI.
- Stack moderno (shadcn/ui + framer-motion + recharts) que da consistencia "gratis".
- Animaciones de entrada sutiles (framer-motion) en el Dashboard.

### Oportunidades de mejora ⚠️
1. **Jerarquía visual plana** — los heros internos (`gradient-hero`) y los KPI cards compiten en peso; falta un "punto focal" por pantalla.
2. **Densidad inconsistente** — el Dashboard mezcla 5 KPIs + chart + feed + acciones sin un ritmo de espaciado unificado.
3. **Color de datos ad-hoc** — el chart usa HSL literales (`hsl(220 70% 55%)`, etc.) fuera del sistema de tokens → rompe la convención y dificulta el dark mode.
4. **Sin modo oscuro real** — `darkMode: ["class"]` está configurado pero no hay paleta `.dark` en `index.css`.
5. **Estados vacíos / carga pobres** — sólo un spinner centrado; sin skeletons ni empty-states ilustrados.
6. **Login funcional pero genérico** — no transmite el carácter "vivo" del producto (Backstage, pixel-art).
7. **Mobile** — el README lo marca como pendiente ("Mobile-first redesign del Pipeline").
8. **Accesibilidad** — falta foco visible consistente, contraste AA en `muted-text`, y `prefers-reduced-motion`.

---

## 2. Propuesta de dirección visual

### 2.1 Refinar el sistema de color (sin romper la marca)
- Mantener lime + teal como **acento**, no como relleno masivo. Regla 60/30/10: 60% superficies neutras, 30% navy de texto, 10% acento.
- **Migrar los colores del chart a tokens** (`--chart-1`…`--chart-5`) para coherencia y dark mode.
- Añadir una **escala de neutros más rica** (5–6 grises navy) para separar superficies (`bg` → `card` → `card-raised`).

### 2.2 Modo oscuro de primera clase
- Definir el bloque `.dark` en `index.css` (fondo navy profundo `#10182B`, cards `#18223B`, acento lime ligeramente desaturado para no vibrar).
- El Backstage (pixel-art / orbit) **brilla** en oscuro: convertirlo en la experiencia "estrella" nocturna.

### 2.3 Jerarquía y ritmo
- **Escala tipográfica** explícita (Display 40 / H1 30 / H2 24 / H3 20 / Body 15 / Caption 13) en lugar de los `text-3xl/2xl/xl` actuales.
- Sistema de espaciado de 4px con "secciones" de respiro (`space-y-8` entre bloques mayores).
- Un único **punto focal por vista** (ej. en Dashboard: el chart de 14 días como héroe; los KPIs como cinta secundaria).

### 2.4 Componentes a elevar
| Componente | Mejora propuesta |
|------------|------------------|
| **KPI cards** | Mini-sparkline + delta vs. periodo anterior (▲ 12%). Hoy son sólo número + label. |
| **Pipeline Kanban** | Tarjetas con avatar de agente, valor y "edad" del deal; columnas con conteo + suma de valor en cabecera. |
| **Empty states** | Ilustración pixel-art ligera + CTA ("Dibuja tu primer polígono"). |
| **Loading** | Skeletons por tipo de bloque (no spinner global). |
| **Toasts** | Ya usa `sonner`; estandarizar variantes success/error/info con iconografía. |
| **Login** | Lado izquierdo animado con un guiño al Backstage (orbit sutil) en vez del logo estático. |

### 2.5 Microinteracciones y movimiento
- `framer-motion` ya está: estandarizar una librería de presets (fade-up 0.3s, stagger 0.05s) reutilizable.
- Respetar `prefers-reduced-motion` globalmente.
- Hover states consistentes (`card-hover` ya existe → aplicarlo en todas las superficies clicables).

---

## 3. Plan de ejecución por fases

**Fase 1 — Fundaciones (1 sem)**
Tokens de color extendidos · escala tipográfica · dark mode base · migrar colores de charts a tokens.

**Fase 2 — Componentes núcleo (1–2 sem)**
KPI cards con sparkline/delta · skeletons · empty-states · toasts unificados · foco/accesibilidad AA.

**Fase 3 — Vistas estrella (2 sem)**
Rediseño Dashboard (jerarquía) · Pipeline Kanban mobile-first · pulido del Backstage en dark · Login animado.

**Fase 4 — Pulido y QA (1 sem)**
Responsive audit · `prefers-reduced-motion` · contraste/lectores de pantalla · performance del 3D en móvil.

> Cada fase es desplegable de forma independiente en Vercel; sin big-bang.

---

## 4. La landing comercial (entregable incluido)

Junto a esta propuesta dejo **`index.html`** — una landing page comercial completa para vender Musa Hub, construida con el sistema de marca real (lime/teal, Inter, gradiente hero, motivo de puntos "neurales").

**Estructura (conversión-first):**
1. Nav sticky con CTA "Solicitar demo"
2. Hero — *"Del primer pin en el mapa a la llamada cerrada"* + mock del Dashboard en vivo
3. Strip de stack (Supabase · n8n · Zadarma · Brevo · Google Maps · IA)
4. Grid de 6 funcionalidades
5. **Backstage** como diferenciador (sección dark + orbit animado)
6. Cómo funciona (3 pasos)
7. Banda de métricas
8. Precios (Starter / Pro / Agency)
9. CTA final + footer

**Características técnicas:** un solo archivo, sin build, responsive, scroll-reveal, mock del producto en CSS puro. Desplegable como sitio estático en Vercel tal cual.

### Decisión pendiente — marca de la landing
La construí con marca **Musa Hub** (porque pediste comercializar "el sistema de musahub"). Si la estrategia comercial pública es **VendAI** (el dominio actual), es un cambio cosmético de 10 min: logo, copy del hero y paleta de acento. Dime cuál es la marca go-to-market.

---

## 5. Próximos pasos sugeridos

- [ ] Confirmar marca de la landing (Musa Hub vs VendAI).
- [ ] ¿Integro la landing como ruta `/` del repo `musahub` o como proyecto Vercel independiente (`musahub-landing`)?
- [ ] Aprobar Fase 1 del refresh para empezar por las fundaciones de color + dark mode.
- [ ] Capturas reales del producto para reemplazar el mock del hero (suben mucho la conversión).
