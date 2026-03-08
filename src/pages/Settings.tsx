import { motion } from 'framer-motion';
import { Settings as SettingsIcon, User, Bell, Shield, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';

const SettingsPage = () => {
  const { profile, user } = useAuth();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading lime-dot">Configuración</h1>
        <p className="text-body text-sm mt-1">Administra tu perfil y preferencias</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-xl bg-primary/10 p-2">
              <User className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-bold text-heading">Perfil</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-heading">Nombre completo</Label>
              <Input defaultValue={profile?.full_name || ''} className="rounded-[10px] bg-muted border-border mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-heading">Email</Label>
              <Input value={user?.email || ''} disabled className="rounded-[10px] bg-muted border-border mt-1 opacity-60" />
            </div>
            <Button className="rounded-xl bg-primary text-primary-foreground font-semibold">
              Guardar cambios
            </Button>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-xl bg-secondary/10 p-2">
              <Bell className="h-5 w-5 text-secondary" />
            </div>
            <h3 className="font-bold text-heading">Notificaciones</h3>
          </div>
          <div className="space-y-4">
            {[
              'Nuevos deals asignados',
              'Campañas completadas',
              'Artículos publicados',
            ].map(item => (
              <div key={item} className="flex items-center justify-between">
                <span className="text-sm text-body">{item}</span>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </div>

        {/* Integrations */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-xl bg-warning/10 p-2">
              <Shield className="h-5 w-5 text-warning" />
            </div>
            <h3 className="font-bold text-heading">Integraciones</h3>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Google Maps API', key: 'VITE_GOOGLE_MAPS_API_KEY', connected: false },
              { name: 'n8n Webhooks', key: 'VITE_N8N_*_WEBHOOK', connected: false },
            ].map(item => (
              <div key={item.name} className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <p className="text-sm font-semibold text-heading">{item.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.key}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${item.connected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {item.connected ? 'Conectado' : 'No configurado'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SettingsPage;
