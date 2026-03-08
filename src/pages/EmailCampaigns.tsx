import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mail, Plus, Send, Calendar, Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Campaign = Tables<'email_campaigns'>;
type EmailLog = Tables<'email_logs'>;

const statusColors: Record<string, string> = {
  'Enviada': 'bg-primary/10 text-primary',
  'Programada': 'bg-secondary/10 text-secondary',
  'Error': 'bg-destructive/10 text-destructive',
  'Borrador': 'bg-muted text-muted-foreground',
};

const EmailCampaigns = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignLogs, setCampaignLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    campaign_name: '',
    subject: '',
    from_name: 'Musa Agency',
    reply_to: '',
    html_body: '',
    recipients_text: '', // CSV-pasted emails, one per line
  });

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
    const { data } = await supabase
      .from('email_logs')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('sent_at', { ascending: false });
    setCampaignLogs(data || []);
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

    const { error } = await supabase.from('email_campaigns').insert({
      campaign_name: form.campaign_name,
      subject: form.subject,
      from_name: form.from_name || 'Musa Agency',
      reply_to: form.reply_to || null,
      html_body: form.html_body || null,
      recipients: recipients as any,
      status: 'Borrador',
      created_by: user.id,
    });

    if (error) {
      toast.error('Error al guardar borrador');
    } else {
      toast.success('Borrador guardado');
      resetForm();
      fetchCampaigns();
    }
    setSaving(false);
  };

  const handleSend = async () => {
    if (!user) return;
    const recipients = parseRecipients();
    if (recipients.length === 0) {
      toast.error('Añade al menos un destinatario');
      return;
    }
    setSaving(true);

    const { data, error } = await supabase.from('email_campaigns').insert({
      campaign_name: form.campaign_name,
      subject: form.subject,
      from_name: form.from_name || 'Musa Agency',
      reply_to: form.reply_to || null,
      html_body: form.html_body || null,
      recipients: recipients as any,
      status: 'Enviada',
      sent_at: new Date().toISOString(),
      created_by: user.id,
    }).select().single();

    if (error) {
      toast.error('Error al crear campaña');
    } else if (data) {
      // Create email logs for each recipient
      const logs = recipients.map(r => ({
        campaign_id: data.id,
        recipient_email: r.email,
        status: 'pending',
      }));
      await supabase.from('email_logs').insert(logs);
      toast.success(`Campaña creada con ${recipients.length} destinatarios`);
      resetForm();
      fetchCampaigns();
    }
    setSaving(false);
  };

  const handleDuplicate = async (campaign: Campaign) => {
    if (!user) return;
    const { error } = await supabase.from('email_campaigns').insert({
      campaign_name: `${campaign.campaign_name} (copia)`,
      subject: campaign.subject,
      from_name: campaign.from_name,
      reply_to: campaign.reply_to,
      html_body: campaign.html_body,
      recipients: campaign.recipients,
      status: 'Borrador',
      created_by: user.id,
    });
    if (error) toast.error('Error al duplicar');
    else {
      toast.success('Campaña duplicada');
      fetchCampaigns();
    }
  };

  const resetForm = () => {
    setForm({ campaign_name: '', subject: '', from_name: 'Musa Agency', reply_to: '', html_body: '', recipients_text: '' });
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
                  <Input value={form.campaign_name} onChange={e => setForm(p => ({ ...p, campaign_name: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="Black Friday 2024" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-heading">Asunto *</Label>
                  <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="Tu asunto de email" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-heading">Nombre del remitente</Label>
                  <Input value={form.from_name} onChange={e => setForm(p => ({ ...p, from_name: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-heading">Reply-to email</Label>
                  <Input value={form.reply_to} onChange={e => setForm(p => ({ ...p, reply_to: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="hello@musa.com" />
                </div>
                <Button onClick={() => setStep(2)} disabled={!form.campaign_name || !form.subject} className="rounded-xl bg-primary text-primary-foreground font-semibold">
                  Siguiente →
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-heading">Contenido del email (HTML o texto)</Label>
                  <Textarea
                    value={form.html_body}
                    onChange={e => setForm(p => ({ ...p, html_body: e.target.value }))}
                    className="mt-2 rounded-[10px] bg-muted border-border font-mono text-sm"
                    rows={12}
                    placeholder="Escribe el contenido de tu email aquí..."
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground">Variables:</p>
                  {['{{business_name}}', '{{contact_name}}', '{{city}}'].map(v => (
                    <button
                      key={v}
                      onClick={() => setForm(p => ({ ...p, html_body: p.html_body + ' ' + v }))}
                      className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono hover:bg-primary/20 transition-colors"
                    >
                      {v}
                    </button>
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
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl">← Anterior</Button>
                  <Button onClick={handleSend} disabled={saving || recipientCount === 0} className="rounded-xl bg-primary text-primary-foreground font-semibold">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Enviar ahora ({recipientCount})
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
                  <p className="label-style">Asunto</p>
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
                <div>
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
