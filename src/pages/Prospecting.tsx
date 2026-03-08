import { motion } from 'framer-motion';
import { Map, Search, Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const mockResults = [
  { name: 'Restaurante El Mirador', category: 'Restaurante', address: 'Calle Gran Vía 12, Madrid', phone: '+34 91 234 5678', rating: 4.5, reviews: 230, website: 'elmirador.es' },
  { name: 'Hotel Puerta del Sol', category: 'Hotel', address: 'Plaza Mayor 5, Madrid', phone: '+34 91 345 6789', rating: 4.2, reviews: 184, website: 'hotelpuertadelsol.com' },
  { name: 'Gimnasio FitZone', category: 'Gimnasio', address: 'Av. de la Constitución 34, Madrid', phone: '+34 91 456 7890', rating: 4.7, reviews: 89, website: '' },
  { name: 'Clínica Dental Sonríe', category: 'Clínica', address: 'Calle Serrano 21, Madrid', phone: '+34 91 567 8901', rating: 4.8, reviews: 156, website: 'sonrie.es' },
  { name: 'Peluquería Style', category: 'Peluquería', address: 'Calle Velázquez 8, Madrid', phone: '', rating: 4.1, reviews: 45, website: '' },
];

const Prospecting = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-heading lime-dot">Prospección</h1>
          <p className="text-body text-sm mt-1">Encuentra y exporta prospectos por zona geográfica</p>
        </div>
        <Button className="rounded-xl bg-primary text-primary-foreground font-semibold">
          <Download className="h-4 w-4 mr-2" /> Exportar .xlsx
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-200px)]">
        {/* Map placeholder */}
        <div className="lg:col-span-3 rounded-2xl bg-card border border-border shadow-card overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center gradient-hero">
            <div className="text-center">
              <Map className="h-16 w-16 text-primary/30 mx-auto mb-4" />
              <p className="text-heading font-semibold">Google Maps</p>
              <p className="text-sm text-muted-foreground mt-1">Configura tu API key de Google Maps para activar el mapa interactivo</p>
              <p className="text-xs text-muted-foreground mt-3">VITE_GOOGLE_MAPS_API_KEY</p>
            </div>
          </div>
          {/* Search controls overlay */}
          <div className="absolute top-4 right-4 bg-card rounded-xl border border-border p-4 shadow-card w-64 z-10">
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-heading">Tipo de negocio</Label>
                <select className="w-full h-9 rounded-[10px] bg-muted border border-border px-3 text-sm mt-1">
                  <option>Restaurantes</option>
                  <option>Hoteles</option>
                  <option>Gimnasios</option>
                  <option>Peluquerías</option>
                  <option>Clínicas</option>
                  <option>Tiendas retail</option>
                  <option>Inmobiliarias</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-heading">Ciudad</Label>
                <Input placeholder="Madrid" className="rounded-[10px] bg-muted border-border mt-1 h-9 text-sm" />
              </div>
              <Button className="w-full rounded-xl bg-primary text-primary-foreground font-semibold h-9 text-sm" disabled>
                <Search className="h-3.5 w-3.5 mr-2" /> Buscar en Zona
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border shadow-card overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-bold text-heading">{mockResults.length} resultados encontrados</p>
            <div className="flex gap-2 mt-2">
              {['⭐ +4 estrellas', '📞 Con teléfono', '🌐 Con web'].map(f => (
                <button key={f} className="text-xs px-3 py-1 rounded-full border border-border hover:border-primary/30 text-body transition-colors">{f}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {mockResults.map((r, i) => (
              <div key={i} className="px-5 py-3 hover:bg-lime-light/30 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-heading">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.category} · {r.address}</p>
                    {r.phone && <p className="text-xs text-body mt-1">{r.phone}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-warning">⭐ {r.rating}</span>
                    <p className="text-xs text-muted-foreground">{r.reviews} reviews</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="text-xs text-primary font-medium hover:underline">📍 Ver mapa</button>
                  <button className="text-xs text-secondary font-medium hover:underline flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Al CRM
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Prospecting;
