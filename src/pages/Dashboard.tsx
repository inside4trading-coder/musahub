import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Euro, Users, Mail, BookOpen, ArrowRight, Loader2, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

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
}

const Dashboard = () => {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const monthStart = startOfMonth.toISOString();

      const [dealsRes, prospectsRes, campaignsRes] = await Promise.all([
        supabase.from('deals').select('id, deal_value, company_name, created_at, stage'),
        supabase.from('prospects').select('id, business_name, created_at').gte('created_at', monthStart),
        supabase.from('email_campaigns').select('id, campaign_name, created_at, status').gte('created_at', monthStart),
      ]);

      const deals = dealsRes.data || [];
      const activeDealStages = ['Lead', 'Contactado', 'Propuesta Enviada', 'Negociación'];
      const activeDeals = deals.filter(d => activeDealStages.includes(d.stage));
      const wonDeals = deals.filter(d => d.stage === 'Cerrado Ganado');

      setKpis({
        dealCount: activeDeals.length,
        pipelineValue: activeDeals.reduce((s, d) => s + Number(d.deal_value), 0),
        prospectsThisMonth: (prospectsRes.data || []).length,
        campaignsThisMonth: (campaignsRes.data || []).length,
        wonDealsValue: wonDeals.reduce((s, d) => s + Number(d.deal_value), 0),
      });

      // Build recent activity from all sources
      const items: ActivityItem[] = [];
      deals.slice(0, 5).forEach(d => items.push({
        text: `Deal: "${d.company_name}" — €${Number(d.deal_value).toLocaleString()}`,
        created_at: d.created_at,
        time: formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: es }),
      }));
      (prospectsRes.data || []).slice(0, 3).forEach(p => items.push({
        text: `Prospecto añadido: "${p.business_name}"`,
        created_at: p.created_at,
        time: formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: es }),
      }));
      (campaignsRes.data || []).slice(0, 3).forEach(c => items.push({
        text: `Campaña: "${c.campaign_name}" — ${c.status}`,
        created_at: c.created_at,
        time: formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es }),
      }));

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setActivity(items.slice(0, 10));
      setLoading(false);
    };

    fetchData();
  }, []);

  const kpiCards = kpis ? [
    { label: 'Deals en Pipeline', value: String(kpis.dealCount), icon: Briefcase },
    { label: 'Valor Pipeline', value: `€${kpis.pipelineValue.toLocaleString()}`, icon: Euro },
    { label: 'Prospectos este mes', value: String(kpis.prospectsThisMonth), icon: Users },
    
    { label: 'Campañas este mes', value: String(kpis.campaignsThisMonth), icon: Mail },
  ] : [];

  const quickActions = [
    { label: 'Nuevo Deal', icon: Briefcase, path: '/crm', color: 'bg-primary/10 text-primary' },
    { label: 'Nueva Campaña', icon: Mail, path: '/email-campaigns', color: 'bg-secondary/10 text-secondary' },
    { label: 'Nuevo Artículo', icon: BookOpen, path: '/knowledge', color: 'bg-warning/10 text-warning' },
  ];

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

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-6 shadow-card">
          <h3 className="text-lg font-bold text-heading lime-dot mb-4">Actividad Reciente</h3>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No hay actividad reciente</p>
          ) : (
            <div className="space-y-3">
              {activity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted transition-colors">
                  <div className="h-2 w-2 rounded-full gradient-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-heading font-medium truncate">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
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
