import { cn } from "@/lib/utils";

export const IntegrationChip = ({ name, className }: { name: string; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-md border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground/90",
      "dark:bg-secondary/15",
      className,
    )}
    style={{ color: "hsl(var(--secondary))" }}
  >
    {name}
  </span>
);
