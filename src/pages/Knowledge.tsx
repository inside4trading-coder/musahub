import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Search, FileText, Tag, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const categories = [
  { name: 'Procesos', count: 5 },
  { name: 'Plantillas', count: 3 },
  { name: 'Clientes', count: 8 },
  { name: 'Técnico', count: 4 },
  { name: 'Ventas', count: 6 },
];

const articles = [
  { title: 'Guía de onboarding de clientes', category: 'Procesos', tags: ['onboarding', 'guía'], date: '2024-03-10', readTime: '5 min', published: true },
  { title: 'Plantilla de propuesta comercial', category: 'Plantillas', tags: ['plantilla', 'ventas'], date: '2024-03-08', readTime: '3 min', published: true },
  { title: 'Configuración de chatbot WhatsApp', category: 'Técnico', tags: ['whatsapp', 'chatbot'], date: '2024-03-05', readTime: '8 min', published: true },
  { title: 'Proceso de facturación', category: 'Procesos', tags: ['facturación', 'admin'], date: '2024-03-01', readTime: '4 min', published: true },
  { title: 'Script de venta consultiva', category: 'Ventas', tags: ['ventas', 'script'], date: '2024-02-28', readTime: '6 min', published: false },
  { title: 'Notas cliente: Hotel Riverside', category: 'Clientes', tags: ['hotel', 'notas'], date: '2024-02-25', readTime: '2 min', published: true },
];

const Knowledge = () => {
  const [selectedCategory, setSelectedCategory] = useState('Procesos');
  const [selectedArticle, setSelectedArticle] = useState<typeof articles[0] | null>(null);
  const [search, setSearch] = useState('');

  const filtered = articles.filter(a =>
    a.category === selectedCategory &&
    (a.title.toLowerCase().includes(search.toLowerCase()) ||
     a.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-heading lime-dot">Knowledge Base</h1>
          <p className="text-body text-sm mt-1">Documentación y recursos del equipo</p>
        </div>
        <Button className="rounded-xl bg-primary text-primary-foreground font-semibold">
          <Plus className="h-4 w-4 mr-2" /> Nuevo Artículo
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar artículos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-[10px] bg-muted border-border"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-card h-fit">
          <p className="label-style mb-3">Categorías</p>
          <div className="space-y-1">
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={cn(
                  "w-full text-left flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  selectedCategory === cat.name
                    ? "bg-sidebar-accent text-heading font-semibold border-l-[3px] border-primary"
                    : "text-body hover:bg-muted"
                )}
              >
                {cat.name}
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{cat.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Articles */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-3">
            {filtered.length === 0 && (
              <div className="text-center py-12 rounded-2xl bg-card border border-border">
                <BookOpen className="h-10 w-10 text-primary/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No hay artículos en esta categoría</p>
              </div>
            )}
            {filtered.map((article, i) => (
              <div
                key={i}
                onClick={() => setSelectedArticle(article)}
                className={cn(
                  "rounded-2xl bg-card border border-border p-5 shadow-card card-hover cursor-pointer",
                  selectedArticle?.title === article.title && "border-primary/30 shadow-card-hover"
                )}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-bold text-heading">{article.title}</h3>
                  {!article.published && (
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">Borrador</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {article.readTime}
                  </span>
                  <span className="text-xs text-muted-foreground">{article.date}</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {article.tags.map(t => (
                    <span key={t} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Article preview */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card h-fit">
          {selectedArticle ? (
            <>
              <div className="h-1 gradient-accent rounded-full mb-4" />
              <h2 className="text-lg font-bold text-heading">{selectedArticle.title}</h2>
              <div className="flex items-center gap-3 mt-2 mb-4">
                <span className="text-xs text-muted-foreground">{selectedArticle.category}</span>
                <span className="text-xs text-muted-foreground">{selectedArticle.date}</span>
              </div>
              <div className="prose prose-sm text-body">
                <p>Contenido del artículo aparecerá aquí cuando se conecte a la base de datos.</p>
                <p className="text-muted-foreground text-xs mt-4">Instala @tiptap/react para el editor de contenido enriquecido.</p>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 text-primary/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Selecciona un artículo para ver su contenido</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Knowledge;
