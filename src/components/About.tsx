import { Reveal } from '@/components/motion/Reveal';
import React from 'react';
import {
  MapPin,
  PhoneCall,
  LayoutDashboard,
  Boxes,
  Bot,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import TiltCard from '@/components/motion/TiltCard';

interface Insight {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: 'green' | 'blue';
}

interface RoleBenefit {
  role: string;
  benefit: string;
}

const ACCENT = {
  green: 'bg-musa-green/15 ring-1 ring-musa-green/30',
  blue: 'bg-musa-blue/15 ring-1 ring-musa-blue/30',
} as const;

const About = () => {
  const insights: Insight[] = [
    {
      icon: MapPin,
      title: 'El mapa es tu pipeline',
      description:
        'La prospección por polígonos llena el CRM sin copiar y pegar. Tu equipo dedica el tiempo a vender, no a buscar fichas una por una.',
      accent: 'green',
    },
    {
      icon: PhoneCall,
      title: 'Solo cuentan las llamadas reales',
      description:
        'La validez automática —contestada y ≥ 60 s— separa el ruido del trabajo que de verdad mueve el pipeline. Sin maquillar números.',
      accent: 'blue',
    },
    {
      icon: LayoutDashboard,
      title: 'Objetivos claros, cada día',
      description:
        '60 llamadas, 20 emails, 10 válidas. Cada agente sabe su número y lo ve avanzar en vivo en el Dashboard.',
      accent: 'green',
    },
    {
      icon: Boxes,
      title: 'Una sola fuente de verdad',
      description:
        'CRM, llamadas, email y mapa comparten los mismos datos y los mismos agentes. Nada se pierde entre cinco herramientas distintas.',
      accent: 'blue',
    },
    {
      icon: Bot,
      title: 'La IA, visible y bajo control',
      description:
        'El Backstage muestra a tus agentes de automatización trabajando en tiempo real. Potencia de IA, sin caja negra.',
      accent: 'green',
    },
    {
      icon: TrendingUp,
      title: 'Del primer pin a la llamada cerrada',
      description:
        'Un flujo continuo: prospecta, conecta y cierra sin fricción. El mismo lenguaje visual de principio a fin.',
      accent: 'blue',
    },
  ];

  const roles: RoleBenefit[] = [
    {
      role: 'SDRs',
      benefit: 'Prospectan por territorio y llenan el pipeline más rápido, sin trabajo manual.',
    },
    {
      role: 'Closers',
      benefit: 'Llegan a cada llamada con todo el contexto del lead y su historial a la vista.',
    },
    {
      role: 'Managers',
      benefit: 'Ven la actividad, los objetivos y los resultados del equipo en tiempo real.',
    },
  ];

  return (
    <section id="beneficios" className="py-20 bg-gradient-to-br from-musa-light to-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <Reveal className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.2em] uppercase text-musa-gray mb-4">
            Beneficios
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-musa-dark mb-6">
            Cómo Musa Hub ayuda a{' '}
            <span className="musa-gradient-text">tu equipo comercial</span>
          </h2>
          <p className="text-xl text-musa-gray leading-relaxed">
            No son funcionalidades sueltas: son los insights que hacen que un equipo pequeño
            rinda como uno grande.
          </p>
        </Reveal>

        {/* Insight cards */}
        <Reveal className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {insights.map((insight) => {
            const Icon = insight.icon;
            return (
              <TiltCard key={insight.title} className="h-full">
                <Card className="group h-full border border-musa-dark/5 bg-white/85 backdrop-blur-sm transition-shadow duration-500 hover:shadow-2xl">
                  <CardContent className="p-6">
                    <div
                      className={`w-14 h-14 rounded-xl ${ACCENT[insight.accent]} text-musa-dark flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}
                    >
                      <Icon className="w-7 h-7" strokeWidth={1.75} aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-bold text-musa-dark mb-2 group-hover:text-musa-blue transition-colors duration-300">
                      {insight.title}
                    </h3>
                    <p className="text-musa-gray leading-relaxed">{insight.description}</p>
                  </CardContent>
                </Card>
              </TiltCard>
            );
          })}
        </Reveal>

        {/* Per-role benefits */}
        <Reveal className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-6 mb-16">
          {roles.map((r) => (
            <div
              key={r.role}
              className="rounded-2xl border border-musa-dark/5 bg-white/70 backdrop-blur-sm p-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-musa-green" aria-hidden="true" />
                <span className="text-sm font-bold uppercase tracking-wider text-musa-blue">
                  {r.role}
                </span>
              </div>
              <p className="text-musa-gray leading-relaxed">{r.benefit}</p>
            </div>
          ))}
        </Reveal>

        {/* Closing statement */}
        <Reveal className="text-center bg-gradient-to-r from-musa-green to-musa-blue rounded-3xl p-12 text-white musa-shadow">
          <h3 className="text-3xl font-bold mb-6 text-white">
            Tu equipo pequeño, rindiendo como uno grande.
          </h3>
          <p className="text-xl leading-relaxed max-w-3xl mx-auto text-white/90">
            Musa Hub centraliza todo el ciclo comercial —del primer pin en el mapa a la llamada
            cerrada— en una única interfaz coherente, rápida y orquestada por agentes de IA.
          </p>
        </Reveal>
      </div>
    </section>
  );
};

export default About;
