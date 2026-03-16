import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Euro, Users, Mail, BookOpen, ArrowRight, Loader2, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';

interface KpiData {
  dealCount: number;
  pipelineValue: number;
  prospectsThisMonth: number;
  campaignsThisMonth: number;
  wonDealsValue: number;
}

interface ActivityItem {
  text: string;
  time: string;
  created_at: string;
  type: 'pipeline' | 'call';
}

interface DailyActivityData {
  date: string;
  label: string;
  pipeline: number;
  calls: number;
  totalCalls: number;
  answeredCalls: number;
  emails: number;
}

const DAILY_GOALS = {
  totalCalls: 60,
  answeredCalls: 30,
  calls: 10, // valid calls
  emails: 20,
};

const chartConfig: ChartConfig = {
  pipeline: {
    label: 'Lead → Contactado',
    color: 'hsl(var(--primary))',
  },
  calls: {
    label: 'Llamadas Válidas',
    color: 'hsl(142, 71%, 45%)',
  },
  totalCalls: {
    label: 'Llamadas Totales',
    color: 'hsl(220, 70%, 55%)',
  },
  answeredCalls: {
    label: 'Llamadas Conectadas',
    color: 'hsl(38, 92%, 50%)',
  },
  emails: {
    label: 'Emails Enviados',
    color: 'hsl(280, 65%, 55%)',
  },
};

