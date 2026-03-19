import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Phone, PhoneCall, Clock, Euro, Percent, CheckCircle, Loader2, RefreshCw, ArrowUpDown, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend
} from 'recharts';

type DatePreset = 'today' | '7d' | '30d' | 'custom';

const presetLabel: Record<DatePreset, string> = {
  today: 'Hoy',
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  custom: 'Personalizado',
};

function fmtDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtDurationMmSs(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function rateBadge(rate: number) {
  const pct = Math.round(rate);
  if (pct >= 60) return <Badge className="bg-[hsl(90,52%,51%)]/15 text-[hsl(90,52%,40%)] border-[hsl(90,52%,51%)]/30 hover:bg-[hsl(90,52%,51%)]/20">{pct}%</Badge>;
  if (pct >= 30) return <Badge className="bg-[hsl(38,92%,50%)]/15 text-[hsl(38,92%,40%)] border-[hsl(38,92%,50%)]/30 hover:bg-[hsl(38,92%,50%)]/20">{pct}%</Badge>;
  return <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20">{pct}%</Badge>;
}

const Calls = () => {
  const [preset, setPreset] = useState<DatePreset>('7d');
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [hourlyStats, setHourlyStats] = useState<any[]>([]);
  const [agentStats, setAgentStats] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [totalCallsCount, setTotalCallsCount] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [agentSort, setAgentSort] = useState<{ col: string; asc: boolean }>({ col: 'valid_calls', asc: false });
  const [page, setPage] = useState(0);
  const perPage = 25;

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (preset) {
      case 'today': return { from: startOfDay(now), to: endOfDay(now) };
      case '7d': return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
      case '30d': return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
      case 'custom': return { from: startOfDay(customRange.from), to: endOfDay(customRange.to) };
    }
  }, [preset, customRange]);

  const fmtForApi = (d: Date) => format(d, 'yyyy-MM-dd HH:mm:ss');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const fromStr = dateRange.from.toISOString();
    const toStr = dateRange.to.toISOString();

    const [dailyRes, hourlyRes, agentRes, callsRes, countRes] = await Promise.all([
      supabase.from('calls_daily_stats').select('*').gte('day', fromStr).lte('day', toStr).order('day'),
      supabase.from('calls_hourly_stats').select('*'),
      supabase.from('calls_agent_stats').select('*'),
      supabase.from('calls').select('*')
        .gte('started_at', fromStr).lte('started_at', toStr)
        .order('started_at', { ascending: false })
        .range(page * perPage, (page + 1) * perPage - 1),
      supabase.from('calls').select('id', { count: 'exact', head: true })
        .gte('started_at', fromStr).lte('started_at', toStr),
    ]);

    setDailyStats(dailyRes.data || []);
    setHourlyStats(hourlyRes.data || []);
    setAgentStats(agentRes.data || []);
    setRecentCalls(callsRes.data || []);
    setTotalCallsCount(countRes.count || 0);
    setLoading(false);
  }, [dateRange, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-zadarma-calls', {
        body: { start: fmtForApi(dateRange.from), end: fmtForApi(dateRange.to) },
      });
      if (error) throw error;
      toast({ title: 'Sincronización completada', description: `${data?.synced || 0} llamadas sincronizadas.` });
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Error de sincronización', description: err.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  // Aggregate KPIs from daily stats
  const kpis = useMemo(() => {
    const totals = dailyStats.reduce(
      (acc, d) => ({
        total: acc.total + (Number(d.total_calls) || 0),
        answered: acc.answered + (Number(d.answered) || 0),
        valid: acc.valid + (Number(d.valid_calls) || 0),
        minutes: acc.minutes + (Number(d.total_minutes) || 0),
        cost: acc.cost + (Number(d.total_cost) || 0),
      }),
      { total: 0, answered: 0, valid: 0, minutes: 0, cost: 0 }
    );
    return {
      ...totals,
      answerRate: totals.total > 0 ? (totals.answered / totals.total) * 100 : 0,
      validRate: totals.total > 0 ? (totals.valid / totals.total) * 100 : 0,
    };
  }, [dailyStats]);

  // Filtered recent calls
  const filteredCalls = useMemo(() => {
    return recentCalls.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (directionFilter !== 'all' && c.direction !== directionFilter) return false;
      return true;
    });
  }, [recentCalls, statusFilter, directionFilter]);

  // Sorted agents
  const sortedAgents = useMemo(() => {
    return [...agentStats].sort((a, b) => {
      const av = Number(a[agentSort.col]) || 0;
      const bv = Number(b[agentSort.col]) || 0;
      return agentSort.asc ? av - bv : bv - av;
    });
  }, [agentStats, agentSort]);

  const toggleAgentSort = (col: string) => {
    setAgentSort(prev => prev.col === col ? { col, asc: !prev.asc } : { col, asc: false });
  };

  const totalPages = Math.ceil(totalCallsCount / perPage);

  const kpiCards = [
    { label: 'Total Llamadas', value: String(kpis.total), icon: Phone },
    { label: 'Llamadas Válidas', value: String(kpis.valid), icon: CheckCircle, accent: true },
    { label: 'Tasa de Contestación', value: `${Math.round(kpis.answerRate)}%`, icon: Percent },
    { label: 'Tasa de Validez', value: `${Math.round(kpis.validRate)}%`, icon: Percent },
    { label: 'Minutos Hablados', value: fmtDuration(kpis.minutes * 60), icon: Clock },
    { label: 'Coste Total', value: `€${kpis.cost.toFixed(2)}`, icon: Euro },
  ];

  // Chart data
  const chartDaily = dailyStats.map(d => ({
    date: d.day ? format(new Date(d.day), 'dd MMM', { locale: es }) : '',
    Total: Number(d.total_calls) || 0,
    Contestadas: Number(d.answered) || 0,
    Válidas: Number(d.valid_calls) || 0,
  }));

  const chartHourly = (hourlyStats || [])
    .sort((a: any, b: any) => Number(a.hour) - Number(b.hour))
    .map((h: any) => ({
      hour: `${String(Number(h.hour)).padStart(2, '0')}:00`,
      Llamadas: Number(h.total_calls) || 0,
    }));

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="rounded-2xl gradient-hero p-8 mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl mb-8" />
        <Skeleton className="h-64 rounded-2xl" />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Hero */}
      <div className="rounded-2xl gradient-hero p-8 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading lime-dot">Llamadas</h1>
          <p className="text-body mt-1">Seguimiento y análisis de llamadas de tu equipo.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Presets */}
          <div className="flex gap-1 bg-card rounded-xl border border-border p-1">
            {(['today', '7d', '30d', 'custom'] as DatePreset[]).map(p => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  preset === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {presetLabel[p]}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  {format(customRange.from, 'dd MMM', { locale: es })} – {format(customRange.to, 'dd MMM', { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: customRange.from, to: customRange.to }}
                  onSelect={(range: any) => {
                    if (range?.from && range?.to) setCustomRange({ from: range.from, to: range.to });
                  }}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}
          <Button onClick={handleSync} disabled={syncing} className="gap-2">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sincronizar llamadas
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {kpiCards.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn(
              'gradient-border-top rounded-2xl bg-card border border-border p-5 shadow-card card-hover',
              kpi.accent && 'ring-1 ring-primary/20'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={cn('rounded-xl p-2', kpi.accent ? 'bg-primary/15' : 'bg-primary/10')}>
                <kpi.icon className={cn('h-5 w-5', kpi.accent ? 'text-primary' : 'text-primary')} />
              </div>
            </div>
            <p className="text-2xl font-bold text-heading">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily evolution */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
          <h3 className="text-lg font-bold text-heading lime-dot mb-4">Evolución diaria</h3>
          {chartDaily.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sin datos para este período</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(216 29% 92%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(222 12% 55%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(222 12% 55%)" />
                <RTooltip />
                <Legend />
                <Line type="monotone" dataKey="Total" stroke="hsl(222 12% 55%)" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Contestadas" stroke="hsl(217 91% 60%)" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Válidas" stroke="hsl(90 52% 51%)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Hourly */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
          <h3 className="text-lg font-bold text-heading lime-dot mb-4">Llamadas por hora</h3>
          {chartHourly.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartHourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(216 29% 92%)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(222 12% 55%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(222 12% 55%)" />
                <RTooltip />
                <Bar dataKey="Llamadas" fill="hsl(90 52% 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="rounded-2xl bg-card border border-border p-6 shadow-card mb-8">
        <h3 className="text-lg font-bold text-heading lime-dot mb-4">Rendimiento por Agente</h3>
        {sortedAgents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay datos de agentes</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    { key: 'agent', label: 'Agente' },
                    { key: 'total_calls', label: 'Total' },
                    { key: 'answered', label: 'Contestadas' },
                    { key: 'missed', label: 'Perdidas' },
                    { key: 'valid_calls', label: 'Válidas' },
                    { key: 'total_minutes', label: 'Minutos' },
                    { key: 'avg_duration_seconds', label: 'Duración Media' },
                    { key: 'valid_call_rate', label: 'Tasa Validez' },
                    { key: 'answer_rate', label: 'Tasa Contestación' },
                    { key: 'total_cost', label: 'Coste' },
                  ].map(col => (
                    <TableHead key={col.key}>
                      <button
                        onClick={() => toggleAgentSort(col.key)}
                        className="flex items-center gap-1 text-xs font-semibold hover:text-foreground"
                      >
                        {col.label}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAgents.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-heading">{a.agent || '—'}</TableCell>
                    <TableCell>{a.total_calls}</TableCell>
                    <TableCell>{a.answered}</TableCell>
                    <TableCell>{a.missed}</TableCell>
                    <TableCell className="font-semibold text-heading">{a.valid_calls}</TableCell>
                    <TableCell>{Number(a.total_minutes || 0).toFixed(0)}</TableCell>
                    <TableCell>{fmtDurationMmSs(Math.round(Number(a.avg_duration_seconds) || 0))}</TableCell>
                    <TableCell>{rateBadge(Number(a.valid_call_rate) || 0)}</TableCell>
                    <TableCell>{rateBadge(Number(a.answer_rate) || 0)}</TableCell>
                    <TableCell>€{Number(a.total_cost || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Recent Calls Table */}
      <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-lg font-bold text-heading lime-dot">Llamadas Recientes</h3>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="answered">Contestada</SelectItem>
                <SelectItem value="no answer">Sin respuesta</SelectItem>
                <SelectItem value="busy">Ocupado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Dirección" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="incoming">Entrante</SelectItem>
                <SelectItem value="outgoing">Saliente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredCalls.length === 0 ? (
          <div className="text-center py-16">
            <PhoneCall className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No hay llamadas en este período.</p>
            <p className="text-sm text-muted-foreground mt-1">Pulsa <strong>Sincronizar</strong> para cargar datos.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Fecha/Hora</TableHead>
                    <TableHead className="text-xs">Origen</TableHead>
                    <TableHead className="text-xs">Destino</TableHead>
                    <TableHead className="text-xs">Dirección</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs">Duración</TableHead>
                    <TableHead className="text-xs">Coste</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalls.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {c.started_at ? format(new Date(c.started_at), 'dd MMM yyyy HH:mm', { locale: es }) : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{c.caller || '—'}</TableCell>
                      <TableCell className="text-xs">{c.destination || '—'}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          'text-[10px]',
                          c.direction === 'incoming'
                            ? 'bg-[hsl(217,91%,60%)]/15 text-[hsl(217,91%,50%)] border-[hsl(217,91%,60%)]/30'
                            : 'bg-[hsl(90,52%,51%)]/15 text-[hsl(90,52%,40%)] border-[hsl(90,52%,51%)]/30'
                        )}>
                          {c.direction === 'incoming' ? 'Entrante' : 'Saliente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          'text-[10px]',
                          c.status === 'answered'
                            ? 'bg-[hsl(90,52%,51%)]/15 text-[hsl(90,52%,40%)] border-[hsl(90,52%,51%)]/30'
                            : c.status === 'busy'
                            ? 'bg-[hsl(38,92%,50%)]/15 text-[hsl(38,92%,40%)] border-[hsl(38,92%,50%)]/30'
                            : 'bg-destructive/15 text-destructive border-destructive/30'
                        )}>
                          {c.status === 'answered' ? 'Contestada' : c.status === 'busy' ? 'Ocupado' : 'Sin respuesta'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{fmtDurationMmSs(Number(c.duration) || 0)}</TableCell>
                      <TableCell className="text-xs">€{Number(c.cost || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Página {page + 1} de {totalPages} ({totalCallsCount} llamadas)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default Calls;
