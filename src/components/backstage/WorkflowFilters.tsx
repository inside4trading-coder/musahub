import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  query: string;
  onQueryChange: (v: string) => void;
  triggers: string[];
  selectedTriggers: string[];
  onToggleTrigger: (t: string) => void;
  integrations: string[];
  selectedIntegrations: string[];
  onToggleIntegration: (i: string) => void;
  onClear: () => void;
};

export const WorkflowFilters = ({
  query,
  onQueryChange,
  triggers,
  selectedTriggers,
  onToggleTrigger,
  integrations,
  selectedIntegrations,
  onToggleIntegration,
  onClear,
}: Props) => {
  const hasFilters =
    query.length > 0 || selectedTriggers.length > 0 || selectedIntegrations.length > 0;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar workflow, tag, descripción..."
          className="pl-9"
        />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Triggers
        </p>
        <div className="flex flex-wrap gap-1.5">
          {triggers.map((t) => {
            const active = selectedTriggers.includes(t);
            return (
              <button
                key={t}
                onClick={() => onToggleTrigger(t)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  active
                    ? "border-secondary bg-secondary/15 text-secondary-foreground"
                    : "border-border bg-muted/40 text-foreground/70 hover:border-secondary/50",
                )}
                style={active ? { color: "hsl(var(--secondary))" } : undefined}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Integraciones
        </p>
        <div className="flex flex-wrap gap-1.5">
          {integrations.map((i) => {
            const active = selectedIntegrations.includes(i);
            return (
              <button
                key={i}
                onClick={() => onToggleIntegration(i)}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
                  active
                    ? "border-secondary bg-secondary/15"
                    : "border-border bg-muted/40 text-foreground/70 hover:border-secondary/50",
                )}
                style={active ? { color: "hsl(var(--secondary))" } : undefined}
              >
                {i}
              </button>
            );
          })}
        </div>
      </div>

      {hasFilters && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 self-start text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Limpiar filtros
        </button>
      )}
    </div>
  );
};
