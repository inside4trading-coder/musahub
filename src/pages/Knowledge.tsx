import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Search, FileText, Clock, Loader2, Trash2, Edit3, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Article = Tables<'kb_articles'>;

const defaultCategories = ['Procesos', 'Plantillas', 'Clientes', 'Técnico', 'Ventas'];

const Knowledge = () => {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Procesos');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'Procesos', content: '', tags: '', published: true });

  const fetchArticles = useCallback(async () => {
    const { data, error } = await supabase
      .from('kb_articles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Error al cargar artículos');
    } else {
      setArticles(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  // Category counts from real data
  const categoryCounts = defaultCategories.map(name => ({
    name,
    count: articles.filter(a => a.category === name).length,
  }));

  const filtered = articles.filter(a =>
    a.category === selectedCategory &&
    (a.title.toLowerCase().includes(search.toLowerCase()) ||
     (a.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase())))
  );

  const estimateReadTime = (content: string | null) => {
    if (!content) return '1 min';
    const words = content.split(/\s+/).length;
    return `${Math.max(1, Math.round(words / 200))} min`;
  };

  const handleCreate = async () => {
    if (!user) return;
    setSaving(true);
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const { error } = await supabase.from('kb_articles').insert({
      title: form.title,
      category: form.category,
      content: form.content || null,
      tags,
      slug,
      published: form.published,
      author_id: user.id,
    });

    if (error) {
      toast.error('Error al crear artículo');
    } else {
      toast.success('Artículo creado');
      setShowNew(false);
      setForm({ title: '', category: 'Procesos', content: '', tags: '', published: true });
      fetchArticles();
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!selectedArticle) return;
    setSaving(true);
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);

    const { error } = await supabase.from('kb_articles').update({
      title: form.title,
      category: form.category,
      content: form.content || null,
      tags,
      published: form.published,
    }).eq('id', selectedArticle.id);

    if (error) {
      toast.error('Error al actualizar');
    } else {
      toast.success('Artículo actualizado');
      setEditing(false);
      fetchArticles();
      setSelectedArticle(prev => prev ? { ...prev, title: form.title, category: form.category, content: form.content, tags, published: form.published } : null);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('kb_articles').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar');
    } else {
      toast.success('Artículo eliminado');
      setSelectedArticle(null);
      fetchArticles();
    }
  };

  const startEditing = () => {
    if (!selectedArticle) return;
    setForm({
      title: selectedArticle.title,
      category: selectedArticle.category,
      content: selectedArticle.content || '',
      tags: (selectedArticle.tags || []).join(', '),
      published: selectedArticle.published ?? true,
    });
    setEditing(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-heading lime-dot">Knowledge Base</h1>
          <p className="text-body text-sm mt-1">Documentación y recursos del equipo</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-primary text-primary-foreground font-semibold">
              <Plus className="h-4 w-4 mr-2" /> Nuevo Artículo
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-lg">
            <div className="h-1 gradient-accent rounded-full -mt-2 mb-4" />
            <DialogHeader>
              <DialogTitle className="text-heading">Nuevo Artículo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-heading">Título *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-heading">Categoría *</Label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full h-10 rounded-[10px] bg-muted border border-border px-3 text-sm mt-1">
                    {defaultCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-heading">Tags (separados por coma)</Label>
                  <Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="guía, ventas" className="rounded-[10px] bg-muted border-border mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-heading">Contenido</Label>
                <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} className="rounded-[10px] bg-muted border-border mt-1" rows={8} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.published} onChange={e => setForm(p => ({ ...p, published: e.target.checked }))} className="rounded" />
                <Label className="text-xs text-body">Publicar inmediatamente</Label>
              </div>
              <Button onClick={handleCreate} disabled={!form.title || saving} className="w-full rounded-xl bg-primary text-primary-foreground font-semibold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Crear Artículo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar artículos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-[10px] bg-muted border-border" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-card h-fit">
          <p className="label-style mb-3">Categorías</p>
          <div className="space-y-1">
            {categoryCounts.map(cat => (
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
            {filtered.map((article) => (
              <div
                key={article.id}
                onClick={() => { setSelectedArticle(article); setEditing(false); }}
                className={cn(
                  "rounded-2xl bg-card border border-border p-5 shadow-card card-hover cursor-pointer",
                  selectedArticle?.id === article.id && "border-primary/30 shadow-card-hover"
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
                    <Clock className="h-3 w-3" /> {estimateReadTime(article.content)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(article.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
                <div className="flex gap-1 mt-2">
                  {(article.tags || []).map(t => (
                    <span key={t} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Article preview / edit */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card h-fit">
          {selectedArticle ? (
            editing ? (
              <div className="space-y-3">
                <div className="h-1 gradient-accent rounded-full mb-4" />
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="rounded-[10px] bg-muted border-border font-bold" />
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full h-9 rounded-[10px] bg-muted border border-border px-3 text-sm">
                  {defaultCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="Tags separados por coma" className="rounded-[10px] bg-muted border-border text-sm" />
                <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} className="rounded-[10px] bg-muted border-border text-sm" rows={10} />
                <div className="flex gap-2">
                  <Button onClick={handleUpdate} disabled={saving} size="sm" className="rounded-xl bg-primary text-primary-foreground font-semibold flex-1">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                    Guardar
                  </Button>
                  <Button onClick={() => setEditing(false)} size="sm" variant="outline" className="rounded-xl">Cancelar</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="h-1 gradient-accent rounded-full mb-4" />
                <h2 className="text-lg font-bold text-heading">{selectedArticle.title}</h2>
                <div className="flex items-center gap-3 mt-2 mb-4">
                  <span className="text-xs text-muted-foreground">{selectedArticle.category}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(selectedArticle.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
                <div className="prose prose-sm text-body whitespace-pre-wrap text-sm">
                  {selectedArticle.content || <span className="text-muted-foreground italic">Sin contenido</span>}
                </div>
                <div className="flex gap-2 mt-6">
                  <Button onClick={startEditing} size="sm" variant="outline" className="rounded-xl">
                    <Edit3 className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button onClick={() => handleDelete(selectedArticle.id)} size="sm" variant="outline" className="rounded-xl text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                  </Button>
                </div>
              </>
            )
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
