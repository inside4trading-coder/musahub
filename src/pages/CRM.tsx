import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Search, Euro, Phone, Mail as MailIcon, User, Loader2, Pencil, Trash2, Globe, X, Save, ChevronLeft, ChevronRight, MessageSquarePlus, Clock, Calendar, ArrowRight, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { format, isToday, isPast, addDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

type Deal = Tables<'deals'> & { next_step?: string | null; next_step_date?: string | null };
type Profile = { id: string; full_name: string | null };
type DealActivity = {
  id: string;
  deal_id: string;
  created_by: string | null;
  activity_type: string;
  note: string;
  activity_date: string;
  created_at: string;
};

const stageColors: Record<string, string> = {
  'Lead': '#9BA3B2',
  'Contactado': '#4ECDC4',
  'En Conversación': '#8DC63F',
  'Reunión Agendada': '#4ECDC4',
  'Negociación': '#F59E0B',
  'Cerrado Ganado': '#22C55E',
  'Cerrado Perdido': '#EF4444',
};

const stages = ['Lead', 'Contactado', 'En Conversación', 'Reunión Agendada', 'Negociación', 'Cerrado Ganado', 'Cerrado Perdido'];

const activityTypeLabels: Record<string, string> = {
  'note': '📝 Nota',
  'call': '📞 Llamada',
  'meeting': '📅 Reunión',
  'email': '📧 Email',
  'followup': '🔄 Seguimiento',
  'task': '✅ Tarea',
  'stage_change': '🔀 Movimiento Pipeline',
};

const emptyDeal = {
  company_name: '', contact_name: '', email: '', phone: '',
  deal_value: 500, stage: 'Lead', notes: '', tags: [] as string[],
  assigned_to: '' as string, next_step: '', next_step_date: '',
};

function parseCRMDate(dateStr: string | null | undefined, dateOnly = false): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateOnly ? `${dateStr}T00:00:00` : dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getNextStepDateColor(dateStr: string | null | undefined): { bg: string; border: string; text: string } {
  const d = parseCRMDate(dateStr, true);
  if (!d) return { bg: '#F0F2F7', border: '#E5E9F0', text: '#9BA3B2' };
  const today = new Date(); today.setHours(0,0,0,0);
  if (d <= today) return { bg: '#FEF2F2', border: '#EF4444', text: '#EF4444' }; // past/today = red
  if (isBefore(d, addDays(today, 3))) return { bg: '#FEF9C3', border: '#F59E0B', text: '#92400E' }; // within 2 days = warning
  return { bg: '#F4FAE8', border: '#8DC63F', text: '#3F6212' }; // future = lime
}

const CRM = () => {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('');
  const [noActivityFilter, setNoActivityFilter] = useState(false);
  const [sortByNextStep, setSortByNextStep] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [newDeal, setNewDeal] = useState(emptyDeal);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Deal>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [activityCounts, setActivityCounts] = useState<Record<string, number>>({});
  const [newActivityNote, setNewActivityNote] = useState('');
  const [newActivityDate, setNewActivityDate] = useState('');
  const [addingActivity, setAddingActivity] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [newActivityType, setNewActivityType] = useState('note');
  const [drawerTab, setDrawerTab] = useState<string>('info');

  // Next step inline edit in drawer
  const [nextStepText, setNextStepText] = useState('');
  const [nextStepDate, setNextStepDate] = useState('');
  const [savingNextStep, setSavingNextStep] = useState(false);

  const kanbanRef = useRef<HTMLDivElement>(null);
  const isDraggingScroll = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!kanbanRef.current) return;
    isDraggingScroll.current = true;
    startX.current = e.pageX - kanbanRef.current.offsetLeft;
    scrollLeftStart.current = kanbanRef.current.scrollLeft;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingScroll.current || !kanbanRef.current) return;
    e.preventDefault();
    const x = e.pageX - kanbanRef.current.offsetLeft;
    kanbanRef.current.scrollLeft = scrollLeftStart.current - (x - startX.current);
  };
  const handleMouseUp = () => { isDraggingScroll.current = false; };

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, full_name');
    if (data) setProfiles(data);
  }, []);

  const fetchDeals = useCallback(async () => {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error al cargar deals');
      console.error(error);
    } else {
      setDeals((data as Deal[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchActivityCounts = useCallback(async () => {
    const { data } = await supabase
      .from('deal_activities')
      .select('deal_id');
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((row: any) => {
        counts[row.deal_id] = (counts[row.deal_id] || 0) + 1;
      });
      setActivityCounts(counts);
    }
  }, []);

  useEffect(() => { fetchDeals(); fetchProfiles(); fetchActivityCounts(); }, [fetchDeals, fetchProfiles, fetchActivityCounts]);

  const fetchActivities = useCallback(async (dealId: string) => {
    const { data } = await supabase
      .from('deal_activities')
      .select('*')
      .eq('deal_id', dealId)
      .order('activity_date', { ascending: false });
    setActivities((data as DealActivity[]) || []);
  }, []);

  useEffect(() => {
    if (selectedDeal) {
      fetchActivities(selectedDeal.id);
      setShowActivityForm(false);
      setNewActivityNote('');
      setNewActivityDate('');
      setDrawerTab('info');
      setNextStepText(selectedDeal.next_step || '');
      setNextStepDate(selectedDeal.next_step_date || '');
    } else {
      setActivities([]);
    }
  }, [selectedDeal, fetchActivities]);

  const getProfileName = (userId: string | null) => {
    if (!userId) return null;
    const p = profiles.find(pr => pr.id === userId);
    return p?.full_name || 'Sin nombre';
  };

  const onDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;
    const dealId = result.draggableId;
    const newStage = result.destination.droppableId;
    const deal = deals.find(d => d.id === dealId);
    const oldStage = deal?.stage;
    if (oldStage === newStage) return;
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
    const { error } = await supabase.from('deals').update({ stage: newStage } as any).eq('id', dealId);
    if (error) { toast.error('Error al mover deal'); fetchDeals(); return; }
    // Log stage change as activity
    if (user && deal) {
      await supabase.from('deal_activities').insert({
        deal_id: dealId,
        created_by: user.id,
        activity_type: 'stage_change',
        note: `Pipeline: ${oldStage} → ${newStage}`,
      });
      fetchActivityCounts();
    }
  }, [fetchDeals, deals, user, fetchActivityCounts]);

  const handleAddDeal = async () => {
    if (!user) return;
    setSaving(true);
    const insert: any = {
      company_name: newDeal.company_name,
      contact_name: newDeal.contact_name,
      email: newDeal.email || null,
      phone: newDeal.phone || null,
      deal_value: newDeal.deal_value,
      stage: newDeal.stage,
      notes: newDeal.notes || null,
      tags: newDeal.tags,
      created_by: user.id,
      assigned_to: newDeal.assigned_to || null,
      next_step: newDeal.next_step || null,
      next_step_date: newDeal.next_step_date || null,
    };
    const { error } = await supabase.from('deals').insert(insert);
    if (error) { toast.error('Error al crear deal'); }
    else { toast.success('Deal creado'); setNewDeal(emptyDeal); setShowNewDeal(false); fetchDeals(); fetchActivityCounts(); }
    setSaving(false);
  };

  const handleStartEdit = () => {
    if (!selectedDeal) return;
    setEditForm({
      company_name: selectedDeal.company_name,
      contact_name: selectedDeal.contact_name,
      email: selectedDeal.email,
      phone: selectedDeal.phone,
      deal_value: selectedDeal.deal_value,
      stage: selectedDeal.stage,
      notes: selectedDeal.notes,
      website: selectedDeal.website,
      instagram: selectedDeal.instagram,
      facebook: selectedDeal.facebook,
      linkedin: selectedDeal.linkedin,
      tiktok: selectedDeal.tiktok,
      whatsapp: selectedDeal.whatsapp,
      assigned_to: selectedDeal.assigned_to,
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedDeal) return;
    setSaving(true);
    const { error } = await supabase.from('deals').update(editForm as any).eq('id', selectedDeal.id);
    if (error) { toast.error('Error al actualizar'); }
    else {
      toast.success('Deal actualizado');
      setSelectedDeal(prev => prev ? { ...prev, ...editForm } : null);
      setEditing(false);
      fetchDeals();
    }
    setSaving(false);
  };

  const handleSaveNextStep = async () => {
    if (!selectedDeal) return;
    setSavingNextStep(true);
    const { error } = await supabase.from('deals').update({
      next_step: nextStepText || null,
      next_step_date: nextStepDate || null,
    } as any).eq('id', selectedDeal.id);
    if (error) { toast.error('Error al guardar próximo paso'); }
    else {
      toast.success('Próximo paso actualizado');
      const updated = { ...selectedDeal, next_step: nextStepText || null, next_step_date: nextStepDate || null };
      setSelectedDeal(updated);
      setDeals(prev => prev.map(d => d.id === selectedDeal.id ? updated : d));
    }
    setSavingNextStep(false);
  };

  const handleDeleteDeal = async (id: string) => {
    const { error } = await supabase.from('deals').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar deal'); }
    else { toast.success('Deal eliminado'); setSelectedDeal(null); setEditing(false); fetchDeals(); }
  };

  const handleAddActivity = async () => {
    if (!selectedDeal || !newActivityNote.trim() || !user) return;
    setAddingActivity(true);
    const { error } = await supabase.from('deal_activities').insert({
      deal_id: selectedDeal.id,
      created_by: user.id,
      note: newActivityNote.trim(),
      activity_date: newActivityDate || new Date().toISOString(),
      activity_type: newActivityType,
    } as any);
    if (error) { toast.error('Error al agregar actividad'); }
    else {
      toast.success('Actividad registrada');
      setNewActivityNote('');
      setNewActivityDate('');
      setNewActivityType('note');
      setShowActivityForm(false);
      fetchActivities(selectedDeal.id);
      fetchActivityCounts();
    }
    setAddingActivity(false);
  };

  const handleDeleteActivity = async (actId: string) => {
    if (!selectedDeal) return;
    const { error } = await supabase.from('deal_activities').delete().eq('id', actId);
    if (error) { toast.error('Error al eliminar actividad'); }
    else {
      toast.success('Actividad eliminada');
      fetchActivities(selectedDeal.id);
      fetchActivityCounts();
    }
  };

  const filteredDeals = useMemo(() => {
    let result = deals.filter(d => {
      const matchesSearch = d.company_name.toLowerCase().includes(search.toLowerCase()) ||
        d.contact_name.toLowerCase().includes(search.toLowerCase());
      const matchesOwner = !ownerFilter || d.assigned_to === ownerFilter;
      const matchesNoActivity = !noActivityFilter || !(activityCounts[d.id]);
      return matchesSearch && matchesOwner && matchesNoActivity;
    });
    if (sortByNextStep) {
      result = [...result].sort((a, b) => {
        const aDate = parseCRMDate(a.next_step_date, true);
        const bDate = parseCRMDate(b.next_step_date, true);
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return aDate.getTime() - bDate.getTime();
      });
    }
    return result;
  }, [deals, search, ownerFilter, noActivityFilter, sortByNextStep, activityCounts]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <TooltipProvider>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-heading lime-dot">CRM Pipeline</h1>
            <p className="text-body text-sm mt-1">Gestiona tus deals y oportunidades</p>
          </div>
          <Dialog open={showNewDeal} onOpenChange={setShowNewDeal}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all">
                <Plus className="h-4 w-4 mr-2" /> Nuevo Deal
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="h-1 gradient-accent rounded-full -mt-2 mb-4" />
              <DialogHeader><DialogTitle className="text-heading">Nuevo Deal</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-heading">Empresa *</Label>
                    <Input value={newDeal.company_name} onChange={e => setNewDeal(p => ({ ...p, company_name: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-heading">Contacto *</Label>
                    <Input value={newDeal.contact_name} onChange={e => setNewDeal(p => ({ ...p, contact_name: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-heading">Email</Label>
                    <Input value={newDeal.email || ''} onChange={e => setNewDeal(p => ({ ...p, email: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-heading">Teléfono</Label>
                    <Input value={newDeal.phone || ''} onChange={e => setNewDeal(p => ({ ...p, phone: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-heading">Valor (€) *</Label>
                    <Input type="number" value={newDeal.deal_value} onChange={e => setNewDeal(p => ({ ...p, deal_value: Number(e.target.value) }))} className="rounded-[10px] bg-muted border-border mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-heading">Etapa</Label>
                    <select value={newDeal.stage} onChange={e => setNewDeal(p => ({ ...p, stage: e.target.value }))} className="w-full h-10 rounded-[10px] bg-muted border border-border px-3 text-sm mt-1">
                      {stages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-heading">Owner</Label>
                  <select value={newDeal.assigned_to} onChange={e => setNewDeal(p => ({ ...p, assigned_to: e.target.value }))} className="w-full h-10 rounded-[10px] bg-muted border border-border px-3 text-sm mt-1">
                    <option value="">Sin asignar</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || 'Sin nombre'}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-heading">Notas</Label>
                  <Textarea value={newDeal.notes || ''} onChange={e => setNewDeal(p => ({ ...p, notes: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" rows={3} />
                </div>
                <Button onClick={handleAddDeal} disabled={!newDeal.company_name || !newDeal.contact_name || saving} className="w-full rounded-xl bg-primary text-primary-foreground font-semibold">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Crear Deal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Filters */}
        <div className="mb-4 flex gap-3 items-center flex-wrap">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por empresa o contacto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-[10px] bg-muted border-border" />
          </div>
          <select
            value={ownerFilter}
            onChange={e => setOwnerFilter(e.target.value)}
            className="h-10 rounded-[10px] bg-muted border border-border px-3 text-sm text-heading focus:border-primary focus:outline-none"
          >
            <option value="">Todos los owners</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.full_name || 'Sin nombre'}</option>
            ))}
          </select>
          <Button
            variant={sortByNextStep ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortByNextStep(v => !v)}
            className="rounded-[10px] text-xs h-10 gap-1"
          >
            <Calendar className="h-3.5 w-3.5" /> Ordenar por próximo paso
          </Button>
          <Button
            variant={noActivityFilter ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => setNoActivityFilter(v => !v)}
            className="rounded-[10px] text-xs h-10 gap-1"
          >
            <AlertCircle className="h-3.5 w-3.5" /> Sin actividad
          </Button>
        </div>

        {/* Kanban */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="relative group/kanban">
            <button
              onClick={() => kanbanRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-card border border-border shadow-card flex items-center justify-center text-muted-foreground hover:text-heading hover:shadow-card-hover transition-all opacity-0 group-hover/kanban:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => kanbanRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-card border border-border shadow-card flex items-center justify-center text-muted-foreground hover:text-heading hover:shadow-card-hover transition-all opacity-0 group-hover/kanban:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div
              ref={kanbanRef}
              className="flex gap-4 overflow-x-auto pb-4 cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {stages.map(stage => {
                const stageDeals = filteredDeals.filter(d => d.stage === stage);
                const totalValue = stageDeals.reduce((sum, d) => sum + Number(d.deal_value), 0);
                return (
                  <Droppable key={stage} droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn("min-w-[280px] w-[280px] rounded-2xl p-3 transition-colors shrink-0", snapshot.isDraggingOver ? "bg-primary/5" : "bg-muted/50")}
                      >
                        <div className="flex items-center justify-between mb-3 px-1">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stageColors[stage] }} />
                            <span className="text-sm font-bold text-heading">{stage}</span>
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">{stageDeals.length}</span>
                          </div>
                          <span className="text-xs font-semibold text-primary">€{totalValue.toLocaleString()}</span>
                        </div>

                        <div className="space-y-2 min-h-[100px]">
                          {stageDeals.map((deal, i) => {
                            const count = activityCounts[deal.id] || 0;
                            const hasNoActivity = count === 0;
                            const dateColors = getNextStepDateColor(deal.next_step_date);
                            return (
                              <Draggable key={deal.id} draggableId={deal.id} index={i}>
                                {(prov, snap) => (
                                  <div
                                    ref={prov.innerRef}
                                    {...prov.draggableProps}
                                    {...prov.dragHandleProps}
                                    onClick={() => { setSelectedDeal(deal); setEditing(false); }}
                                    className={cn(
                                      "rounded-xl bg-card border border-border p-3 shadow-card cursor-pointer card-hover relative",
                                      snap.isDragging && "shadow-card-hover rotate-1",
                                      noActivityFilter && hasNoActivity && "!border-l-[#EF4444]"
                                    )}
                                    style={{
                                      ...prov.draggableProps.style,
                                      borderLeft: noActivityFilter && hasNoActivity
                                        ? '4px solid #EF4444'
                                        : `4px solid ${stageColors[stage]}`,
                                    }}
                                  >
                                    {/* Activity count badge */}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div
                                          className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-[11px] font-bold"
                                          style={{
                                            width: 24, height: 24,
                                            backgroundColor: hasNoActivity ? '#FEF2F2' : '#F4FAE8',
                                            border: `1.5px solid ${hasNoActivity ? '#EF4444' : '#8DC63F'}`,
                                            color: hasNoActivity ? '#EF4444' : '#1A2744',
                                          }}
                                        >
                                          {count}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{count} interacciones registradas</p>
                                      </TooltipContent>
                                    </Tooltip>

                                    <p className="text-sm font-bold text-heading pr-5">{deal.company_name}</p>
                                    {deal.category && (
                                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">{deal.category}</span>
                                    )}
                                    <p className="text-xs text-body mt-1 flex items-center gap-1">
                                      <User className="h-3 w-3" /> {deal.contact_name}
                                    </p>
                                    {deal.phone && <p className="text-[11px] text-muted-foreground mt-0.5">📞 {deal.phone}</p>}
                                    {deal.email && <p className="text-[11px] text-muted-foreground">✉️ {deal.email}</p>}
                                    {deal.whatsapp && <p className="text-[11px] text-muted-foreground">💬 {deal.whatsapp}</p>}
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {deal.instagram && <span className="text-[10px] text-pink-500">📷</span>}
                                      {deal.facebook && <span className="text-[10px] text-blue-600">📘</span>}
                                      {deal.linkedin && <span className="text-[10px] text-blue-700">💼</span>}
                                      {deal.tiktok && <span className="text-[10px]">🎵</span>}
                                      {deal.website && <span className="text-[10px]">🌐</span>}
                                    </div>
                                    {deal.assigned_to && (
                                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                                        👤 {getProfileName(deal.assigned_to)}
                                      </p>
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                        €{Number(deal.deal_value).toLocaleString()}
                                      </span>
                                      <div className="flex gap-1">
                                        {(deal.tags || []).map(t => (
                                          <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{t}</span>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Next step section */}
                                    <div className="mt-2 pt-2 border-t border-border/50">
                                      {deal.next_step ? (
                                        <div className="flex items-start gap-1.5">
                                          <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" style={{ color: '#8DC63F' }} />
                                          <p className="text-[11px] text-heading truncate flex-1" title={deal.next_step}>
                                            {deal.next_step.length > 60 ? deal.next_step.slice(0, 60) + '…' : deal.next_step}
                                          </p>
                                           {(() => {
                                             const formattedNextStepDate = parseCRMDate(deal.next_step_date, true);
                                             if (!formattedNextStepDate) return null;

                                             return (
                                               <span
                                                 className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                                                 style={{
                                                   backgroundColor: dateColors.bg,
                                                   border: `1px solid ${dateColors.border}`,
                                                   color: dateColors.text,
                                                 }}
                                               >
                                                 {format(formattedNextStepDate, 'dd MMM', { locale: es })}
                                               </span>
                                             );
                                           })()}
                                        </div>
                                      ) : (
                                        <p className="text-[11px] text-muted-foreground border border-dashed border-border rounded-lg px-2 py-1 text-center">
                                          — Sin próximo paso
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </div>
        </DragDropContext>

        {/* Deal detail drawer */}
        <Sheet open={!!selectedDeal} onOpenChange={() => { setSelectedDeal(null); setEditing(false); }}>
          <SheetContent className="rounded-l-2xl w-[460px] sm:max-w-[460px] overflow-y-auto p-0">
            {selectedDeal && !editing && (
              <div className="p-6">
                <div className="h-1 gradient-accent rounded-full mb-4" />
                <SheetHeader>
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-heading">{selectedDeal.company_name}</SheetTitle>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={handleStartEdit} className="h-8 w-8 rounded-lg">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar deal?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteDeal(selectedDeal.id)} className="rounded-xl bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </SheetHeader>

                <Tabs value={drawerTab} onValueChange={setDrawerTab} className="mt-4">
                  <TabsList className="w-full rounded-xl">
                    <TabsTrigger value="info" className="flex-1 rounded-lg text-xs">Información</TabsTrigger>
                    <TabsTrigger value="nextstep" className="flex-1 rounded-lg text-xs">Próximo Paso</TabsTrigger>
                    <TabsTrigger value="activity" className="flex-1 rounded-lg text-xs">
                      Actividad
                      <span className="ml-1.5 text-[10px] font-bold rounded-full px-1.5 py-0.5" style={{
                        backgroundColor: activities.length === 0 ? '#FEF2F2' : '#F4FAE8',
                        color: activities.length === 0 ? '#EF4444' : '#1A2744',
                      }}>
                        {activities.length}
                      </span>
                    </TabsTrigger>
                  </TabsList>

                  {/* INFO TAB */}
                  <TabsContent value="info" className="mt-4 space-y-4">
                    {selectedDeal.category && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">{selectedDeal.category}</span>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-body">{selectedDeal.contact_name}</span>
                    </div>
                    {selectedDeal.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <MailIcon className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${selectedDeal.email}`} className="text-body hover:underline">{selectedDeal.email}</a>
                      </div>
                    )}
                    {selectedDeal.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-body">{selectedDeal.phone}</span>
                      </div>
                    )}
                    {selectedDeal.whatsapp && (
                      <div className="flex items-center gap-2 text-sm">
                        <span>💬</span>
                        <a href={`https://wa.me/${selectedDeal.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-body hover:underline">{selectedDeal.whatsapp}</a>
                      </div>
                    )}
                    {selectedDeal.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={selectedDeal.website.startsWith('http') ? selectedDeal.website : `https://${selectedDeal.website}`} target="_blank" rel="noopener noreferrer" className="text-body hover:underline truncate">{selectedDeal.website}</a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      <span className="text-lg font-bold text-primary">€{Number(selectedDeal.deal_value).toLocaleString()}</span>
                    </div>
                    <div>
                      <p className="label-style mb-1">Owner</p>
                      <span className="text-sm text-body">{getProfileName(selectedDeal.assigned_to) || 'Sin asignar'}</span>
                    </div>
                    <div>
                      <p className="label-style mb-1">Etapa</p>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: stageColors[selectedDeal.stage] + '20', color: stageColors[selectedDeal.stage] }}>
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stageColors[selectedDeal.stage] }} />
                        {selectedDeal.stage}
                      </span>
                    </div>
                    {(selectedDeal.instagram || selectedDeal.facebook || selectedDeal.linkedin || selectedDeal.tiktok) && (
                      <div>
                        <p className="label-style mb-2">Redes Sociales</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedDeal.instagram && <a href={selectedDeal.instagram} target="_blank" rel="noopener noreferrer" className="text-xs bg-muted px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors">📷 Instagram</a>}
                          {selectedDeal.facebook && <a href={selectedDeal.facebook} target="_blank" rel="noopener noreferrer" className="text-xs bg-muted px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors">📘 Facebook</a>}
                          {selectedDeal.linkedin && <a href={selectedDeal.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs bg-muted px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors">💼 LinkedIn</a>}
                          {selectedDeal.tiktok && <a href={selectedDeal.tiktok} target="_blank" rel="noopener noreferrer" className="text-xs bg-muted px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors">🎵 TikTok</a>}
                        </div>
                      </div>
                    )}
                    {selectedDeal.notes && (
                      <div>
                        <p className="label-style mb-1">Notas</p>
                        <p className="text-sm text-body">{selectedDeal.notes}</p>
                      </div>
                    )}
                    <div>
                      <p className="label-style mb-1">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {(selectedDeal.tags || []).map(t => (
                          <span key={t} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">{t}</span>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* NEXT STEP TAB */}
                  <TabsContent value="nextstep" className="mt-4 space-y-4">
                    <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <ArrowRight className="h-4 w-4" style={{ color: '#8DC63F' }} />
                        <p className="text-sm font-bold text-heading">Próximo Paso</p>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-heading">Descripción</Label>
                        <Textarea
                          value={nextStepText}
                          onChange={e => setNextStepText(e.target.value)}
                          placeholder="Ej: Enviar propuesta de precio..."
                          className="rounded-[10px] bg-background border-border mt-1 text-sm"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-heading">Fecha</Label>
                        <Input
                          type="date"
                          value={nextStepDate}
                          onChange={e => setNextStepDate(e.target.value)}
                          className="rounded-[10px] bg-background border-border mt-1 text-sm"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={handleSaveNextStep}
                        disabled={savingNextStep}
                        className="w-full rounded-xl bg-primary text-primary-foreground font-semibold text-xs"
                      >
                        {savingNextStep ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                        Guardar próximo paso
                      </Button>
                    </div>
                  </TabsContent>

                  {/* ACTIVITY TAB */}
                  <TabsContent value="activity" className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="label-style flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Registro de Actividades
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowActivityForm(!showActivityForm)}
                        className="rounded-lg h-7 text-xs gap-1"
                      >
                        <Plus className="h-3 w-3" /> Nueva
                      </Button>
                    </div>

                    {showActivityForm && (
                      <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                        <div>
                          <Label className="text-[10px] font-semibold text-muted-foreground">Tipo de actividad</Label>
                          <Select value={newActivityType} onValueChange={setNewActivityType}>
                            <SelectTrigger className="rounded-[10px] bg-background border-border text-xs h-8 mt-0.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="note">📝 Nota</SelectItem>
                              <SelectItem value="call">📞 Llamada</SelectItem>
                              <SelectItem value="meeting">📅 Reunión</SelectItem>
                              <SelectItem value="email">📧 Email</SelectItem>
                              <SelectItem value="task">✅ Tarea</SelectItem>
                              <SelectItem value="followup">🔄 Seguimiento</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Textarea
                          placeholder="Describe la actividad..."
                          value={newActivityNote}
                          onChange={e => setNewActivityNote(e.target.value)}
                          className="rounded-[10px] bg-background border-border text-sm min-h-[60px]"
                          rows={2}
                        />
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Label className="text-[10px] font-semibold text-muted-foreground">Fecha</Label>
                            <Input
                              type="datetime-local"
                              value={newActivityDate}
                              onChange={e => setNewActivityDate(e.target.value)}
                              className="rounded-[10px] bg-background border-border text-xs h-8 mt-0.5"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={handleAddActivity}
                            disabled={!newActivityNote.trim() || addingActivity}
                            className="rounded-lg h-8 text-xs bg-primary text-primary-foreground"
                          >
                            {addingActivity ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {activities.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Sin actividades registradas</p>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {activities.map(act => (
                          <div key={act.id} className="bg-muted/40 rounded-lg p-2.5 border border-border/50 group/act">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium">
                                {activityTypeLabels[act.activity_type] || act.activity_type}
                              </Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); handleDeleteActivity(act.id); }}
                                className="h-5 w-5 rounded opacity-0 group-hover/act:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-sm text-body">{act.note}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-2.5 w-2.5" />
                                {parseCRMDate(act.activity_date) ? format(parseCRMDate(act.activity_date) as Date, 'dd/MM/yyyy HH:mm') : 'Fecha inválida'}
                              </span>
                              {act.created_by && (
                                <span className="text-[10px] text-muted-foreground">
                                  • {getProfileName(act.created_by)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Edit mode */}
            {selectedDeal && editing && (
              <div className="p-6">
                <div className="h-1 gradient-accent rounded-full mb-4" />
                <SheetHeader>
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-heading">Editar Deal</SheetTitle>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(false)} className="h-8 w-8 rounded-lg">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </SheetHeader>
                <div className="mt-6 space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-heading">Empresa</Label>
                    <Input value={editForm.company_name || ''} onChange={e => setEditForm(p => ({ ...p, company_name: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-heading">Contacto</Label>
                    <Input value={editForm.contact_name || ''} onChange={e => setEditForm(p => ({ ...p, contact_name: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-heading">Email</Label>
                      <Input value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-heading">Teléfono</Label>
                      <Input value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-heading">WhatsApp</Label>
                      <Input value={editForm.whatsapp || ''} onChange={e => setEditForm(p => ({ ...p, whatsapp: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-heading">Website</Label>
                      <Input value={editForm.website || ''} onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-heading">Valor (€)</Label>
                      <Input type="number" value={editForm.deal_value ?? 0} onChange={e => setEditForm(p => ({ ...p, deal_value: Number(e.target.value) }))} className="rounded-[10px] bg-muted border-border mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-heading">Etapa</Label>
                      <select value={editForm.stage || 'Lead'} onChange={e => setEditForm(p => ({ ...p, stage: e.target.value }))} className="w-full h-10 rounded-[10px] bg-muted border border-border px-3 text-sm mt-1">
                        {stages.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-heading">Owner</Label>
                    <select value={editForm.assigned_to || ''} onChange={e => setEditForm(p => ({ ...p, assigned_to: e.target.value || null }))} className="w-full h-10 rounded-[10px] bg-muted border border-border px-3 text-sm mt-1">
                      <option value="">Sin asignar</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || 'Sin nombre'}</option>)}
                    </select>
                  </div>
                  <p className="label-style pt-2">Redes Sociales</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-heading">Instagram</Label>
                      <Input value={editForm.instagram || ''} onChange={e => setEditForm(p => ({ ...p, instagram: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="https://instagram.com/..." />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-heading">Facebook</Label>
                      <Input value={editForm.facebook || ''} onChange={e => setEditForm(p => ({ ...p, facebook: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="https://facebook.com/..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-heading">LinkedIn</Label>
                      <Input value={editForm.linkedin || ''} onChange={e => setEditForm(p => ({ ...p, linkedin: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="https://linkedin.com/..." />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-heading">TikTok</Label>
                      <Input value={editForm.tiktok || ''} onChange={e => setEditForm(p => ({ ...p, tiktok: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="https://tiktok.com/@..." />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-heading">Notas</Label>
                    <Textarea value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" rows={3} />
                  </div>
                  <Button onClick={handleSaveEdit} disabled={saving} className="w-full rounded-xl bg-primary text-primary-foreground font-semibold">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Guardar cambios
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </motion.div>
    </TooltipProvider>
  );
};

export default CRM;
