import React from 'react';
import {
  KanbanSquare,
  MapPin,
  Phone,
  Mail,
  LayoutDashboard,
  Bot,
  BookOpen,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import TiltCard from '@/components/motion/TiltCard';
import { Reveal } from '@/components/motion/Reveal';

interface Service {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  accent: 'green' | 'blue';
}

const ACCENT_STYLES = {
  green: {
    iconWrap: 'bg-musa-green/15 text-musa-dark group-hover:bg-musa-green/25',
    ring: 'ring-1 ring-musa-green/30',
  },
  blue: {
    iconWrap: 'bg-musa-blue/15 text-musa-dark group-hover:bg-musa-blue/25',
    ring: 'ring-1 ring-musa-blue/30',
  },
} as const;

const Services = () => {
  const plugin = React.useRef(Autoplay({
    delay: 3000,
    stopOnInteraction: true
  }));
  const services: Service[] = [{
    icon: KanbanSquare,
    title: 'CRM Pipeline',
    description: 'Vista Kanban con etapas configurables y código de color. Asignación automática de leads y tracking de cada actividad.',
    features: ['Etapas configurables', 'Asignación automática de leads', 'Tracking de actividad', 'Filtros por agente y periodo'],
    accent: 'green'
  }, {
    icon: MapPin,
    title: 'Prospección geográfica',
    description: 'Dibuja polígonos sobre Google Maps, genera PINs seguros y enriquece contactos automáticamente. El mapa se vuelve pipeline.',
    features: ['Búsqueda por polígonos', 'PINs seguros', 'Enriquecimiento de contactos', 'Sobre Google Maps'],
    accent: 'blue'
  }, {
    icon: Phone,
    title: 'Calls Analytics',
    description: 'Telefonía VoIP nativa con Zadarma: estados, duración y grabaciones. Llamada válida = contestada y ≥ 60 s, marcada sola.',
    features: ['Integración Zadarma', 'Grabaciones y estados', 'Validez automática ≥ 60 s', 'Métricas por agente'],
    accent: 'green'
  }, {
    icon: Mail,
    title: 'Email Campaigns',
    description: 'Secuencias multi-step programadas y envío como hilo, con métricas Brevo en tiempo real y objetivos diarios.',
    features: ['Secuencias multi-step', 'Envío como hilo', 'Métricas Brevo', 'Aperturas, clicks y bounces'],
    accent: 'blue'
  }, {
    icon: LayoutDashboard,
    title: 'Dashboard en vivo',
    description: 'KPIs diarios, feed de actividad en tiempo real y progreso por agente contra objetivos reales: 60 llamadas, 20 emails, 10 válidas.',
    features: ['KPIs en tiempo real', 'Feed de actividad', 'Progreso por agente', 'Objetivos diarios'],
    accent: 'green'
  }, {
    icon: Bot,
    title: 'Backstage',
    description: 'Convierte tus workflows de n8n en agentes vivos que puedes ver trabajar: Grid, Orbit y Pixel Office en tiempo real.',
    features: ['Grid View', 'Orbit View pixel-art', 'Pixel Office isométrica', 'Workflows n8n como agentes'],
    accent: 'blue'
  }, {
    icon: BookOpen,
    title: 'Knowledge Base',
    description: 'Categorías, permisos por autor y búsqueda fuzzy. Todo el saber comercial del equipo, accesible y a un clic.',
    features: ['Categorías', 'Permisos por autor', 'Búsqueda fuzzy', 'Saber centralizado'],
    accent: 'green'
  }, {
    icon: Workflow,
    title: 'Automatizaciones',
    description: 'Orquestadas con n8n y agentes de IA: callbacks en tiempo real, enriquecimiento y disparos con variables dinámicas.',
    features: ['Webhooks bidireccionales', 'Agentes de IA', 'Callbacks en tiempo real', 'Variables dinámicas'],
    accent: 'blue'
  }];
  return <section id="servicios" className="py-20 bg-gradient-to-br from-musa-light to-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <Reveal className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.2em] uppercase text-musa-gray mb-4">
            Módulos
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-musa-dark mb-6">
            Todo tu ciclo comercial.{' '}
            <span className="musa-gradient-text">En una sola plataforma</span>
          </h2>
        </Reveal>

        {/* Services Carousel */}
        <Reveal className="max-w-7xl mx-auto">
          <Carousel opts={{
          align: "start",
          loop: true
        }} plugins={[plugin.current]} className="w-full">
            <CarouselContent className="-ml-4 py-2">
              {services.map((service) => {
                const accent = ACCENT_STYLES[service.accent];
                const Icon = service.icon;
                return <CarouselItem key={service.title} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                  <TiltCard className="h-full">
                    <Card className="group h-full border border-musa-dark/5 bg-white/85 backdrop-blur-sm transition-shadow duration-500 hover:shadow-2xl">
                      <CardHeader className="pb-4">
                        <div className={`w-14 h-14 rounded-xl ${accent.iconWrap} ${accent.ring} flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110`}>
                          <Icon className="w-7 h-7" strokeWidth={1.75} aria-hidden="true" />
                        </div>
                        <CardTitle className="text-xl font-bold text-musa-dark group-hover:text-musa-blue transition-colors duration-300">
                          {service.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-musa-gray leading-relaxed">
                          {service.description}
                        </p>
                        <ul className="space-y-2">
                          {service.features.map((feature) => <li key={feature} className="flex items-center text-sm text-musa-gray">
                              <span className="w-1.5 h-1.5 bg-musa-green rounded-full mr-3" aria-hidden="true" />
                              {feature}
                            </li>)}
                        </ul>
                      </CardContent>
                    </Card>
                  </TiltCard>
                </CarouselItem>;
              })}
            </CarouselContent>
            <CarouselPrevious className="left-0" aria-label="Servicio anterior" />
            <CarouselNext className="right-0" aria-label="Servicio siguiente" />
          </Carousel>
        </Reveal>

      </div>
    </section>;
};
export default Services;
