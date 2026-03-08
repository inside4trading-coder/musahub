import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Plus, Send, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const mockCampaigns = [
  { name: 'Black Friday 2024', subject: 'Ofertas exclusivas de automatización', recipients: 45, date: '2024-11-25', status: 'Enviada' },
  { name: 'Follow-up Prospectos Marzo', subject: '¿Listo para automatizar tu negocio?', recipients: 32, date: '2024-03-15', status: 'Enviada' },
  { name: 'Lanzamiento Chatbot WhatsApp', subject: 'Nuevo servicio disponible', recipients: 78, date: '2024-04-01', status: 'Programada' },
  { name: 'Newsletter Abril', subject: 'Las últimas novedades de Musa', recipients: 120, date: '', status: 'Borrador' },
];

const statusColors: Record<string, string> = {
  'Enviada': 'bg-primary/10 text-primary',
  'Programada': 'bg-secondary/10 text-secondary',
  'Error': 'bg-error/10 text-error',
  'Borrador': 'bg-muted text-muted-foreground',
};

const EmailCampaigns = () => {
  const [step, setStep] = useState(1);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading lime-dot">Email Campaigns</h1>
        <p className="text-body text-sm mt-1">Crea y gestiona campañas de email marketing</p>
      </div>

      <Tabs defaultValue="new" className="w-full">
        <TabsList className="bg-muted rounded-xl p-1 h-auto mb-6">
          <TabsTrigger value="new" className="rounded-lg px-6 py-2.5 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-heading data-[state=active]:shadow-card">
            <Plus className="h-4 w-4 mr-2" /> Nueva Campaña
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg px-6 py-2.5 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-heading data-[state=active]:shadow-card">
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                  step >= s ? "gradient-accent text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {s}
                </div>
                <span className={cn("text-sm font-medium", step >= s ? "text-heading" : "text-muted-foreground")}>
                  {s === 1 ? 'Configuración' : s === 2 ? 'Contenido' : 'Destinatarios'}
                </span>
                {s < 3 && <div className={cn("h-0.5 w-8", step > s ? "gradient-accent" : "bg-border")} />}
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
            {step === 1 && (
              <div className="max-w-lg space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-heading">Nombre de campaña *</Label>
                  <Input className="rounded-[10px] bg-muted border-border mt-1" placeholder="Black Friday 2024" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-heading">Asunto *</Label>
                  <Input className="rounded-[10px] bg-muted border-border mt-1" placeholder="Tu asunto de email" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-heading">Nombre del remitente</Label>
                  <Input className="rounded-[10px] bg-muted border-border mt-1" defaultValue="Musa Agency" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-heading">Reply-to email</Label>
                  <Input className="rounded-[10px] bg-muted border-border mt-1" placeholder="hello@musa.com" />
                </div>
                <Button onClick={() => setStep(2)} className="rounded-xl bg-primary text-primary-foreground font-semibold">
                  Siguiente →
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-heading">Contenido del email</Label>
                  <div className="mt-2 rounded-xl border border-border min-h-[300px] p-4 bg-muted/30">
                    <p className="text-sm text-muted-foreground">Editor de texto enriquecido (Tiptap)</p>
                    <p className="text-xs text-muted-foreground mt-2">Instala @tiptap/react para activar el editor completo</p>
                    <Textarea className="mt-4 rounded-[10px] bg-muted border-border" rows={10} placeholder="Escribe el contenido de tu email aquí..." />
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <p className="text-xs text-muted-foreground">Variables disponibles:</p>
                  {['{{business_name}}', '{{contact_name}}', '{{city}}'].map(v => (
                    <button key={v} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">{v}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl">← Anterior</Button>
                  <Button onClick={() => setStep(3)} className="rounded-xl bg-primary text-primary-foreground font-semibold">Siguiente →</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                  <Mail className="h-10 w-10 text-primary/20 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-heading">Selecciona destinatarios</p>
                  <p className="text-xs text-muted-foreground mt-1">Sube un CSV, selecciona desde CRM o desde Prospectos</p>
                  <div className="flex gap-2 justify-center mt-4">
                    <Button variant="outline" className="rounded-xl text-xs">📁 Subir CSV</Button>
                    <Button variant="outline" className="rounded-xl text-xs">💼 Desde CRM</Button>
                    <Button variant="outline" className="rounded-xl text-xs">🗺️ Desde Prospectos</Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl">← Anterior</Button>
                  <Button className="rounded-xl bg-primary text-primary-foreground font-semibold">
                    <Send className="h-4 w-4 mr-2" /> Enviar ahora
                  </Button>
                  <Button variant="outline" className="rounded-xl">
                    <Calendar className="h-4 w-4 mr-2" /> Programar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-heading">Nombre</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-heading">Asunto</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-heading">Destinatarios</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-heading">Fecha</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-heading">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockCampaigns.map((c, i) => (
                  <tr key={i} className="hover:bg-lime-light/30 transition-colors cursor-pointer">
                    <td className="px-5 py-3 text-sm font-semibold text-heading">{c.name}</td>
                    <td className="px-5 py-3 text-sm text-body">{c.subject}</td>
                    <td className="px-5 py-3 text-sm text-body">{c.recipients}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{c.date || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-xs font-semibold px-3 py-1 rounded-full", statusColors[c.status])}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default EmailCampaigns;
