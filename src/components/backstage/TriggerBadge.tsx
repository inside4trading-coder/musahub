import { cn } from "@/lib/utils";

const ICONS: Record<string, string> = {
  webhook: "🪝",
  schedule: "⏰",
  telegram: "✈️",
  chat: "💬",
  manual: "🖐️",
};

export const TriggerBadge = ({ trigger, className }: { trigger: string; className?: string }) => {
  const icon = ICONS[trigger.toLowerCase()] ?? "⚡";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground/80",
        className,
      )}
    >
      <span aria-hidden>{icon}</span>
      <span className="capitalize">{trigger}</span>
    </span>
  );
};
