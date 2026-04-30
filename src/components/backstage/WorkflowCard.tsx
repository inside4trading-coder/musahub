import { cn } from "@/lib/utils";
import type { BackstageWorkflow } from "@/types/backstage";
import { TriggerBadge } from "./TriggerBadge";
import { IntegrationChip } from "./IntegrationChip";

type Props = {
  workflow: BackstageWorkflow;
  selected: boolean;
  onClick: () => void;
};

export const WorkflowCard = ({ workflow, selected, onClick }: Props) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left transition-all",
        "hover:border-secondary/60 hover:shadow-md",
        selected && "border-secondary ring-2 ring-secondary/30 shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">{workflow.name}</h3>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            {workflow.id}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
            workflow.active
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", workflow.active ? "bg-emerald-500" : "bg-muted-foreground")} />
          {workflow.active ? "Activo" : "Inactivo"}
        </span>
      </div>

      {workflow.description && (
        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
          {workflow.description}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {workflow.triggers.map((t) => (
          <TriggerBadge key={t} trigger={t} />
        ))}
        {workflow.schedule && (
          <span className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs text-foreground/70">
            {workflow.schedule}
          </span>
        )}
      </div>

      <div className="mt-auto flex flex-wrap gap-1">
        {workflow.integrations.slice(0, 5).map((i) => (
          <IntegrationChip key={i} name={i} />
        ))}
        {workflow.integrations.length > 5 && (
          <span className="text-[11px] text-muted-foreground">
            +{workflow.integrations.length - 5}
          </span>
        )}
      </div>
    </button>
  );
};
