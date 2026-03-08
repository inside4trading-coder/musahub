import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SettingsPage = () => {
  const { profile, user, signOut } = useAuth();
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    const trimmed = fullName.trim();
    if (!trimmed) { toast.error('El nombre no puede estar vacío'); return; }
    if (trimmed.length > 100) { toast.error('El nombre es demasiado largo'); return; }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmed, avatar_url: avatarUrl.trim() || null })
      .eq('id', user.id);

    if (error) toast.error('Error al guardar');
    else toast.success('Perfil actualizado');
    setSaving(false);
  };

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
              <Input value={fullName} onChange={e => setFullName(e.target.value)} maxLength={100} className="rounded-[10px] bg-muted border-border mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-heading">Email</Label>
              <Input value={user?.email || ''} disabled className="rounded-[10px] bg-muted border-border mt-1 opacity-60" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-heading">Avatar URL</Label>
              <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} maxLength={500} placeholder="https://..." className="rounded-[10px] bg-muted border-border mt-1" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-primary text-primary-foreground font-semibold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Guardar cambios
              </Button>
              <Button onClick={signOut} variant="outline" className="rounded-xl text-destructive hover:text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
              </Button>
            </div>
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
            {['Nuevos deals asignados', 'Campañas completadas', 'Artículos publicados'].map(item => (
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
              { name: 'Google Maps API', key: 'VITE_GOOGLE_MAPS_API_KEY', connected: !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY },
              { name: 'n8n Proposal Webhook', key: 'VITE_N8N_PROPOSAL_WEBHOOK', connected: !!import.meta.env.VITE_N8N_PROPOSAL_WEBHOOK },
              { name: 'n8n Copy Webhook', key: 'VITE_N8N_COPY_WEBHOOK', connected: !!import.meta.env.VITE_N8N_COPY_WEBHOOK },
              { name: 'n8n Email Webhook', key: 'VITE_N8N_EMAIL_CAMPAIGN_WEBHOOK', connected: !!import.meta.env.VITE_N8N_EMAIL_CAMPAIGN_WEBHOOK },
            ].map(item => (
              <div key={item.name} className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <p className="text-sm font-semibold text-heading">{item.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.key}</p>
                </div>
                <span className={cn("text-xs font-semibold px-3 py-1 rounded-full", item.connected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
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

// need cn import
import { cn } from '@/lib/utils';

export default SettingsPage;
