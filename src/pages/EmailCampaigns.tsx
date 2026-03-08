import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mail, Plus, Send, Calendar, Loader2, Copy, Trash2, Clock, Link } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow, addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Campaign = Tables<'email_campaigns'>;
type EmailLog = Tables<'email_logs'>;
type CampaignStep = {
  id?: string;
  campaign_id?: string;
  step_number: number;
  subject: string;
  html_body: string;
  delay_days: number;
  status?: string;
  scheduled_for?: string | null;
  sent_at?: string | null;
};

const statusColors: Record<string, string> = {
  'Enviada': 'bg-primary/10 text-primary',
  'Enviada (con errores)': 'bg-accent/80 text-accent-foreground',
  'Enviando': 'bg-secondary/10 text-secondary',
  'Programada': 'bg-secondary/10 text-secondary',
  'Error': 'bg-destructive/10 text-destructive',
  'Borrador': 'bg-muted text-muted-foreground',
  'Pendiente': 'bg-muted text-muted-foreground',
};

const EmailCampaigns = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignLogs, setCampaignLogs] = useState<EmailLog[]>([]);
  const [campaignSteps, setCampaignSteps] = useState<CampaignStep[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    campaign_name: '',
    from_name: 'Musa Agency',
    reply_to: '',
    recipients_text: '',
  });

  // Multi-step email steps
  const [emailSteps, setEmailSteps] = useState<CampaignStep[]>([
    { step_number: 1, subject: '', html_body: '', delay_days: 0 },
  ]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [useThread, setUseThread] = useState(false);

  const addEmailStep = () => {
    const lastStep = emailSteps[emailSteps.length - 1];
    setEmailSteps(prev => [
      ...prev,
      { step_number: prev.length + 1, subject: '', html_body: '', delay_days: lastStep.delay_days + 3 },
    ]);
    setActiveStepIndex(emailSteps.length);
  };

  const removeEmailStep = (index: number) => {
    if (emailSteps.length <= 1) return;
    setEmailSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_number: i + 1 })));
    setActiveStepIndex(Math.max(0, activeStepIndex - 1));
  };

  const updateEmailStep = (index: number, field: keyof CampaignStep, value: string | number) => {
    setEmailSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const fetchCampaigns = useCallback(async () => {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Error al cargar campañas');
    else setCampaigns(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const fetchLogs = async (campaignId: string) => {
    setLogsLoading(true);
    const [logsRes, stepsRes] = await Promise.all([
      supabase.from('email_logs').select('*').eq('campaign_id', campaignId).order('sent_at', { ascending: false }),
      supabase.from('campaign_steps').select('*').eq('campaign_id', campaignId).order('step_number', { ascending: true }),
    ]);
    setCampaignLogs(logsRes.data || []);
    setCampaignSteps((stepsRes.data || []) as CampaignStep[]);
    setLogsLoading(false);
  };

  const parseRecipients = () => {
    return form.recipients_text
      .split(/[\n,;]+/)
      .map(e => e.trim())
      .filter(e => e.includes('@'))
      .map(email => ({ email }));
  };

  const handleSaveDraft = async () => {
    if (!user) return;
    setSaving(true);
    const recipients = parseRecipients();
    const firstStep = emailSteps[0];

    const { data, error } = await supabase.from('email_campaigns').insert({
      campaign_name: form.campaign_name,
      subject: firstStep.subject,
      from_name: form.from_name || 'Musa Agency',
      reply_to: form.reply_to || null,
      html_body: firstStep.html_body || null,
      recipients: recipients as any,
      status: 'Borrador',
      created_by: user.id,
    }).select().single();

    if (error || !data) {
      toast.error('Error al guardar borrador');
      setSaving(false);
      return;
    }

    // Save steps
    if (emailSteps.length > 0) {
      const firstSubject = emailSteps[0].subject;
      const stepsToInsert = emailSteps.map(s => ({
        campaign_id: data.id,
        step_number: s.step_number,
        subject: useThread && s.step_number > 1 ? `Re: ${firstSubject}` : s.subject,
        html_body: s.html_body || null,
        delay_days: s.delay_days,
        status: 'Pendiente',
      }));
      await supabase.from('campaign_steps').insert(stepsToInsert as any);
    }

    toast.success('Borrador guardado con ' + emailSteps.length + ' paso(s)');
    resetForm();
    fetchCampaigns();
    setSaving(false);
  };

  const handleSend = async () => {
    if (!user) return;
    const recipients = parseRecipients();
    if (recipients.length === 0) {
      toast.error('Añade al menos un destinatario');
      return;
    }
    const needsSubject = useThread ? emailSteps.slice(0, 1) : emailSteps;
    if (needsSubject.some(s => !s.subject.trim())) {
      toast.error(useThread ? 'El paso 1 necesita un asunto' : 'Todos los pasos necesitan un asunto');
      return;
    }
    setSaving(true);

    const firstStep = emailSteps[0];

    // 1. Save campaign
    const { data, error } = await supabase.from('email_campaigns').insert({
      campaign_name: form.campaign_name,
      subject: firstStep.subject,
      from_name: form.from_name || 'Musa Agency',
      reply_to: form.reply_to || null,
      html_body: firstStep.html_body || null,
      recipients: recipients as any,
      status: 'Borrador',
      created_by: user.id,
    }).select().single();

    if (error || !data) {
      toast.error('Error al crear campaña');
      setSaving(false);
      return;
    }

    // 2. Save all steps with scheduled dates
    const now = new Date();
    const firstSubject = emailSteps[0].subject;
    const stepsToInsert = emailSteps.map(s => ({
      campaign_id: data.id,
      step_number: s.step_number,
      subject: useThread && s.step_number > 1 ? `Re: ${firstSubject}` : s.subject,
      html_body: s.html_body || null,
      delay_days: s.delay_days,
      scheduled_for: addDays(now, s.delay_days).toISOString(),
      status: s.delay_days === 0 ? 'Enviando' : 'Programada',
    }));
    await supabase.from('campaign_steps').insert(stepsToInsert as any);

    // 3. Call edge function for step 1 (delay_days = 0)
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('send-email-campaign', {
        body: { campaign_id: data.id, step_number: 1 },
      });
      if (fnError) throw fnError;
      if (fnData?.success) {
        const totalSteps = emailSteps.length;
        toast.success(
          totalSteps > 1
            ? `Paso 1 enviado. ${totalSteps - 1} paso(s) más programados.`
            : `Campaña enviada a ${recipients.length} destinatarios`
        );
      } else {
        toast.error(fnData?.error || 'Error al enviar campaña');
      }
    } catch (err: any) {
      console.error('Send campaign error:', err);
      toast.error(err.message || 'Error al conectar con el servicio de envío');
    }

    resetForm();
    fetchCampaigns();
    setSaving(false);
  };

  const handleDuplicate = async (campaign: Campaign) => {
    if (!user) return;
    const { data, error } = await supabase.from('email_campaigns').insert({
      campaign_name: `${campaign.campaign_name} (copia)`,
      subject: campaign.subject,
      from_name: campaign.from_name,
      reply_to: campaign.reply_to,
      html_body: campaign.html_body,
      recipients: campaign.recipients,
      status: 'Borrador',
      created_by: user.id,
    }).select().single();

    if (error || !data) {
      toast.error('Error al duplicar');
      return;
    }

    // Duplicate steps
    const { data: existingSteps } = await supabase
      .from('campaign_steps')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('step_number', { ascending: true });

    if (existingSteps && existingSteps.length > 0) {
      const newSteps = existingSteps.map((s: any) => ({
        campaign_id: data.id,
        step_number: s.step_number,
        subject: s.subject,
        html_body: s.html_body,
        delay_days: s.delay_days,
        status: 'Pendiente',
      }));
      await supabase.from('campaign_steps').insert(newSteps as any);
    }

    toast.success('Campaña duplicada con todos sus pasos');
    fetchCampaigns();
  };

  const resetForm = () => {
    setForm({ campaign_name: '', from_name: 'Musa Agency', reply_to: '', recipients_text: '' });
    setEmailSteps([{ step_number: 1, subject: '', html_body: '', delay_days: 0 }]);
    setActiveStepIndex(0);
    setStep(1);
  };

  const recipientCount = parseRecipients().length;

  const openCampaignDetail = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    fetchLogs(campaign.id);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const activeEmailStep = emailSteps[activeStepIndex];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading lime-dot">Email Campaigns</h1>
        <p className="text-body text-sm mt-1">Crea y gestiona campañas de email marketing con secuencias multi-step</p>
      </div>

      <Tabs defaultValue="new" className="w-full">
        <TabsList className="bg-muted rounded-xl p-1 h-auto mb-6">
          <TabsTrigger value="new" className="rounded-lg px-6 py-2.5 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-heading data-[state=active]:shadow-card">
            <Plus className="h-4 w-4 mr-2" /> Nueva Campaña
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg px-6 py-2.5 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-heading data-[state=active]:shadow-card">
            Historial ({campaigns.length})
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
                  {s === 1 ? 'Configuración' : s === 2 ? 'Secuencia de emails' : 'Destinatarios'}
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
                  <Input value={form.campaign_name} onChange={e => setForm(p => ({ ...p, campaign_name: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="Secuencia de bienvenida" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-heading">Nombre del remitente</Label>
                  <Input value={form.from_name} onChange={e => setForm(p => ({ ...p, from_name: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-heading">Reply-to email</Label>
                  <Input value={form.reply_to} onChange={e => setForm(p => ({ ...p, reply_to: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="hello@musa.com" />
                </div>
                <Button onClick={() => setStep(2)} disabled={!form.campaign_name} className="rounded-xl bg-primary text-primary-foreground font-semibold">
                  Siguiente →
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {/* Step tabs */}
                <div className="flex items-center gap-2 flex-wrap">
                  {emailSteps.map((es, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveStepIndex(i)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                        activeStepIndex === i
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                      )}
                    >
                      <Mail className="h-3 w-3" />
                      Paso {es.step_number}
                      {es.delay_days > 0 && (
                        <span className="text-[10px] opacity-70">+{es.delay_days}d</span>
                      )}
                    </button>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addEmailStep}
                    className="rounded-lg h-7 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" /> Agregar paso
                  </Button>
                </div>

                {/* Thread toggle */}
                {emailSteps.length > 1 && (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <Switch checked={useThread} onCheckedChange={setUseThread} id="use-thread" />
                    <div className="flex-1">
                      <Label htmlFor="use-thread" className="text-xs font-semibold text-heading flex items-center gap-1.5 cursor-pointer">
                        <Link className="h-3.5 w-3.5 text-primary" /> Enviar como hilo de correos
                      </Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Todos los pasos usarán "Re: {emailSteps[0]?.subject || '(asunto del paso 1)'}" para que lleguen en el mismo hilo
                      </p>
                    </div>
                  </div>
                )}

                {activeEmailStep && (
                  <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-heading flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Paso {activeEmailStep.step_number}
                        {activeEmailStep.step_number === 1 ? (
                          <Badge variant="secondary" className="text-[10px]">Envío inmediato</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            +{activeEmailStep.delay_days} día{activeEmailStep.delay_days !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </h3>
                      {emailSteps.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeEmailStep(activeStepIndex)}
                          className="text-destructive h-7 text-xs"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                        </Button>
                      )}
                    </div>

                    {activeEmailStep.step_number > 1 && (
                      <div>
                        <Label className="text-xs font-semibold text-heading">Días de espera después del paso anterior</Label>
                        <Input
                          type="number"
                          min={1}
                          value={activeEmailStep.delay_days}
                          onChange={e => updateEmailStep(activeStepIndex, 'delay_days', parseInt(e.target.value) || 1)}
                          className="rounded-[10px] bg-muted border-border mt-1 w-32"
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-xs font-semibold text-heading">Asunto *</Label>
                      {useThread && activeEmailStep.step_number > 1 ? (
                        <div className="mt-1">
                          <Input
                            value={`Re: ${emailSteps[0]?.subject || ''}`}
                            disabled
                            className="rounded-[10px] bg-muted/60 border-border opacity-70"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">Asunto heredado del paso 1 (modo hilo activado)</p>
                        </div>
                      ) : (
                        <Input
                          value={activeEmailStep.subject}
                          onChange={e => updateEmailStep(activeStepIndex, 'subject', e.target.value)}
                          className="rounded-[10px] bg-muted border-border mt-1"
                          placeholder="Asunto del email para este paso"
                        />
                      )}
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-heading">Contenido del email (HTML o texto)</Label>
                      <Textarea
                        value={activeEmailStep.html_body}
                        onChange={e => updateEmailStep(activeStepIndex, 'html_body', e.target.value)}
                        className="mt-1 rounded-[10px] bg-muted border-border font-mono text-sm"
                        rows={8}
                        placeholder="Escribe el contenido de tu email aquí..."
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-muted-foreground">Variables:</p>
                      {['{{business_name}}', '{{contact_name}}', '{{city}}'].map(v => (
                        <button
                          key={v}
                          onClick={() => updateEmailStep(activeStepIndex, 'html_body', activeEmailStep.html_body + ' ' + v)}
                          className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono hover:bg-primary/20 transition-colors"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline preview */}
                {emailSteps.length > 1 && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-xs font-semibold text-heading mb-3 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Vista previa de la secuencia
                    </p>
                    <div className="space-y-0">
                      {emailSteps.map((es, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                              "bg-primary text-primary-foreground"
                            )}>
                              {es.step_number}
                            </div>
                            {i < emailSteps.length - 1 && (
                              <div className="w-px h-8 bg-border my-1" />
                            )}
                          </div>
                          <div className="pb-2">
                            <p className="text-xs font-semibold text-heading">
                              {es.subject || `Paso ${es.step_number}`}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {es.delay_days === 0 ? 'Envío inmediato' : `+${es.delay_days} día${es.delay_days !== 1 ? 's' : ''} después`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl">← Anterior</Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={emailSteps.some(s => !s.subject.trim())}
                    className="rounded-xl bg-primary text-primary-foreground font-semibold"
                  >
                    Siguiente →
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-heading">
                    Destinatarios (un email por línea o separados por coma)
                  </Label>
                  <Textarea
                    value={form.recipients_text}
                    onChange={e => setForm(p => ({ ...p, recipients_text: e.target.value }))}
                    className="mt-2 rounded-[10px] bg-muted border-border font-mono text-sm"
                    rows={8}
                    placeholder={"juan@empresa.com\nana@negocio.com\ncarlos@hotel.com"}
                  />
                  {recipientCount > 0 && (
                    <p className="text-xs mt-2 font-semibold text-primary">{recipientCount} destinatario{recipientCount !== 1 ? 's' : ''} válido{recipientCount !== 1 ? 's' : ''}</p>
                  )}
                </div>

                {/* Summary */}
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-heading mb-2">Resumen de la campaña</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Pasos:</span> <span className="text-heading font-semibold">{emailSteps.length}</span></div>
                    <div><span className="text-muted-foreground">Destinatarios:</span> <span className="text-heading font-semibold">{recipientCount}</span></div>
                    <div><span className="text-muted-foreground">Total emails:</span> <span className="text-heading font-semibold">{emailSteps.length * recipientCount}</span></div>
                    <div><span className="text-muted-foreground">Duración:</span> <span className="text-heading font-semibold">{emailSteps[emailSteps.length - 1].delay_days} días</span></div>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl">← Anterior</Button>
                  <Button onClick={handleSend} disabled={saving || recipientCount === 0} className="rounded-xl bg-primary text-primary-foreground font-semibold">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Enviar secuencia ({emailSteps.length} paso{emailSteps.length !== 1 ? 's' : ''})
                  </Button>
                  <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="rounded-xl">
                    Guardar borrador
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
            {campaigns.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-10 w-10 text-primary/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No hay campañas aún</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-background">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-heading">Nombre</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-heading">Asunto</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-heading">Destinatarios</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-heading">Fecha</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-heading">Estado</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-heading">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campaigns.map(c => {
                    const recipients = Array.isArray(c.recipients) ? c.recipients : [];
                    return (
                      <tr key={c.id} onClick={() => openCampaignDetail(c)} className="hover:bg-primary/5 transition-colors cursor-pointer">
                        <td className="px-5 py-3 text-sm font-semibold text-heading">{c.campaign_name}</td>
                        <td className="px-5 py-3 text-sm text-body">{c.subject}</td>
                        <td className="px-5 py-3 text-sm text-body">{recipients.length}</td>
                        <td className="px-5 py-3 text-sm text-muted-foreground">
                          {c.sent_at
                            ? formatDistanceToNow(new Date(c.sent_at), { addSuffix: true, locale: es })
                            : c.scheduled_for
                              ? formatDistanceToNow(new Date(c.scheduled_for), { addSuffix: true, locale: es })
                              : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn("text-xs font-semibold px-3 py-1 rounded-full", statusColors[c.status || 'Borrador'])}>
                            {c.status || 'Borrador'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={e => { e.stopPropagation(); handleDuplicate(c); }}
                            className="text-xs h-7"
                          >
                            <Copy className="h-3 w-3 mr-1" /> Duplicar
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Campaign detail drawer */}
      <Sheet open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <SheetContent className="rounded-l-2xl w-[450px] sm:max-w-[450px]">
          {selectedCampaign && (
            <>
              <div className="h-1 gradient-accent rounded-full mb-4" />
              <SheetHeader>
                <SheetTitle className="text-heading">{selectedCampaign.campaign_name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="label-style">Asunto principal</p>
                  <p className="text-sm text-body">{selectedCampaign.subject}</p>
                </div>
                <div>
                  <p className="label-style">Remitente</p>
                  <p className="text-sm text-body">{selectedCampaign.from_name}</p>
                </div>
                <div>
                  <p className="label-style">Estado</p>
                  <span className={cn("text-xs font-semibold px-3 py-1 rounded-full", statusColors[selectedCampaign.status || 'Borrador'])}>
                    {selectedCampaign.status}
                  </span>
                </div>

                {/* Steps timeline */}
                {campaignSteps.length > 0 && (
                  <div className="border-t border-border pt-3">
                    <p className="label-style mb-2 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Secuencia ({campaignSteps.length} pasos)
                    </p>
                    <div className="space-y-0">
                      {campaignSteps.map((cs, i) => (
                        <div key={cs.id || i} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              "h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold",
                              cs.status === 'Enviada' ? "bg-primary text-primary-foreground" :
                              cs.status === 'Enviando' ? "bg-secondary text-secondary-foreground" :
                              "bg-muted text-muted-foreground"
                            )}>
                              {cs.step_number}
                            </div>
                            {i < campaignSteps.length - 1 && <div className="w-px h-6 bg-border my-0.5" />}
                          </div>
                          <div className="pb-1">
                            <p className="text-xs font-semibold text-heading">{cs.subject}</p>
                            <div className="flex items-center gap-2">
                              <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", statusColors[cs.status || 'Pendiente'])}>
                                {cs.status}
                              </span>
                              {cs.scheduled_for && (
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(cs.scheduled_for), 'dd/MM/yyyy HH:mm')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-border pt-3">
                  <p className="label-style mb-2">Destinatarios ({Array.isArray(selectedCampaign.recipients) ? selectedCampaign.recipients.length : 0})</p>
                  {logsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : campaignLogs.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {campaignLogs.map(log => (
                        <div key={log.id} className="flex items-center justify-between text-xs rounded-lg px-3 py-2 bg-muted">
                          <span className="text-body truncate">{log.recipient_email}</span>
                          <span className={cn(
                            "font-semibold px-2 py-0.5 rounded-full",
                            log.status === 'sent' ? 'bg-primary/10 text-primary' :
                            log.status === 'failed' ? 'bg-destructive/10 text-destructive' :
                            'bg-muted-foreground/10 text-muted-foreground'
                          )}>
                            {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sin logs de envío</p>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </motion.div>
  );
};

export default EmailCampaigns;
