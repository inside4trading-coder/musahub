# Plan: Backstage en vivo conectado a n8n

## Objetivo
Reemplazar el mock actual de `/backstage` por datos en vivo desde tu instancia de n8n, mediante un workflow importable que expone un webhook y devuelve todos los workflows en el formato `BackstageResponse` que ya usa el frontend.

## Arquitectura

```text
Frontend (/backstage)
   │  fetch
   ▼
Edge Function: backstage-sync  (Lovable Cloud)
   │  POST con header Bearer
   ▼
n8n Webhook  →  n8n API (GET /workflows)  →  Transform  →  Respond JSON
```

Por qué proxy vía edge function:
- Evita CORS desde el navegador hacia n8n.
- El token del webhook nunca se expone al cliente.
- Permite cachear / normalizar la respuesta.

## Entregables

### 1. Archivo importable `public/n8n-backstage-sync-workflow.json`
Workflow de n8n con:
- **Webhook node** (POST `/webhook/backstage-sync`) con Header Auth (`Authorization: Bearer <BACKSTAGE_TOKEN>`).
- **HTTP Request node** → `GET {{ $env.N8N_HOST }}/api/v1/workflows?active=true` con header `X-N8N-API-KEY`.
- **Code node** → mapea cada workflow de n8n a la forma `BackstageWorkflow`:
  - `id`, `name`, `active`
  - `triggers` ← detectados desde `nodes[].type` (`n8n-nodes-base.webhook`, `telegramTrigger`, `scheduleTrigger`, `cron`, etc.)
  - `endpoints` ← extraídos de nodes webhook (`path`, `httpMethod`)
  - `integrations` ← derivadas de `nodes[].type` (Telegram, OpenAI, Supabase, Brevo, Zadarma, SMTP, HTTP, etc.)
  - `tags` ← `tags[].name`
  - `schedule` ← cron expression del Schedule Trigger
  - `description` ← primera línea del Sticky Note "📝 Descripción" si existe, o vacío
  - `graph.nodes` / `graph.edges` ← derivados de `nodes` + `connections`
- **Respond to Webhook node** → JSON `{ generated_at, total_workflows, workflows }`.

Incluirá instrucciones embebidas en Sticky Notes con los 3 pasos de setup (credenciales n8n API, activar webhook, copiar URL).

### 2. Edge function `supabase/functions/backstage-sync/index.ts`
- CORS habilitado.
- Lee secretos `N8N_BACKSTAGE_WEBHOOK_URL` y `N8N_BACKSTAGE_TOKEN`.
- Hace `POST` al webhook con `Authorization: Bearer <token>`.
- Devuelve el JSON tal cual al frontend, con manejo de errores.
- `verify_jwt = false` (lectura pública dentro de la app, protegida por el token del lado n8n).

### 3. Actualizar `src/hooks/useBackstageData.ts`
- Cambiar `ENDPOINT` de `/office/backstage` a invocar la edge function con `supabase.functions.invoke('backstage-sync')`.
- Mantener fallback a `backstageMock` si falla (badge "Datos mock" ya existe).
- Añadir auto-refresh opcional cada 60s (configurable) para sensación "live".

### 4. Secretos a configurar (te los pediré con `add_secret` tras aprobar)
- `N8N_BACKSTAGE_WEBHOOK_URL` — URL del webhook del workflow importado (Production URL).
- `N8N_BACKSTAGE_TOKEN` — token compartido para el Header Auth del webhook.

## Pasos de uso (una vez implementado)
1. Importas `n8n-backstage-sync-workflow.json` en tu n8n.
2. Configuras la credencial **n8n API** (Settings → n8n API → crear key) y la asignas al HTTP Request node.
3. Configuras la credencial **Header Auth** con el token que elijas.
4. Activas el workflow y copias la Production URL del webhook.
5. Me das webhook URL + token; los guardo como secretos.
6. `/backstage` empieza a mostrar tus workflows reales en vivo.

## Archivos afectados
- **Nuevos**: `public/n8n-backstage-sync-workflow.json`, `supabase/functions/backstage-sync/index.ts`.
- **Editados**: `src/hooks/useBackstageData.ts`.
- **Sin cambios**: tipos (`BackstageResponse` ya encaja), UI del Backstage, mock (queda como fallback).
