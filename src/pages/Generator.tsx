import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Copy, Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const services = [
  'Chatbot WhatsApp', 'Automatización de ventas', 'Lead generation',
  'Integración CRM', 'Reportes automáticos', 'Web scraping', 'Email marketing',
];

const tones = ['Profesional', 'Cercano', 'Técnico'];
const channels = ['WhatsApp', 'Email', 'LinkedIn', 'Instagram DM'];
const copyTones = ['Directo', 'Consultivo', 'Casual'];

const Generator = () => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [tone, setTone] = useState('Profesional');
  const [channel, setChannel] = useState('WhatsApp');
  const [copyTone, setCopyTone] = useState('Directo');
  const [proposalLoading, setProposalLoading] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);

  const toggleService = (s: string) => {
    setSelectedServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading lime-dot">Generador</h1>
        <p className="text-body text-sm mt-1">Genera propuestas y copies con IA</p>
      </div>

      <Tabs defaultValue="proposals" className="w-full">
        <TabsList className="bg-muted rounded-xl p-1 h-auto mb-6">
          <TabsTrigger value="proposals" className="rounded-lg px-6 py-2.5 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-heading data-[state=active]:shadow-card">
            Generador de Propuestas
          </TabsTrigger>
          <TabsTrigger value="copies" className="rounded-lg px-6 py-2.5 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-heading data-[state=active]:shadow-card">
            Generador de Copies
          </TabsTrigger>
        </TabsList>

        {/* Proposals Tab */}
        <TabsContent value="proposals">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Form */}
            <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-6 shadow-card space-y-4">
              <div>
                <Label className="text-xs font-semibold text-heading">Empresa / Cliente *</Label>
                <Input className="rounded-[10px] bg-muted border-border mt-1" placeholder="Nombre de la empresa" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-heading">Tipo de negocio</Label>
                <Input className="rounded-[10px] bg-muted border-border mt-1" placeholder="Restaurante, clínica, etc." />
              </div>
              <div>
                <Label className="text-xs font-semibold text-heading">Ciudad</Label>
                <Input className="rounded-[10px] bg-muted border-border mt-1" placeholder="Madrid" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-heading">Problema principal</Label>
                <Textarea className="rounded-[10px] bg-muted border-border mt-1" placeholder="Describe el pain point del cliente..." rows={3} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-heading">Servicios</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {services.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleService(s)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border font-medium transition-all",
                        selectedServices.includes(s)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-body hover:border-primary/30"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-heading">Tono</Label>
                <div className="flex gap-2 mt-2">
                  {tones.map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={cn(
                        "text-xs px-4 py-2 rounded-full border font-semibold transition-all",
                        tone === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-body hover:border-primary/30"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full rounded-xl bg-primary text-primary-foreground font-semibold h-11">
                <Sparkles className="h-4 w-4 mr-2" /> Generar Propuesta
              </Button>
            </div>

            {/* Preview */}
            <div className="lg:col-span-3 rounded-2xl bg-card border border-border p-6 shadow-card">
              <div className="h-1 gradient-accent rounded-full mb-6" />
              <div className="text-center py-16">
                <Sparkles className="h-12 w-12 text-primary/20 mx-auto mb-4" />
                <p className="text-heading font-semibold">Vista previa de propuesta</p>
                <p className="text-sm text-muted-foreground mt-1">Completa el formulario y genera tu propuesta con IA</p>
                <p className="text-xs text-muted-foreground mt-4">Configura VITE_N8N_PROPOSAL_WEBHOOK para activar la generación</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Copies Tab */}
        <TabsContent value="copies">
          <div className="max-w-2xl mx-auto rounded-2xl bg-card border border-border p-6 shadow-card space-y-4">
            <div>
              <Label className="text-xs font-semibold text-heading">Tipo de negocio</Label>
              <Input className="rounded-[10px] bg-muted border-border mt-1" placeholder="Restaurante, clínica, etc." />
            </div>
            <div>
              <Label className="text-xs font-semibold text-heading">Ciudad</Label>
              <Input className="rounded-[10px] bg-muted border-border mt-1" placeholder="Madrid" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-heading">Pain point</Label>
              <Textarea className="rounded-[10px] bg-muted border-border mt-1" rows={3} placeholder="Describe el problema..." />
            </div>
            <div>
              <Label className="text-xs font-semibold text-heading">Canal</Label>
              <div className="flex gap-2 mt-2">
                {channels.map(c => (
                  <button
                    key={c}
                    onClick={() => setChannel(c)}
                    className={cn(
                      "text-xs px-4 py-2 rounded-full border font-semibold transition-all",
                      channel === c ? "bg-secondary text-secondary-foreground border-secondary" : "border-border text-body"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-heading">Tono</Label>
              <div className="flex gap-2 mt-2">
                {copyTones.map(t => (
                  <button
                    key={t}
                    onClick={() => setCopyTone(t)}
                    className={cn(
                      "text-xs px-4 py-2 rounded-full border font-semibold transition-all",
                      copyTone === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-body"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full rounded-xl bg-primary text-primary-foreground font-semibold h-11">
              <Sparkles className="h-4 w-4 mr-2" /> Generar Copies
            </Button>

            {/* Placeholder for generated copies */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl border border-dashed border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground">Copy variación {i}</p>
                  <p className="text-xs text-muted-foreground mt-2">Genera copies para ver resultados aquí</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default Generator;
