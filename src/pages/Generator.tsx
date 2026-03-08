import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Copy, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const services = [
  'Chatbot WhatsApp', 'Automatización de ventas', 'Lead generation',
  'Integración CRM', 'Reportes automáticos', 'Web scraping', 'Email marketing',
];

const tones = ['Profesional', 'Cercano', 'Técnico'];
const channels = ['WhatsApp', 'Email', 'LinkedIn', 'Instagram DM'];
const copyTones = ['Directo', 'Consultivo', 'Casual'];

const Generator = () => {
  const { user } = useAuth();

  // Proposal state
  const [proposalForm, setProposalForm] = useState({
    company: '', businessType: '', city: '', painPoint: '',
  });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [tone, setTone] = useState('Profesional');
  const [proposalResult, setProposalResult] = useState('');
  const [proposalLoading, setProposalLoading] = useState(false);

  // Copy state
  const [copyForm, setCopyForm] = useState({
    businessType: '', city: '', painPoint: '',
  });
  const [channel, setChannel] = useState('WhatsApp');
  const [copyTone, setCopyTone] = useState('Directo');
  const [copyResults, setCopyResults] = useState<string[]>([]);
  const [copyLoading, setCopyLoading] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const toggleService = (s: string) => {
    setSelectedServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleGenerateProposal = async () => {
    const webhookUrl = import.meta.env.VITE_N8N_PROPOSAL_WEBHOOK;
    if (!webhookUrl) {
      toast.error('Configura VITE_N8N_PROPOSAL_WEBHOOK para generar propuestas');
      return;
    }
    setProposalLoading(true);
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: proposalForm.company,
          business_type: proposalForm.businessType,
          city: proposalForm.city,
          pain_point: proposalForm.painPoint,
          services: selectedServices,
          tone,
        }),
      });
      const data = await res.json();
      setProposalResult(typeof data === 'string' ? data : data.proposal || data.text || JSON.stringify(data, null, 2));
      toast.success('Propuesta generada');
    } catch {
      toast.error('Error al generar propuesta');
    }
    setProposalLoading(false);
  };

  const handleGenerateCopies = async () => {
    const webhookUrl = import.meta.env.VITE_N8N_COPY_WEBHOOK;
    if (!webhookUrl) {
      toast.error('Configura VITE_N8N_COPY_WEBHOOK para generar copies');
      return;
    }
    setCopyLoading(true);
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_type: copyForm.businessType,
          city: copyForm.city,
          pain_point: copyForm.painPoint,
          channel,
          tone: copyTone,
        }),
      });
      const data = await res.json();
      const copies = Array.isArray(data) ? data.map((d: any) => d.text || d.copy || String(d))
        : data.copies ? data.copies
        : [typeof data === 'string' ? data : data.text || JSON.stringify(data)];
      setCopyResults(copies.slice(0, 3));
      toast.success('Copies generados');
    } catch {
      toast.error('Error al generar copies');
    }
    setCopyLoading(false);
  };

  const handleSaveCopy = async (text: string, index: number) => {
    if (!user) return;
    setSavingIndex(index);
    const { error } = await supabase.from('saved_copies').insert({
      copy_text: text,
      channel,
      business_type: copyForm.businessType || null,
      city: copyForm.city || null,
      tone: copyTone,
      created_by: user.id,
    });
    if (error) toast.error('Error al guardar');
    else toast.success('Copy guardado en biblioteca');
    setSavingIndex(null);
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
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
            <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-6 shadow-card space-y-4">
              <div>
                <Label className="text-xs font-semibold text-heading">Empresa / Cliente *</Label>
                <Input value={proposalForm.company} onChange={e => setProposalForm(p => ({ ...p, company: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="Nombre de la empresa" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-heading">Tipo de negocio</Label>
                <Input value={proposalForm.businessType} onChange={e => setProposalForm(p => ({ ...p, businessType: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="Restaurante, clínica, etc." />
              </div>
              <div>
                <Label className="text-xs font-semibold text-heading">Ciudad</Label>
                <Input value={proposalForm.city} onChange={e => setProposalForm(p => ({ ...p, city: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="Madrid" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-heading">Problema principal</Label>
                <Textarea value={proposalForm.painPoint} onChange={e => setProposalForm(p => ({ ...p, painPoint: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="Describe el pain point del cliente..." rows={3} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-heading">Servicios</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {services.map(s => (
                    <button key={s} onClick={() => toggleService(s)} className={cn(
                      "text-xs px-3 py-1.5 rounded-full border font-medium transition-all",
                      selectedServices.includes(s) ? "bg-primary text-primary-foreground border-primary" : "border-border text-body hover:border-primary/30"
                    )}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-heading">Tono</Label>
                <div className="flex gap-2 mt-2">
                  {tones.map(t => (
                    <button key={t} onClick={() => setTone(t)} className={cn(
                      "text-xs px-4 py-2 rounded-full border font-semibold transition-all",
                      tone === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-body hover:border-primary/30"
                    )}>{t}</button>
                  ))}
                </div>
              </div>
              <Button onClick={handleGenerateProposal} disabled={!proposalForm.company || proposalLoading} className="w-full rounded-xl bg-primary text-primary-foreground font-semibold h-11">
                {proposalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generar Propuesta
              </Button>
            </div>

            {/* Preview */}
            <div className="lg:col-span-3 rounded-2xl bg-card border border-border p-6 shadow-card">
              <div className="h-1 gradient-accent rounded-full mb-6" />
              {proposalLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Generando propuesta...</p>
                </div>
              ) : proposalResult ? (
                <>
                  <div className="prose prose-sm text-body whitespace-pre-wrap text-sm max-h-[500px] overflow-y-auto">
                    {proposalResult}
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button onClick={() => handleCopyToClipboard(proposalResult)} variant="outline" className="rounded-xl text-xs">
                      <Copy className="h-3 w-3 mr-1" /> Copiar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-16">
                  <Sparkles className="h-12 w-12 text-primary/20 mx-auto mb-4" />
                  <p className="text-heading font-semibold">Vista previa de propuesta</p>
                  <p className="text-sm text-muted-foreground mt-1">Completa el formulario y genera tu propuesta con IA</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Copies Tab */}
        <TabsContent value="copies">
          <div className="max-w-2xl mx-auto rounded-2xl bg-card border border-border p-6 shadow-card space-y-4">
            <div>
              <Label className="text-xs font-semibold text-heading">Tipo de negocio</Label>
              <Input value={copyForm.businessType} onChange={e => setCopyForm(p => ({ ...p, businessType: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="Restaurante, clínica, etc." />
            </div>
            <div>
              <Label className="text-xs font-semibold text-heading">Ciudad</Label>
              <Input value={copyForm.city} onChange={e => setCopyForm(p => ({ ...p, city: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="Madrid" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-heading">Pain point</Label>
              <Textarea value={copyForm.painPoint} onChange={e => setCopyForm(p => ({ ...p, painPoint: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" rows={3} placeholder="Describe el problema..." />
            </div>
            <div>
              <Label className="text-xs font-semibold text-heading">Canal</Label>
              <div className="flex gap-2 mt-2">
                {channels.map(c => (
                  <button key={c} onClick={() => setChannel(c)} className={cn(
                    "text-xs px-4 py-2 rounded-full border font-semibold transition-all",
                    channel === c ? "bg-secondary text-secondary-foreground border-secondary" : "border-border text-body"
                  )}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-heading">Tono</Label>
              <div className="flex gap-2 mt-2">
                {copyTones.map(t => (
                  <button key={t} onClick={() => setCopyTone(t)} className={cn(
                    "text-xs px-4 py-2 rounded-full border font-semibold transition-all",
                    copyTone === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-body"
                  )}>{t}</button>
                ))}
              </div>
            </div>
            <Button onClick={handleGenerateCopies} disabled={copyLoading} className="w-full rounded-xl bg-primary text-primary-foreground font-semibold h-11">
              {copyLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generar Copies
            </Button>

            {/* Generated copies */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {copyResults.length > 0 ? copyResults.map((text, i) => (
                <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                  <Textarea
                    value={text}
                    onChange={e => setCopyResults(prev => prev.map((t, j) => j === i ? e.target.value : t))}
                    className="rounded-[10px] bg-muted border-border text-sm"
                    rows={5}
                  />
                  <p className="text-[10px] text-muted-foreground text-right">{text.length} caracteres</p>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleCopyToClipboard(text)} className="rounded-lg text-xs flex-1">
                      <Copy className="h-3 w-3 mr-1" /> Copiar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleSaveCopy(text, i)} disabled={savingIndex === i} className="rounded-lg text-xs flex-1">
                      {savingIndex === i ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                      Guardar
                    </Button>
                  </div>
                </div>
              )) : [1, 2, 3].map(i => (
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
