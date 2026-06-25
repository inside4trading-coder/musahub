import React from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HeroCanvas from '@/components/HeroCanvas';
import Magnetic from '@/components/motion/Magnetic';

const scrollTo = (selector: string) => {
  const element = document.querySelector(selector);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

const Hero = () => {
  return (
    <section id="inicio" className="min-h-screen flex items-center relative overflow-hidden">
      {/* Escena 3D (lazy) con fallback de gradiente estático */}
      <HeroCanvas />

      {/* Velo de legibilidad sobre el lado del contenido */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/40 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl space-y-8 animate-fade-up py-32">
          <span className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.2em] uppercase text-musa-dark/70">
            <span className="w-8 h-px bg-musa-dark/40" aria-hidden="true" />
            Musa Hub · Plataforma comercial
          </span>

          <h1 className="text-5xl lg:text-7xl font-bold text-musa-dark leading-[1.05] tracking-tight">
            Del primer{' '}
            <span className="musa-gradient-text">pin en el mapa</span>
            <br />
            a la{' '}
            <span className="musa-gradient-text">llamada cerrada.</span>
          </h1>

          <p className="text-xl text-musa-gray leading-relaxed max-w-xl">
            CRM, prospección geográfica, telefonía, email y automatizaciones — orquestados
            por agentes de IA que puedes ver trabajar en tiempo real. Tu equipo pequeño
            rinde como uno grande.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Magnetic>
              <Button
                onClick={() => scrollTo('#contacto')}
                size="lg"
                className="bg-musa-green hover:bg-musa-green/90 text-musa-dark font-semibold px-8 py-4 rounded-xl text-lg transition-colors duration-300 musa-shadow"
              >
                Solicitar demo
                <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
              </Button>
            </Magnetic>

            <Magnetic>
              <Button
                onClick={() => scrollTo('#servicios')}
                variant="outline"
                size="lg"
                className="border-2 border-musa-dark/20 bg-white/60 backdrop-blur-sm text-musa-dark hover:border-musa-blue hover:text-musa-blue px-8 py-4 rounded-xl text-lg transition-colors duration-300"
              >
                <Play className="mr-2 w-5 h-5" aria-hidden="true" />
                Ver los módulos
              </Button>
            </Magnetic>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
