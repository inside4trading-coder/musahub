import { Reveal } from '@/components/motion/Reveal';
import React from 'react';
import { LayoutGrid, Orbit, Building2, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import TiltCard from '@/components/motion/TiltCard';
import BackstageCanvas from '@/components/BackstageCanvas';

interface View {
  icon: LucideIcon;
  title: string;
  description: string;
}

const Portfolio = () => {
  const views: View[] = [
    {
      icon: LayoutGrid,
      title: 'Grid View',
      description:
        'El listado clásico: cada workflow con su detalle, sus triggers y sus integraciones a la vista.',
    },
    {
      icon: Orbit,
      title: 'Orbit View',
      description:
        'Un sistema solar pixel-art donde cada agente es un planeta que orbita según su estado.',
    },
    {
      icon: Building2,
      title: 'Pixel Office',
      description:
        'Una oficina isométrica donde cada agente se mueve, lee, trabaja o patrulla según su trigger.',
    },
  ];

  return (
    <section id="backstage" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <Reveal className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.2em] uppercase text-musa-gray mb-4">
            El diferenciador
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-musa-dark mb-4">
            Tus automatizaciones, como{' '}
            <span className="musa-gradient-text">agentes que puedes ver trabajar</span>
          </h2>
          <p className="text-lg text-musa-gray leading-relaxed">
            El Backstage convierte tus workflows de n8n en personajes vivos. La caja negra de la
            automatización, por fin transparente —y francamente, espectacular.
          </p>
        </Reveal>

        {/* Visual — orbit of agents inside the brand gradient frame */}
        <Reveal className="max-w-4xl mx-auto mb-12">
          <div className="rounded-3xl overflow-hidden musa-shadow bg-gradient-to-br from-musa-green to-musa-blue p-1.5">
            <div
              className="relative rounded-[1.25rem] overflow-hidden bg-musa-dark aspect-video"
              role="img"
              aria-label="Animación 3D: agentes de IA orbitando el núcleo de Musa Hub, con datos viajando por sus conexiones"
            >
              <div
                className="absolute inset-0 opacity-40"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    'radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1.5px)',
                  backgroundSize: '26px 26px',
                }}
              />
              <BackstageCanvas />
            </div>
          </div>
        </Reveal>

        {/* Three views */}
        <Reveal className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {views.map((view) => {
            const Icon = view.icon;
            return (
              <TiltCard key={view.title} className="h-full">
                <Card className="group h-full border border-musa-dark/5 bg-white/85 backdrop-blur-sm transition-shadow duration-500 hover:shadow-2xl">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 rounded-xl bg-musa-green/15 ring-1 ring-musa-green/30 text-musa-dark flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
                      <Icon className="w-7 h-7" strokeWidth={1.75} aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-bold text-musa-dark mb-2 group-hover:text-musa-blue transition-colors duration-300">
                      {view.title}
                    </h3>
                    <p className="text-musa-gray leading-relaxed">{view.description}</p>
                  </CardContent>
                </Card>
              </TiltCard>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
};

export default Portfolio;
