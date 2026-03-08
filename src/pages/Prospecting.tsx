import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Plus, Loader2, Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { Tables } from '@/integrations/supabase/types';
import { ProspectingMap } from '@/components/ProspectingMap';

type Prospect = Tables<'prospects'>;

const businessTypes = [
  'Restaurantes', 'Hoteles', 'Gimnasios', 'Peluquerías', 'Clínicas',
  'Tiendas retail', 'Inmobiliarias', 'Abogados', 'Contadores',
  'Farmacias', 'Dentistas', 'Bares',
];

const Prospecting = () => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterRating, setFilterRating] = useState(false);
  const [filterPhone, setFilterPhone] = useState(false);
  const [filterWeb, setFilterWeb] = useState(false);
  const [addingToCrm, setAddingToCrm] = useState<string | null>(null);

  // Map search state
  const [searchCity, setSearchCity] = useState('Madrid');
  const [searchType, setSearchType] = useState(businessTypes[0]);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [mapSearching, setMapSearching] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState('');

  const scrapeAllContacts = async () => {
    // Get prospects with website but no email and no whatsapp
    const toScrape = prospects.filter(p => p.website && !(p as any).email && !(p as any).whatsapp);
    if (toScrape.length === 0) {
      toast.info('No hay prospectos pendientes de scrapear');
      return;
    }

    setScraping(true);
    const chunkSize = 10;
    let totalFound = 0;
    let processed = 0;

    for (let i = 0; i < toScrape.length; i += chunkSize) {
      const chunk = toScrape.slice(i, i + chunkSize);
      setScrapeProgress(`${processed}/${toScrape.length} procesados…`);

      try {
        const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke('scrape-contacts', {
          body: { websites: chunk.map(p => ({ id: p.id, url: p.website! })) },
        });

        if (scrapeError || !scrapeData?.success) {
          console.warn('Chunk scrape error:', scrapeError || scrapeData?.error);
          processed += chunk.length;
          continue;
        }

      const updates = Object.entries(scrapeData.results as Record<string, { email: string | null; whatsapp: string | null; instagram: string | null; facebook: string | null; linkedin: string | null; tiktok: string | null }>);
        for (const [id, contact] of updates) {
          if (contact.email || contact.whatsapp || contact.instagram || contact.facebook || contact.linkedin || contact.tiktok) {
            totalFound++;
            await supabase.from('prospects').update({
              email: contact.email,
              whatsapp: contact.whatsapp,
              instagram: contact.instagram,
              facebook: contact.facebook,
              linkedin: contact.linkedin,
              tiktok: contact.tiktok,
            }).eq('id', id);
          }
        }
      } catch (err) {
        console.warn('Chunk failed:', err);
      }
      processed += chunk.length;
    }

    setScraping(false);
    setScrapeProgress('');
    if (totalFound > 0) {
      toast.success(`Se encontraron datos de contacto en ${totalFound} de ${toScrape.length} webs`);
    } else {
      toast.info(`Se procesaron ${toScrape.length} webs, no se encontraron contactos`);
    }
    fetchProspects();
  };

  const fetchProspects = useCallback(async () => {
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Error al cargar prospectos');
    else setProspects(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  const filtered = prospects.filter(p => {
    if (filterRating && (p.rating === null || Number(p.rating) < 4)) return false;
    if (filterPhone && !p.phone) return false;
    if (filterWeb && !p.website) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.id)));
  };

  const handleAddToCrm = async (prospect: Prospect) => {
    setAddingToCrm(prospect.id);
    const { error } = await supabase.from('deals').insert({
      company_name: prospect.business_name,
      contact_name: prospect.business_name,
      phone: prospect.phone,
      stage: 'Lead',
      deal_value: 0,
    });

    if (!error) {
      await supabase.from('prospects').update({ added_to_crm: true }).eq('id', prospect.id);
      toast.success(`${prospect.business_name} añadido al CRM`);
      fetchProspects();
    } else {
      toast.error('Error al añadir al CRM');
    }
    setAddingToCrm(null);
  };

  const handleBulkAddToCrm = async () => {
    const toAdd = filtered.filter(p => selected.has(p.id) && !p.added_to_crm);
    if (toAdd.length === 0) { toast.info('No hay prospectos nuevos seleccionados'); return; }

    const inserts = toAdd.map(p => ({
      company_name: p.business_name,
      contact_name: p.business_name,
      phone: p.phone,
      stage: 'Lead',
      deal_value: 0,
    }));

    const { error } = await supabase.from('deals').insert(inserts);
    if (!error) {
      await supabase.from('prospects').update({ added_to_crm: true }).in('id', toAdd.map(p => p.id));
      toast.success(`${toAdd.length} prospectos añadidos al CRM`);
      setSelected(new Set());
      fetchProspects();
    } else {
      toast.error('Error al añadir al CRM');
    }
  };

  const handleExport = (rows: Prospect[]) => {
    if (rows.length === 0) { toast.info('No hay datos para exportar'); return; }
    const data = rows.map(p => ({
      'Negocio': p.business_name,
      'Categoría': p.category || '',
      'Dirección': p.address || '',
      'Ciudad': p.city || '',
      'Teléfono': p.phone || '',
      'WhatsApp': (p as any).whatsapp || '',
      'Email': (p as any).email || '',
      'Instagram': (p as any).instagram || '',
      'Facebook': (p as any).facebook || '',
      'LinkedIn': (p as any).linkedin || '',
      'TikTok': (p as any).tiktok || '',
      'Rating': p.rating ?? '',
      'Reviews': p.review_count ?? '',
      'Web': p.website || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Prospectos');
    XLSX.writeFile(wb, `prospectos_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Archivo exportado');
  };

  const handleMapResults = async (results: Array<{
    business_name: string; address: string; phone: string | null;
    website: string | null; rating: number | null; review_count: number | null;
    latitude: number; longitude: number; category: string; city: string;
    polygon_data: object | null;
  }>) => {
    if (results.length === 0) {
      toast.info('No se encontraron negocios en esta zona');
      setMapSearching(false);
      return;
    }

    // Deduplicate against existing prospects in DB
    const existingNames = new Set(prospects.map(p => `${p.business_name}|${p.address}`));
    const unique = results.filter(r => !existingNames.has(`${r.business_name}|${r.address}`));

    // Also deduplicate within the batch itself
    const seenInBatch = new Set<string>();
    const deduped = unique.filter(r => {
      const key = `${r.business_name}|${r.address}`;
      if (seenInBatch.has(key)) return false;
      seenInBatch.add(key);
      return true;
    });

    if (deduped.length === 0) {
      toast.info(`${results.length} negocios encontrados, pero todos ya están en la base de datos`);
      setMapSearching(false);
      return;
    }

    const skipped = results.length - deduped.length;
    const inserts = deduped.map(r => ({
      business_name: r.business_name,
      address: r.address,
      phone: r.phone,
      website: r.website,
      rating: r.rating,
      review_count: r.review_count,
      latitude: r.latitude,
      longitude: r.longitude,
      category: r.category,
      city: r.city,
      search_query: r.category,
      polygon_data: r.polygon_data as any,
    }));

    const { data: inserted, error } = await supabase.from('prospects').insert(inserts).select('id, website');
    if (error) {
      toast.error('Error al guardar prospectos');
      setMapSearching(false);
      return;
    }

    const msg = skipped > 0
      ? `${deduped.length} nuevos guardados (${skipped} duplicados omitidos)`
      : `${deduped.length} negocios encontrados y guardados`;
    toast.success(msg);
    fetchProspects();
    setMapSearching(false);

    // Scrape websites for email/whatsapp in background
    const withWebsite = (inserted || []).filter(p => p.website);
    if (withWebsite.length > 0) {
      toast.info(`Extrayendo emails y WhatsApp de ${withWebsite.length} webs…`);
      try {
        const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke('scrape-contacts', {
          body: { websites: withWebsite.map(p => ({ id: p.id, url: p.website! })) },
        });

        if (scrapeError || !scrapeData?.success) {
          console.warn('Scraping error:', scrapeError || scrapeData?.error);
          toast.error('Error al extraer contactos de las webs');
          return;
        }

        // Update each prospect with scraped data
        const updates = Object.entries(scrapeData.results as Record<string, { email: string | null; whatsapp: string | null; instagram: string | null; facebook: string | null; linkedin: string | null; tiktok: string | null }>);
        let found = 0;
        for (const [id, contact] of updates) {
          if (contact.email || contact.whatsapp || contact.instagram || contact.facebook || contact.linkedin || contact.tiktok) {
            found++;
            await supabase.from('prospects').update({
              email: contact.email,
              whatsapp: contact.whatsapp,
              instagram: contact.instagram,
              facebook: contact.facebook,
              linkedin: contact.linkedin,
              tiktok: contact.tiktok,
            }).eq('id', id);
          }
        }

        if (found > 0) {
          toast.success(`Se encontraron datos de contacto en ${found} webs`);
          fetchProspects();
        } else {
          toast.info('No se encontraron emails ni WhatsApp en las webs');
        }
      } catch (err) {
        console.warn('Scrape failed:', err);
      }
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-heading lime-dot">Prospección</h1>
          <p className="text-body text-sm mt-1">Encuentra y exporta prospectos por zona geográfica</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={scrapeAllContacts} disabled={scraping} variant="outline" className="rounded-xl font-semibold">
            {scraping
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {scrapeProgress}</>
              : <><Globe className="h-4 w-4 mr-2" /> Extraer contactos</>
            }
          </Button>
          <Button onClick={() => handleExport(filtered)} className="rounded-xl bg-primary text-primary-foreground font-semibold">
            <Download className="h-4 w-4 mr-2" /> Exportar .xlsx
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-200px)]">
        {/* Map */}
        <div className="lg:col-span-3 rounded-2xl bg-card border border-border shadow-card overflow-hidden relative">
          <ProspectingMap
            businessType={searchType}
            city={searchCity}
            onSearchResults={handleMapResults}
            onSearchStart={() => setMapSearching(true)}
            triggerSearch={searchTrigger}
          />
          <div className="absolute top-4 right-4 bg-card rounded-xl border border-border p-4 shadow-card w-64 z-10">
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-heading">Tipo de negocio</Label>
                <select
                  value={searchType}
                  onChange={e => setSearchType(e.target.value)}
                  className="w-full h-9 rounded-[10px] bg-muted border border-border px-3 text-sm mt-1"
                >
                  {businessTypes.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-heading">Ciudad</Label>
                <Input
                  value={searchCity}
                  onChange={e => setSearchCity(e.target.value)}
                  placeholder="Madrid"
                  className="rounded-[10px] bg-muted border-border mt-1 h-9 text-sm"
                />
              </div>
              <Button
                className="w-full rounded-xl bg-primary text-primary-foreground font-semibold h-9 text-sm"
                disabled={mapSearching || !searchCity.trim()}
                onClick={() => setSearchTrigger(prev => prev + 1)}
              >
                {mapSearching
                  ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Buscando…</>
                  : <><Search className="h-3.5 w-3.5 mr-2" /> Buscar en Zona</>
                }
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border shadow-card overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-bold text-heading">{filtered.length} resultados encontrados</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setFilterRating(!filterRating)} className={cn("text-xs px-3 py-1 rounded-full border transition-colors", filterRating ? "bg-primary text-primary-foreground border-primary" : "border-border text-body hover:border-primary/30")}>⭐ +4 estrellas</button>
              <button onClick={() => setFilterPhone(!filterPhone)} className={cn("text-xs px-3 py-1 rounded-full border transition-colors", filterPhone ? "bg-primary text-primary-foreground border-primary" : "border-border text-body hover:border-primary/30")}>📞 Con teléfono</button>
              <button onClick={() => setFilterWeb(!filterWeb)} className={cn("text-xs px-3 py-1 rounded-full border transition-colors", filterWeb ? "bg-primary text-primary-foreground border-primary" : "border-border text-body hover:border-primary/30")}>🌐 Con web</button>
            </div>
          </div>

          {selected.size > 0 && (
            <div className="px-5 py-2 bg-primary/5 border-b border-border flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">{selected.size} seleccionados</span>
              <Button size="sm" onClick={handleBulkAddToCrm} className="rounded-lg text-xs h-7 bg-primary text-primary-foreground">
                <Plus className="h-3 w-3 mr-1" /> Al CRM
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleExport(filtered.filter(p => selected.has(p.id)))} className="rounded-lg text-xs h-7">
                <Download className="h-3 w-3 mr-1" /> Exportar
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-10 w-10 text-primary/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No hay prospectos aún</p>
                <p className="text-xs text-muted-foreground mt-1">Dibuja un polígono en el mapa y busca</p>
              </div>
            ) : (
              <>
                <div className="px-5 py-2 flex items-center gap-2">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded" />
                  <span className="text-xs text-muted-foreground">Seleccionar todos</span>
                </div>
                {filtered.map(r => (
                  <div key={r.id} className="px-5 py-3 hover:bg-primary/5 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="rounded mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-bold text-heading">{r.business_name}</p>
                            <p className="text-xs text-muted-foreground">{r.category || '—'} · {r.address || r.city || '—'}</p>
                            {r.phone && <p className="text-xs text-body mt-1">📞 {r.phone}</p>}
                            {(r as any).email && <p className="text-xs text-body">✉️ {(r as any).email}</p>}
                            {(r as any).whatsapp && <p className="text-xs text-body">💬 {(r as any).whatsapp}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            {r.rating !== null && <span className="text-sm font-bold text-warning">⭐ {Number(r.rating).toFixed(1)}</span>}
                            {r.review_count !== null && <p className="text-xs text-muted-foreground">{r.review_count} reviews</p>}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {r.added_to_crm ? (
                            <span className="text-xs text-primary font-medium flex items-center gap-1"><Check className="h-3 w-3" /> En CRM</span>
                          ) : (
                            <button onClick={() => handleAddToCrm(r)} disabled={addingToCrm === r.id} className="text-xs text-secondary font-medium hover:underline flex items-center gap-1">
                              {addingToCrm === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Al CRM
                            </button>
                          )}
                          {r.website && (
                            <a href={r.website.startsWith('http') ? r.website : `https://${r.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-medium hover:underline">🌐 Web</a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Prospecting;
