import { useMemo, useState } from "react";
import { AlertCircle, Inbox, LayoutGrid, RefreshCw, Workflow } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useBackstageData } from "@/hooks/useBackstageData";
import { useIsMobile } from "@/hooks/use-mobile";
import type { BackstageWorkflow } from "@/types/backstage";
import { WorkflowCard } from "./WorkflowCard";
import { WorkflowFilters } from "./WorkflowFilters";
import { WorkflowDetailPanel } from "./WorkflowDetailPanel";
import { BackstageScene3D } from "./BackstageScene3D";
import { ControlRoomScene3D } from "./ControlRoomScene3D";
import { PixelOfficeScene } from "./PixelOfficeScene";

type ViewMode = "grid" | "orbit" | "controlroom" | "pixel";

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
};

export const BackstageViewer = () => {
  const { data, loading, error, usingMock, refetch } = useBackstageData();

  const [query, setQuery] = useState("");
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [selected, setSelected] = useState<BackstageWorkflow | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const isMobile = useIsMobile();
  const [view, setView] = useState<ViewMode>("controlroom");
  const effectiveView: ViewMode = isMobile ? "grid" : view;

  const activeWorkflows = useMemo(
    () => data?.workflows.filter((w) => w.active) ?? [],
    [data],
  );

  const allTriggers = useMemo(() => {
    const set = new Set<string>();
    activeWorkflows.forEach((w) => w.triggers.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [activeWorkflows]);

  const allIntegrations = useMemo(() => {
    const set = new Set<string>();
    activeWorkflows.forEach((w) => w.integrations.forEach((i) => set.add(i)));
    return Array.from(set).sort();
  }, [activeWorkflows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeWorkflows.filter((w) => {
      if (selectedTriggers.length && !w.triggers.some((t) => selectedTriggers.includes(t)))
        return false;
      if (
        selectedIntegrations.length &&
        !w.integrations.some((i) => selectedIntegrations.includes(i))
      )
        return false;
      if (q) {
        const hay = [
          w.name,
          w.description ?? "",
          w.id,
          ...(w.tags ?? []),
          ...w.integrations,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activeWorkflows, query, selectedTriggers, selectedIntegrations]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, value: string) => {
    setArr(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  const handleSelect = (wf: BackstageWorkflow) => {
    setSelected(wf);
    setPanelOpen(true);
  };

  const clearFilters = () => {
    setQuery("");
    setSelectedTriggers([]);
    setSelectedIntegrations([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
              style={{
                background: "hsl(var(--secondary) / 0.15)",
                color: "hsl(var(--secondary))",
              }}
            >
              <Workflow className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Backstage
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Backstage de Automatizaciones
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Vista de solo lectura de los workflows activos en n8n. Lo que está pasando detrás del telón,
            sin entrar al editor.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold" style={{ color: "hsl(var(--secondary))" }}>
              {activeWorkflows.length}
            </span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              workflows activos
            </span>
          </div>
          {data?.generated_at && (
            <p className="text-[11px] text-muted-foreground">
              Generado: {formatDate(data.generated_at)}
            </p>
          )}
          <div className="flex items-center gap-2">
            {usingMock && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Datos mock
              </span>
            )}
            {!isMobile && (
              <div className="flex items-center gap-1 rounded-full border border-border bg-muted/40 p-0.5">
                <button
                  onClick={() => setView("grid")}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    view === "grid" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-3 w-3" />
                  Grid
                </button>
                <button
                  onClick={() => setView("orbit")}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    view === "orbit" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span aria-hidden>⬡</span>
                  Orbit
                </button>
                <button
                  onClick={() => setView("controlroom")}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    view === "controlroom" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span aria-hidden>⚙</span>
                  Control Room
                </button>
                <button
                  onClick={() => setView("pixel")}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    view === "pixel" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span aria-hidden>🟦</span>
                  Pixel Office
                </button>
              </div>
            )}
            <Button size="sm" variant="ghost" onClick={refetch} className="h-7 px-2 text-xs">
              <RefreshCw className="mr-1 h-3 w-3" />
              Refrescar
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile notice */}
      {isMobile && view !== "grid" && (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
          Vista 3D disponible en escritorio
        </div>
      )}

      {/* Body with 400ms fade transition */}
      <div
        key={effectiveView}
        className="transition-opacity duration-[400ms] animate-in fade-in"
      >
        {effectiveView === "controlroom" && !loading && !error ? (
          <ControlRoomScene3D
            workflows={filtered.length > 0 ? filtered : activeWorkflows}
            onExit={() => setView("grid")}
            onSelectWorkflow={(wf) => { setSelected(wf); }}
          />
        ) : effectiveView === "orbit" && !loading && !error ? (
          <BackstageScene3D
            workflows={filtered.length > 0 ? filtered : activeWorkflows}
            onExit={() => setView("grid")}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            <aside className="lg:sticky lg:top-6 lg:self-start">
              {loading ? (
                <Skeleton className="h-64 rounded-2xl" />
              ) : (
                <WorkflowFilters
                  query={query}
                  onQueryChange={setQuery}
                  triggers={allTriggers}
                  selectedTriggers={selectedTriggers}
                  onToggleTrigger={(t) => toggle(selectedTriggers, setSelectedTriggers, t)}
                  integrations={allIntegrations}
                  selectedIntegrations={selectedIntegrations}
                  onToggleIntegration={(i) =>
                    toggle(selectedIntegrations, setSelectedIntegrations, i)
                  }
                  onClear={clearFilters}
                />
              )}
            </aside>

            <section>
              {loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-44 rounded-2xl" />
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 p-12 text-center">
                  <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
                  <h3 className="text-base font-semibold text-foreground">No pudimos cargar el backstage</h3>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
                  <Button onClick={refetch} variant="outline" size="sm" className="mt-4">
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Reintentar
                  </Button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center">
                  <Inbox className="mb-3 h-8 w-8 text-muted-foreground" />
                  <h3 className="text-base font-semibold text-foreground">Sin resultados</h3>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Ningún workflow activo coincide con los filtros aplicados.
                  </p>
                  {(query.length > 0 || selectedTriggers.length > 0 || selectedIntegrations.length > 0) && (
                    <Button onClick={clearFilters} variant="outline" size="sm" className="mt-4">
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((wf) => (
                    <WorkflowCard
                      key={wf.id}
                      workflow={wf}
                      selected={selected?.id === wf.id && panelOpen}
                      onClick={() => handleSelect(wf)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <WorkflowDetailPanel
        workflow={selected}
        open={panelOpen}
        onOpenChange={setPanelOpen}
      />
    </div>
  );
};

export default BackstageViewer;
