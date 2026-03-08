import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Search, Euro, Phone, Mail as MailIcon, User, Loader2, Pencil, Trash2, Globe, X, Save, ChevronLeft, ChevronRight, MessageSquarePlus, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { format } from 'date-fns';

type Deal = Tables<'deals'>;
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
  'Propuesta Enviada': '#8DC63F',
  'Negociación': '#F59E0B',
  'Cerrado Ganado': '#22C55E',
  'Cerrado Perdido': '#EF4444',
};

const stages = Object.keys(stageColors);

const emptyDeal = {
  company_name: '', contact_name: '', email: '', phone: '',
  deal_value: 0, stage: 'Lead', notes: '', tags: [] as string[],
  assigned_to: '' as string,
};

const CRM = () => {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [newDeal, setNewDeal] = useState(emptyDeal);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Deal>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [newActivityNote, setNewActivityNote] = useState('');
  const [newActivityDate, setNewActivityDate] = useState('');
  const [addingActivity, setAddingActivity] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  // Mouse drag-to-scroll for kanban
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
      setDeals(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDeals(); fetchProfiles(); }, [fetchDeals, fetchProfiles]);

  const getProfileName = (userId: string | null) => {
    if (!userId) return null;
    const p = profiles.find(pr => pr.id === userId);
    return p?.full_name || 'Sin nombre';
  };

  const onDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;
    const dealId = result.draggableId;
    const newStage = result.destination.droppableId;
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
    const { error } = await supabase.from('deals').update({ stage: newStage }).eq('id', dealId);
    if (error) { toast.error('Error al mover deal'); fetchDeals(); }
  }, [fetchDeals]);

  const handleAddDeal = async () => {
    if (!user) return;
    setSaving(true);
    const insert: TablesInsert<'deals'> = {
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
    };
    const { error } = await supabase.from('deals').insert(insert);
    if (error) { toast.error('Error al crear deal'); }
    else { toast.success('Deal creado'); setNewDeal(emptyDeal); setShowNewDeal(false); fetchDeals(); }
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
      website: (selectedDeal as any).website,
      instagram: (selectedDeal as any).instagram,
      facebook: (selectedDeal as any).facebook,
      linkedin: (selectedDeal as any).linkedin,
      tiktok: (selectedDeal as any).tiktok,
      whatsapp: (selectedDeal as any).whatsapp,
      assigned_to: selectedDeal.assigned_to,
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedDeal) return;
    setSaving(true);
    const { error } = await supabase.from('deals').update(editForm).eq('id', selectedDeal.id);
    if (error) { toast.error('Error al actualizar'); }
    else {
      toast.success('Deal actualizado');
      setSelectedDeal(prev => prev ? { ...prev, ...editForm } : null);
      setEditing(false);
      fetchDeals();
    }
    setSaving(false);
  };

  const handleDeleteDeal = async (id: string) => {
    const { error } = await supabase.from('deals').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar deal'); }
    else { toast.success('Deal eliminado'); setSelectedDeal(null); setEditing(false); fetchDeals(); }
  };

  const filteredDeals = deals.filter(d => {
    const matchesSearch = d.company_name.toLowerCase().includes(search.toLowerCase()) ||
      d.contact_name.toLowerCase().includes(search.toLowerCase());
    const matchesOwner = !ownerFilter || d.assigned_to === ownerFilter;
    return matchesSearch && matchesOwner;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
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
          <DialogContent className="rounded-2xl max-w-lg">
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
      </div>

      {/* Kanban with scroll navigation */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="relative group/kanban">
          {/* Left arrow */}
          <button
            onClick={() => kanbanRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-card border border-border shadow-card flex items-center justify-center text-muted-foreground hover:text-heading hover:shadow-card-hover transition-all opacity-0 group-hover/kanban:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {/* Right arrow */}
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
                        {stageDeals.map((deal, i) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={i}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                onClick={() => { setSelectedDeal(deal); setEditing(false); }}
                                className={cn("rounded-xl bg-card border border-border p-3 shadow-card cursor-pointer card-hover", snap.isDragging && "shadow-card-hover rotate-1")}
                                style={{ ...prov.draggableProps.style, borderLeft: `4px solid ${stageColors[stage]}` }}
                              >
                                <p className="text-sm font-bold text-heading">{deal.company_name}</p>
                                {(deal as any).category && (
                                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">{(deal as any).category}</span>
                                )}
                                <p className="text-xs text-body mt-1 flex items-center gap-1">
                                  <User className="h-3 w-3" /> {deal.contact_name}
                                </p>
                                {deal.phone && <p className="text-[11px] text-muted-foreground mt-0.5">📞 {deal.phone}</p>}
                                {deal.email && <p className="text-[11px] text-muted-foreground">✉️ {deal.email}</p>}
                                {(deal as any).whatsapp && <p className="text-[11px] text-muted-foreground">💬 {(deal as any).whatsapp}</p>}
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {(deal as any).instagram && <span className="text-[10px] text-pink-500">📷</span>}
                                  {(deal as any).facebook && <span className="text-[10px] text-blue-600">📘</span>}
                                  {(deal as any).linkedin && <span className="text-[10px] text-blue-700">💼</span>}
                                  {(deal as any).tiktok && <span className="text-[10px]">🎵</span>}
                                  {(deal as any).website && <span className="text-[10px]">🌐</span>}
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
                              </div>
                            )}
                          </Draggable>
                        ))}
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
        <SheetContent className="rounded-l-2xl w-[420px] sm:max-w-[420px] overflow-y-auto">
          {selectedDeal && !editing && (
            <>
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
                          <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente "{selectedDeal.company_name}".</AlertDialogDescription>
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
              <div className="mt-6 space-y-4">
                {(selectedDeal as any).category && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">{(selectedDeal as any).category}</span>
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
                {(selectedDeal as any).whatsapp && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>💬</span>
                    <a href={`https://wa.me/${(selectedDeal as any).whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-body hover:underline">{(selectedDeal as any).whatsapp}</a>
                  </div>
                )}
                {(selectedDeal as any).website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={(selectedDeal as any).website.startsWith('http') ? (selectedDeal as any).website : `https://${(selectedDeal as any).website}`} target="_blank" rel="noopener noreferrer" className="text-body hover:underline truncate">{(selectedDeal as any).website}</a>
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

                {/* Social media links */}
                {((selectedDeal as any).instagram || (selectedDeal as any).facebook || (selectedDeal as any).linkedin || (selectedDeal as any).tiktok) && (
                  <div>
                    <p className="label-style mb-2">Redes Sociales</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedDeal as any).instagram && (
                        <a href={(selectedDeal as any).instagram} target="_blank" rel="noopener noreferrer" className="text-xs bg-muted px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors">📷 Instagram</a>
                      )}
                      {(selectedDeal as any).facebook && (
                        <a href={(selectedDeal as any).facebook} target="_blank" rel="noopener noreferrer" className="text-xs bg-muted px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors">📘 Facebook</a>
                      )}
                      {(selectedDeal as any).linkedin && (
                        <a href={(selectedDeal as any).linkedin} target="_blank" rel="noopener noreferrer" className="text-xs bg-muted px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors">💼 LinkedIn</a>
                      )}
                      {(selectedDeal as any).tiktok && (
                        <a href={(selectedDeal as any).tiktok} target="_blank" rel="noopener noreferrer" className="text-xs bg-muted px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors">🎵 TikTok</a>
                      )}
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
              </div>
            </>
          )}

          {/* Edit mode */}
          {selectedDeal && editing && (
            <>
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
                    <Input value={(editForm as any).whatsapp || ''} onChange={e => setEditForm(p => ({ ...p, whatsapp: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-heading">Website</Label>
                    <Input value={(editForm as any).website || ''} onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
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
                    <Input value={(editForm as any).instagram || ''} onChange={e => setEditForm(p => ({ ...p, instagram: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="https://instagram.com/..." />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-heading">Facebook</Label>
                    <Input value={(editForm as any).facebook || ''} onChange={e => setEditForm(p => ({ ...p, facebook: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="https://facebook.com/..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-heading">LinkedIn</Label>
                    <Input value={(editForm as any).linkedin || ''} onChange={e => setEditForm(p => ({ ...p, linkedin: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="https://linkedin.com/..." />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-heading">TikTok</Label>
                    <Input value={(editForm as any).tiktok || ''} onChange={e => setEditForm(p => ({ ...p, tiktok: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" placeholder="https://tiktok.com/@..." />
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
            </>
          )}
        </SheetContent>
      </Sheet>
    </motion.div>
  );
};

export default CRM;
