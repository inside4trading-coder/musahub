import { motion } from 'framer-motion';
import { Briefcase, Euro, Users, FileText, Mail, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const kpis = [
  { label: 'Deals en Pipeline', value: '24', icon: Briefcase, change: '+3 este mes' },
  { label: 'Valor Pipeline', value: '€142,500', icon: Euro, change: '+€18,000' },
  { label: 'Prospectos este mes', value: '156', icon: Users, change: '+42 vs anterior' },
  { label: 'Propuestas generadas', value: '8', icon: FileText, change: '+3 esta semana' },
  { label: 'Campañas enviadas', value: '5', icon: Mail, change: '2 programadas' },
];

const recentActivity = [
  { text: 'Nuevo deal creado: "Hotel Riverside"', time: 'Hace 2h', type: 'deal' },
  { text: 'Propuesta enviada a Clínica Dental Sol', time: 'Hace 3h', type: 'proposal' },
  { text: 'Campaña "Black Friday" enviada a 45 contactos', time: 'Hace 5h', type: 'campaign' },
  { text: '12 prospectos añadidos desde prospección', time: 'Hace 8h', type: 'prospect' },
  { text: 'Artículo publicado: "Guía de onboarding"', time: 'Ayer', type: 'article' },
];

const quickActions = [
  { label: 'Nuevo Deal', icon: Briefcase, path: '/crm', color: 'bg-primary/10 text-primary' },
  { label: 'Nueva Campaña', icon: Mail, path: '/email-campaigns', color: 'bg-secondary/10 text-secondary' },
  { label: 'Nuevo Artículo', icon: FileText, path: '/knowledge', color: 'bg-warning/10 text-warning' },
];

const Dashboard = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Hero */}
      <div className="rounded-2xl gradient-hero p-8 mb-6">
        <h1 className="text-2xl font-bold text-heading lime-dot">Dashboard</h1>
        <p className="text-body mt-1">Bienvenido de vuelta. Aquí tienes un resumen de tu agencia.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {kpis.map((kpi, i) => (
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
            <p className="text-xs text-primary font-medium mt-2">{kpi.change}</p>
          </motion.div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-6 shadow-card">
          <h3 className="text-lg font-bold text-heading lime-dot mb-4">Actividad Reciente</h3>
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted transition-colors">
                <div className="h-2 w-2 rounded-full gradient-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-heading font-medium truncate">{item.text}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
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
