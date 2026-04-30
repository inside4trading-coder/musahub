import { X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { BackstageWorkflow } from "@/types/backstage";
import { TriggerBadge } from "./TriggerBadge";
import { IntegrationChip } from "./IntegrationChip";
import { FlowDiagram } from "./FlowDiagram";

type Props = {
  workflow: BackstageWorkflow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </p>
    {children}
  </div>
);

export const WorkflowDetailPanel = ({ workflow, open, onOpenChange }: Props) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-2xl"
      >
        {workflow && (
          <div className="flex flex-col">
            <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-5 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle className="truncate text-xl">{workflow.name}</SheetTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">{workflow.id}</p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </SheetHeader>

            <div className="space-y-6 px-6 py-6">
              {workflow.description && (
                <p className="text-sm leading-relaxed text-foreground/80">
                  {workflow.description}
                </p>
              )}

              <Section title="Diagrama">
                <FlowDiagram workflow={workflow} />
              </Section>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Section title="Triggers">
                  <div className="flex flex-wrap gap-1.5">
                    {workflow.triggers.map((t) => (
                      <TriggerBadge key={t} trigger={t} />
                    ))}
                  </div>
                </Section>

                {workflow.schedule && (
                  <Section title="Schedule">
                    <p className="text-sm text-foreground/90">{workflow.schedule}</p>
                  </Section>
                )}
              </div>

              {workflow.endpoints && workflow.endpoints.length > 0 && (
                <Section title="Endpoints">
                  <ul className="space-y-1.5">
                    {workflow.endpoints.map((e) => (
                      <li
                        key={`${e.method}-${e.path}`}
                        className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs"
                      >
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                          style={{
                            background: "hsl(var(--secondary) / 0.15)",
                            color: "hsl(var(--secondary))",
                          }}
                        >
                          {e.method}
                        </span>
                        <span className="text-foreground/80">{e.path}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <Section title="Integraciones">
                <div className="flex flex-wrap gap-1.5">
                  {workflow.integrations.map((i) => (
                    <IntegrationChip key={i} name={i} />
                  ))}
                </div>
              </Section>

              {workflow.tags && workflow.tags.length > 0 && (
                <Section title="Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {workflow.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
