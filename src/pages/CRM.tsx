import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Search, Euro, Phone, Mail as MailIcon, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Deal {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  deal_value: number;
  stage: string;
  notes: string;
  tags: string[];
}

const stageColors: Record<string, string> = {
  'Lead': '#9BA3B2',
  'Contactado': '#4ECDC4',
  'Propuesta Enviada': '#8DC63F',
  'Negociación': '#F59E0B',
  'Cerrado Ganado': '#22C55E',
  'Cerrado Perdido': '#EF4444',
};

const stages = Object.keys(stageColors);

const initialDeals: Deal[] = [
  { id: '1', company_name: 'Hotel Riverside', contact_name: 'Carlos López', email: 'carlos@hotel.com', phone: '+34 612 345 678', deal_value: 8500, stage: 'Lead', notes: 'Interesado en chatbot', tags: ['hotel', 'chatbot'] },
  { id: '2', company_name: 'Clínica Dental Sol', contact_name: 'Ana García', email: 'ana@clinica.com', phone: '+34 623 456 789', deal_value: 12000, stage: 'Contactado', notes: 'Automatización citas', tags: ['salud'] },
  { id: '3', company_name: 'Restaurante La Plaza', contact_name: 'Miguel Torres', email: 'miguel@rest.com', phone: '+34 634 567 890', deal_value: 5500, stage: 'Propuesta Enviada', notes: 'WhatsApp marketing', tags: ['restaurante'] },
  { id: '4', company_name: 'Gym Fitness Pro', contact_name: 'Laura Ruiz', email: 'laura@gym.com', phone: '+34 645 678 901', deal_value: 15000, stage: 'Negociación', notes: 'Lead gen + CRM', tags: ['fitness', 'crm'] },
  { id: '5', company_name: 'Inmobiliaria Costa', contact_name: 'Pedro Sánchez', email: 'pedro@inmo.com', phone: '+34 656 789 012', deal_value: 20000, stage: 'Cerrado Ganado', notes: 'Proyecto completo', tags: ['inmobiliaria'] },
];

const emptyDeal: Omit<Deal, 'id'> = {
  company_name: '', contact_name: '', email: '', phone: '',
  deal_value: 0, stage: 'Lead', notes: '', tags: [],
};

const CRM = () => {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [search, setSearch] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [newDeal, setNewDeal] = useState(emptyDeal);

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const dealId = result.draggableId;
    const newStage = result.destination.droppableId;
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
  }, []);

  const filteredDeals = deals.filter(d =>
    d.company_name.toLowerCase().includes(search.toLowerCase()) ||
    d.contact_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddDeal = () => {
    const deal: Deal = { ...newDeal, id: Date.now().toString() };
    setDeals(prev => [...prev, deal]);
    setNewDeal(emptyDeal);
    setShowNewDeal(false);
  };

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
            <DialogHeader>
              <DialogTitle className="text-heading">Nuevo Deal</DialogTitle>
            </DialogHeader>
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
                  <Input value={newDeal.email} onChange={e => setNewDeal(p => ({ ...p, email: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-heading">Teléfono</Label>
                  <Input value={newDeal.phone} onChange={e => setNewDeal(p => ({ ...p, phone: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-heading">Valor (€) *</Label>
                  <Input type="number" value={newDeal.deal_value} onChange={e => setNewDeal(p => ({ ...p, deal_value: Number(e.target.value) }))} className="rounded-[10px] bg-muted border-border mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-heading">Etapa</Label>
                  <select
                    value={newDeal.stage}
                    onChange={e => setNewDeal(p => ({ ...p, stage: e.target.value }))}
                    className="w-full h-10 rounded-[10px] bg-muted border border-border px-3 text-sm mt-1"
                  >
                    {stages.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-heading">Notas</Label>
                <Textarea value={newDeal.notes} onChange={e => setNewDeal(p => ({ ...p, notes: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" rows={3} />
              </div>
              <Button onClick={handleAddDeal} disabled={!newDeal.company_name || !newDeal.contact_name} className="w-full rounded-xl bg-primary text-primary-foreground font-semibold">
                Crear Deal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa o contacto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-[10px] bg-muted border-border"
          />
        </div>
      </div>

      {/* Kanban */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map(stage => {
            const stageDeals = filteredDeals.filter(d => d.stage === stage);
            const totalValue = stageDeals.reduce((sum, d) => sum + d.deal_value, 0);
            return (
              <Droppable key={stage} droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-w-[280px] w-[280px] rounded-2xl p-3 transition-colors",
                      snapshot.isDraggingOver ? "bg-primary/5" : "bg-muted/50"
                    )}
                  >
                    {/* Column header */}
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stageColors[stage] }} />
                        <span className="text-sm font-bold text-heading">{stage}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">{stageDeals.length}</span>
                      </div>
                      <span className="text-xs font-semibold text-primary">€{totalValue.toLocaleString()}</span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2 min-h-[100px]">
                      {stageDeals.map((deal, i) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={i}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              onClick={() => setSelectedDeal(deal)}
                              className={cn(
                                "rounded-xl bg-card border border-border p-3 shadow-card cursor-pointer card-hover",
                                snap.isDragging && "shadow-card-hover rotate-1"
                              )}
                              style={{
                                ...prov.draggableProps.style,
                                borderLeft: `4px solid ${stageColors[stage]}`,
                              }}
                            >
                              <p className="text-sm font-bold text-heading">{deal.company_name}</p>
                              <p className="text-xs text-body mt-1 flex items-center gap-1">
                                <User className="h-3 w-3" /> {deal.contact_name}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                  €{deal.deal_value.toLocaleString()}
                                </span>
                                <div className="flex gap-1">
                                  {deal.tags.map(t => (
                                    <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{t}</span>
                                  ))}
                                </div>
                              </div>
                              {deal.notes && (
                                <p className="text-xs text-muted-foreground mt-2 truncate">{deal.notes}</p>
                              )}
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
      </DragDropContext>

      {/* Deal detail drawer */}
      <Sheet open={!!selectedDeal} onOpenChange={() => setSelectedDeal(null)}>
        <SheetContent className="rounded-l-2xl w-[420px] sm:max-w-[420px]">
          {selectedDeal && (
            <>
              <div className="h-1 gradient-accent rounded-full mb-4" />
              <SheetHeader>
                <SheetTitle className="text-heading">{selectedDeal.company_name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-body">{selectedDeal.contact_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MailIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-body">{selectedDeal.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-body">{selectedDeal.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-bold text-primary">€{selectedDeal.deal_value.toLocaleString()}</span>
                </div>
                <div>
                  <p className="label-style mb-1">Etapa</p>
                  <span
                    className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full"
                    style={{ backgroundColor: stageColors[selectedDeal.stage] + '20', color: stageColors[selectedDeal.stage] }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stageColors[selectedDeal.stage] }} />
                    {selectedDeal.stage}
                  </span>
                </div>
                {selectedDeal.notes && (
                  <div>
                    <p className="label-style mb-1">Notas</p>
                    <p className="text-sm text-body">{selectedDeal.notes}</p>
                  </div>
                )}
                <div>
                  <p className="label-style mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedDeal.tags.map(t => (
                      <span key={t} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </motion.div>
  );
};

export default CRM;