const parseTimestamp = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const Dashboard = () => {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const monthStart = startOfMonth.toISOString();

        const fourteenDaysAgo = subDays(new Date(), 13);
        fourteenDaysAgo.setHours(0, 0, 0, 0);
        const chartStart = fourteenDaysAgo.toISOString();

        const [dealsRes, prospectsRes, campaignsRes, stageChangesRes, validCallsRes, stageChangesChartRes, validCallsChartRes] = await Promise.all([
          supabase.from('deals').select('id, deal_value, company_name, created_at, stage'),
          supabase.from('prospects').select('id, business_name, created_at').gte('created_at', monthStart),
          supabase.from('email_campaigns').select('id, campaign_name, created_at, status').gte('created_at', monthStart),
          supabase.from('deal_activities').select('id, deal_id, note, created_at, activity_type').eq('activity_type', 'stage_change').order('created_at', { ascending: false }).limit(15),
          supabase.from('calls').select('id, caller, destination, duration, started_at, agent_name, status').eq('status', 'answered').gte('duration', 60).order('started_at', { ascending: false }).limit(15),
          supabase.from('deal_activities').select('created_at').eq('activity_type', 'stage_change').like('note', '%→ Contactado%').gte('created_at', chartStart),
          supabase.from('calls').select('started_at').eq('status', 'answered').gte('duration', 60).gte('started_at', chartStart),
        ]);

        const deals = dealsRes.data || [];
        const activeDealStages = ['Lead', 'Contactado', 'Reunión Agendada', 'Propuesta Enviada', 'Negociación'];
        const activeDeals = deals.filter(d => activeDealStages.includes(d.stage));
        const wonDeals = deals.filter(d => d.stage === 'Cerrado Ganado');

        setKpis({
          dealCount: activeDeals.length,
          pipelineValue: activeDeals.reduce((s, d) => s + Number(d.deal_value), 0),
          prospectsThisMonth: (prospectsRes.data || []).length,
          campaignsThisMonth: (campaignsRes.data || []).length,
          wonDealsValue: wonDeals.reduce((s, d) => s + Number(d.deal_value), 0),
        });

        const dealMap = new Map(deals.map(d => [d.id, d.company_name]));
        const items: ActivityItem[] = [];

        (stageChangesRes.data || []).forEach(sc => {
          const activityDate = parseTimestamp(sc.created_at);
          if (!activityDate) return;

          const dealName = dealMap.get(sc.deal_id) || 'Deal';
          items.push({
            text: `🔄 "${dealName}" — ${sc.note}`,
            created_at: sc.created_at,
            time: formatDistanceToNow(activityDate, { addSuffix: true, locale: es }),
            type: 'pipeline',
          });
        });

        (validCallsRes.data || []).forEach(call => {
          const activityDate = parseTimestamp(call.started_at);
          if (!activityDate) return;

          const mins = Math.floor((call.duration || 0) / 60);
          const secs = (call.duration || 0) % 60;
          const durStr = `${mins}:${String(secs).padStart(2, '0')}`;
          items.push({
            text: `📞 Llamada válida: ${call.destination || call.caller || 'Desconocido'} — ${durStr} min`,
            created_at: call.started_at,
            time: formatDistanceToNow(activityDate, { addSuffix: true, locale: es }),
            type: 'call',
          });
        });

        items.sort((a, b) => (parseTimestamp(b.created_at)?.getTime() || 0) - (parseTimestamp(a.created_at)?.getTime() || 0));
        setActivity(items.slice(0, 20));

        const dailyMap = new Map<string, { pipeline: number; calls: number }>();
        for (let i = 0; i < 14; i++) {
          const day = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd');
          dailyMap.set(day, { pipeline: 0, calls: 0 });
        }

        (stageChangesChartRes.data || []).forEach(sc => {
          const activityDate = parseTimestamp(sc.created_at);
          if (!activityDate) return;

          const day = format(activityDate, 'yyyy-MM-dd');
          const entry = dailyMap.get(day);
          if (entry) entry.pipeline++;
        });

        (validCallsChartRes.data || []).forEach(call => {
          const activityDate = parseTimestamp(call.started_at);
          if (!activityDate) return;

          const day = format(activityDate, 'yyyy-MM-dd');
          const entry = dailyMap.get(day);
          if (entry) entry.calls++;
        });

        const chartData: DailyActivityData[] = [];
        dailyMap.forEach((val, key) => {
          const labelDate = parseTimestamp(`${key}T00:00:00`);

          chartData.push({
            date: key,
            label: labelDate ? format(labelDate, 'dd MMM', { locale: es }) : key,
            pipeline: val.pipeline,
            calls: val.calls,
          });
        });

        setDailyStats(chartData);
      } catch (error) {
        console.error('Dashboard activity error:', error);
        setKpis({
          dealCount: 0,
          pipelineValue: 0,
          prospectsThisMonth: 0,
          campaignsThisMonth: 0,
          wonDealsValue: 0,
        });
        setActivity([]);
        setDailyStats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const kpiCards = kpis ? [
    { label: 'Deals en Pipeline', value: String(kpis.dealCount), icon: Briefcase },
    { label: 'Valor Pipeline', value: `€${kpis.pipelineValue.toLocaleString()}`, icon: Euro },
    { label: 'Negocios Ganados', value: `€${kpis.wonDealsValue.toLocaleString()}`, icon: Trophy },
    { label: 'Prospectos este mes', value: String(kpis.prospectsThisMonth), icon: Users },
    { label: 'Campañas este mes', value: String(kpis.campaignsThisMonth), icon: Mail },
  ] : [];

  const quickActions = [
    { label: 'Nuevo Deal', icon: Briefcase, path: '/crm', color: 'bg-primary/10 text-primary' },
    { label: 'Nueva Campaña', icon: Mail, path: '/email-campaigns', color: 'bg-secondary/10 text-secondary' },
    { label: 'Nuevo Artículo', icon: BookOpen, path: '/knowledge', color: 'bg-warning/10 text-warning' },
  ];

  // Activity summary counts
  const pipelineCount = activity.filter(a => a.type === 'pipeline').length;
  const callCount = activity.filter(a => a.type === 'call').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Hero */}
      <div className="rounded-2xl gradient-hero p-8 mb-6">
        <h1 className="text-2xl font-bold text-heading lime-dot">Dashboard</h1>
        <p className="text-body mt-1">Bienvenido de vuelta. Aquí tienes un resumen de tu agencia.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {kpiCards.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="gradient-border-top rounded-2xl bg-card border border-border p-5 shadow-card card-hover"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-xl bg-primary/10 p-2">
                <kpi.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-heading">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Activity Chart */}
      <div className="rounded-2xl bg-card border border-border p-6 shadow-card mb-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-heading lime-dot">Actividad — Últimos 14 días</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-primary" />
              <span className="text-muted-foreground">Lead → Contactado ({pipelineCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />
              <span className="text-muted-foreground">Llamadas Válidas ({callCount})</span>
            </div>
          </div>
        </div>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <BarChart data={dailyStats} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" width={30} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="pipeline" fill="var(--color-pipeline)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="calls" fill="var(--color-calls)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed — only pipeline + calls */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-6 shadow-card">
          <h3 className="text-lg font-bold text-heading lime-dot mb-4">Actividad Reciente</h3>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No hay actividad reciente</p>
          ) : (
            <div className="space-y-2">
              {activity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted transition-colors">
                  <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", {
                    'bg-primary': item.type === 'pipeline',
                    'bg-emerald-500': item.type === 'call',
                  })} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-heading font-medium truncate">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0", {
                    'bg-primary/10 text-primary': item.type === 'pipeline',
                    'bg-emerald-500/10 text-emerald-600': item.type === 'call',
                  })}>
                    {item.type === 'pipeline' ? 'Pipeline' : 'Llamada'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
          <h3 className="text-lg font-bold text-heading lime-dot mb-4">Acciones Rápidas</h3>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.path}
                className="flex items-center gap-3 rounded-xl p-4 border border-border hover:border-primary/30 hover:shadow-card-hover transition-all group"
              >
                <div className={`rounded-xl p-2.5 ${action.color}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-heading flex-1">{action.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
