import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { RefreshCw, Mail, MousePointerClick, AlertTriangle, ShieldAlert, Eye, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

type DateRange = '7d' | '30d' | '90d' | 'custom';

interface DateRangeValue {
  startDate: string;
  endDate: string;
}

function getDateRange(range: DateRange, customStart?: Date, customEnd?: Date): DateRangeValue {
  if (range === 'custom' && customStart && customEnd) {
    return {
      startDate: format(customStart, 'yyyy-MM-dd'),
      endDate: format(customEnd, 'yyyy-MM-dd'),
    };
  }
  const end = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const start = subDays(end, days);
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  };
}

const statusBadge: Record<string, { label: string; className: string }> = {
  delivered: { label: 'Entregado', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  opened: { label: 'Abierto', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  clicks: { label: 'Click', className: 'bg-primary/15 text-primary border-primary/30' },
  click: { label: 'Click', className: 'bg-primary/15 text-primary border-primary/30' },
  hardBounce: { label: 'Hard Bounce', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  softBounce: { label: 'Soft Bounce', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  spam: { label: 'Spam', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  blocked: { label: 'Bloqueado', className: 'bg-muted text-muted-foreground border-border' },
  unsubscribed: { label: 'Desuscrito', className: 'bg-muted text-muted-foreground border-border' },
  invalid: { label: 'Inválido', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  deferred: { label: 'Diferido', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
};

async function fetchReports(range: DateRange) {
  const { startDate, endDate } = getDateRange(range);
  const { data, error } = await supabase.functions.invoke('brevo-email-stats', {
    body: { action: 'reports', startDate, endDate },
  });
  if (error) throw error;
  return (data?.reports ?? []) as ReportData[];
}

async function fetchEvents(range: DateRange) {
  const { startDate, endDate } = getDateRange(range);
  const { data, error } = await supabase.functions.invoke('brevo-email-stats', {
    body: { action: 'events', startDate, endDate, limit: 100 },
  });
  if (error) throw error;
  return (data?.events ?? []) as EventData[];
}

export default function EmailMetrics() {
  const [range, setRange] = useState<DateRange>('30d');

  const {
    data: reports = [],
    isLoading: loadingReports,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ['brevo-reports', range],
    queryFn: () => fetchReports(range),
  });

  const {
    data: events = [],
    isLoading: loadingEvents,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ['brevo-events', range],
    queryFn: () => fetchEvents(range),
  });

  const refreshAll = useCallback(() => {
    refetchReports();
    refetchEvents();
  }, [refetchReports, refetchEvents]);

  // Aggregated KPIs
  const totals = reports.reduce(
    (acc, r) => ({
      sent: acc.sent + (r.requests || 0),
      opens: acc.opens + (r.uniqueOpens ?? r.opens ?? 0),
      clicks: acc.clicks + (r.uniqueClicks ?? r.clicks ?? 0),
      hardBounces: acc.hardBounces + (r.hardBounces || 0),
      softBounces: acc.softBounces + (r.softBounces || 0),
      spam: acc.spam + (r.spamReports || 0),
      delivered: acc.delivered + (r.delivered || 0),
    }),
    { sent: 0, opens: 0, clicks: 0, hardBounces: 0, softBounces: 0, spam: 0, delivered: 0 }
  );

  const openRate = totals.delivered > 0 ? (totals.opens / totals.delivered) * 100 : 0;
  const clickRate = totals.delivered > 0 ? (totals.clicks / totals.delivered) * 100 : 0;
  const bounceRate = totals.sent > 0 ? ((totals.hardBounces + totals.softBounces) / totals.sent) * 100 : 0;
  const spamRate = totals.delivered > 0 ? (totals.spam / totals.delivered) * 100 : 0;

  const openRateColor = openRate >= 25 ? 'text-primary' : openRate >= 15 ? 'text-yellow-500' : 'text-destructive';
  const bounceHigh = bounceRate > 2;

  // Chart data
  const chartData = reports.map((r) => ({
    date: r.date,
    opens: r.uniqueOpens ?? r.opens ?? 0,
    clicks: r.uniqueClicks ?? r.clicks ?? 0,
  }));

  const chartConfig = {
    opens: { label: 'Aperturas', color: 'hsl(var(--primary))' },
    clicks: { label: 'Clicks', color: 'hsl(var(--secondary))' },
  };

  // Bounces list
  const bounces = events.filter((e) => e.event === 'hardBounce' || e.event === 'hard_bounce');

  const loading = loadingReports || loadingEvents;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Métricas de Email</h1>
          <p className="text-sm text-muted-foreground">Estadísticas de entrega vía Brevo</p>
        </div>
        <Button onClick={refreshAll} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
          Actualizar datos
        </Button>
      </div>

      {/* Date range filter */}
      <div className="flex gap-2">
        {(['7d', '30d', '90d'] as DateRange[]).map((r) => (
          <Button
            key={r}
            variant={range === r ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRange(r)}
          >
            {r === '7d' ? '7 días' : r === '30d' ? '30 días' : '90 días'}
          </Button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" /> Total Enviados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-heading">{totals.sent.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" /> Tasa de Apertura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn('text-2xl font-bold', openRateColor)}>{openRate.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MousePointerClick className="h-4 w-4" /> Tasa de Clics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-heading">{clickRate.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Rebotes
              {bounceHigh && <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">&gt;2%</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-heading">{(totals.hardBounces + totals.softBounces).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{bounceRate.toFixed(1)}% del total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Spam
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-heading">{spamRate.toFixed(2)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolución de Aperturas y Clicks</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Sin datos para el período seleccionado</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="opens" stroke="var(--color-opens)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clicks" stroke="var(--color-clicks)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin eventos recientes</p>
          ) : (
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email destinatario</TableHead>
                    <TableHead>Asunto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.slice(0, 50).map((ev, i) => {
                    const badge = statusBadge[ev.event] || { label: ev.event, className: 'bg-muted text-muted-foreground' };
                    return (
                      <TableRow key={`${ev.email}-${ev.date}-${i}`}>
                        <TableCell className="font-medium text-sm">{ev.email}</TableCell>
                        <TableCell className="text-sm max-w-[250px] truncate">{ev.subject || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', badge.className)}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {ev.date ? format(new Date(ev.date), 'dd MMM yyyy HH:mm', { locale: es }) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bounces Panel */}
      {bounces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Hard Bounces en el período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bounces.map((b, i) => (
                <div
                  key={`${b.email}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{b.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.date ? format(new Date(b.date), 'dd MMM yyyy', { locale: es }) : ''}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    Marcar como inactivo
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
