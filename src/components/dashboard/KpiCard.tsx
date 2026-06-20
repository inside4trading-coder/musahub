import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  index?: number;
  /** Serie temporal opcional para el sparkline. */
  series?: number[];
  /** Variación porcentual vs. periodo anterior. */
  delta?: number | null;
}

/** Mini gráfica de línea sin dependencias: SVG puro, tokenizada. */
function Sparkline({ data }: { data: number[] }) {
  const w = 92;
  const h = 28;
  const pad = 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }));
  const line = 'M ' + pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ');
  const area = `${line} L ${(w - pad).toFixed(1)},${(h - pad).toFixed(1)} L ${pad.toFixed(1)},${(h - pad).toFixed(1)} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0">
      <path d={area} fill="hsl(var(--primary))" fillOpacity="0.08" />
      <path
        d={line}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r="2.2" fill="hsl(var(--primary))" />
    </svg>
  );
}

export function KpiCard({ label, value, icon: Icon, index = 0, series, delta }: KpiCardProps) {
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta);
  const up = hasDelta && (delta as number) >= 0;
  const hasSeries = Array.isArray(series) && series.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="gradient-border-top rounded-2xl bg-card border border-border p-5 shadow-card card-hover"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="rounded-xl bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        {hasDelta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
              up ? 'text-success bg-success/10' : 'text-error bg-error/10'
            )}
            title="Variación vs. semana anterior"
          >
            {up ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : <TrendingDown className="h-3 w-3" aria-hidden="true" />}
            {up ? '+' : ''}
            {Math.round(delta as number)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-heading">{value}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        {hasSeries && <Sparkline data={series as number[]} />}
      </div>
    </motion.div>
  );
}
