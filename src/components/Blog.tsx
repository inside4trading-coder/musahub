import { Reveal } from '@/components/motion/Reveal';
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQS = [
  {
    q: '¿Sobre qué stack funciona Musa Hub?',
    a: 'Se orquesta sobre herramientas que ya conoces: Supabase, automatizaciones con n8n, telefonía VoIP con Zadarma, email con Brevo, Google Maps para la prospección e IA (Gemini · GPT). Integra tu operación sin reinventar nada.',
  },
  {
    q: '¿Dónde viven nuestros datos?',
    a: 'En tu propia nube (Supabase), con autenticación y roles admin/team. Tú mantienes el control y la propiedad de la información comercial de tu equipo.',
  },
  {
    q: '¿Cómo se cuenta una llamada válida?',
    a: 'Una llamada es válida cuando fue contestada y duró 60 segundos o más. El criterio se aplica automáticamente, así que las métricas reflejan trabajo real, no actividad inflada.',
  },
  {
    q: '¿Qué es el Backstage?',
    a: 'Es la visualización en vivo de tus automatizaciones de n8n como agentes que puedes ver trabajar: Grid View, Orbit View pixel-art y Pixel Office isométrica. La automatización deja de ser una caja negra.',
  },
  {
    q: '¿Cuánto tarda la puesta en marcha?',
    a: 'Días, no meses. Activas los módulos que tu equipo necesita y la plataforma crece contigo. Sin instalación local: todo corre en la nube.',
  },
  {
    q: '¿Cuánto cuesta y hay permanencia?',
    a: 'El precio es a medida según los módulos y el volumen de tu equipo, sin permanencia. Lo definimos contigo en la demo. El plan Agency añade workspaces multi-tenant aislados.',
  },
];

const Blog = () => {
  return (
    <section id="faq" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <Reveal className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.2em] uppercase text-musa-gray mb-4">
            Preguntas frecuentes
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-musa-dark mb-4">
            Lo que tu equipo{' '}
            <span className="musa-gradient-text">quiere saber</span>
          </h2>
        </Reveal>

        <Reveal className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((item, index) => (
              <AccordionItem
                key={item.q}
                value={`item-${index}`}
                className="border border-musa-dark/10 rounded-2xl mb-4 px-6 bg-white/85 backdrop-blur-sm data-[state=open]:shadow-lg transition-shadow"
              >
                <AccordionTrigger className="text-left text-lg font-bold text-musa-dark hover:text-musa-blue hover:no-underline py-5">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-musa-gray leading-relaxed pb-5">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
};

export default Blog;
