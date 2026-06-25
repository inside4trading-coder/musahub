
import { Reveal } from '@/components/motion/Reveal';
import React, { useState } from 'react';
import { Send, MessageCircle, CalendarDays, Phone, Mail, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Contact = () => {
  const contactMethods = [
    {
      icon: MessageCircle,
      title: 'WhatsApp directo',
      description: 'Respuesta inmediata para consultas urgentes',
      action: 'Escribir ahora',
      link: 'https://wa.me/34681811671',
      color: 'bg-green-500'
    },
    {
      icon: CalendarDays,
      title: 'Demo guiada',
      description: 'Agenda 20 min y te mostramos Musa Hub en acción, sin compromiso',
      action: 'Reservar demo',
      link: 'https://calendly.com/hola-musacreativo/30min',
      color: 'bg-musa-blue'
    }
  ];

  const services = [
    'Demo de la plataforma completa',
    'CRM Pipeline',
    'Prospección geográfica',
    'Telefonía VoIP (Calls)',
    'Email Campaigns',
    'Dashboard y métricas',
    'Backstage / Automatizaciones',
    'Plan Agency (multi-tenant)'
  ];

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    service: '',
    budget: '',
    message: ''
  });

  const updateField = (field: keyof typeof formData) => (value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  // Sin backend propio: el formulario abre WhatsApp con el brief preformateado,
  // el canal de respuesta más rápido de la agencia.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = [
      `Hola Musa, soy ${formData.name}.`,
      formData.company && `Empresa: ${formData.company}`,
      `Email: ${formData.email}`,
      formData.phone && `Teléfono: ${formData.phone}`,
      formData.service && `Servicio de interés: ${formData.service}`,
      formData.budget && `Presupuesto estimado: ${formData.budget}`,
      '',
      `Proyecto: ${formData.message}`
    ].filter(Boolean);

    window.open(
      `https://wa.me/34681811671?text=${encodeURIComponent(lines.join('\n'))}`,
      '_blank',
      'noopener,noreferrer'
    );
    toast.success('Abriendo WhatsApp con tu propuesta lista para enviar');
  };

  return (
    <section id="contacto" className="pt-8 pb-12 bg-gradient-to-br from-musa-light to-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <Reveal className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-musa-dark mb-6">
            Lleva a tu equipo comercial{' '}
            <span className="musa-gradient-text">al siguiente nivel</span>
          </h2>
          <p className="text-xl text-musa-gray leading-relaxed">
            Agenda una demo de 20 minutos y descubre cómo Musa Hub convierte tu operación
            de ventas en una máquina coherente — del primer pin a la llamada cerrada.
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Methods */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-musa-dark mb-6">Conectemos</h3>
            
            {contactMethods.map((method, index) => (
              <Card 
                key={method.title}
                className="group hover:shadow-xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm animate-fade-up musa-hover-lift"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 ${method.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <method.icon className="w-6 h-6 text-white" strokeWidth={1.75} aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-musa-dark mb-2">{method.title}</h4>
                      <p className="text-musa-gray mb-4 leading-relaxed">{method.description}</p>
                      <Button 
                        variant="outline"
                        size="sm"
                        className="border-musa-blue text-musa-blue hover:bg-musa-blue hover:text-white"
                        onClick={() => window.open(method.link, '_blank')}
                      >
                        {method.action}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Contact Info */}
            <Card className="border-0 bg-gradient-to-br from-musa-green to-musa-blue text-white musa-shadow animate-fade-up">
              <CardContent className="p-6 space-y-4">
                <h4 className="text-xl font-bold mb-4">Información de contacto</h4>
                <a href="tel:+34681811671" className="flex items-center space-x-3 hover:underline">
                  <Phone className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
                  <span>+34 681 811 671</span>
                </a>
                <a href="mailto:hola@musacreativo.com" className="flex items-center space-x-3 hover:underline">
                  <Mail className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
                  <span>hola@musacreativo.com</span>
                </a>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>Madrid, España | Miami, USA | Caracas, Venezuela</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 bg-white/90 backdrop-blur-sm musa-shadow animate-fade-up">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-musa-dark">
                  Solicita tu demo
                </CardTitle>
                <p className="text-musa-gray">
                  Completa el formulario y te responderemos en menos de 24 horas para agendar tu demo de Musa Hub.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-musa-dark mb-2">
                        Nombre completo *
                      </label>
                      <Input
                        placeholder="Tu nombre"
                        autoComplete="name"
                        value={formData.name}
                        onChange={e => updateField('name')(e.target.value)}
                        className="border-gray-300 focus:border-musa-blue focus:ring-musa-blue/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-musa-dark mb-2">
                        Email *
                      </label>
                      <Input
                        type="email"
                        placeholder="tu@email.com"
                        autoComplete="email"
                        value={formData.email}
                        onChange={e => updateField('email')(e.target.value)}
                        className="border-gray-300 focus:border-musa-blue focus:ring-musa-blue/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-musa-dark mb-2">
                        Empresa
                      </label>
                      <Input
                        placeholder="Nombre de tu empresa"
                        autoComplete="organization"
                        value={formData.company}
                        onChange={e => updateField('company')(e.target.value)}
                        className="border-gray-300 focus:border-musa-blue focus:ring-musa-blue/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-musa-dark mb-2">
                        Teléfono
                      </label>
                      <Input
                        type="tel"
                        placeholder="+34 123 456 789"
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={e => updateField('phone')(e.target.value)}
                        className="border-gray-300 focus:border-musa-blue focus:ring-musa-blue/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-musa-dark mb-2">
                      Servicio de interés *
                    </label>
                    <Select required value={formData.service} onValueChange={updateField('service')}>
                      <SelectTrigger className="border-gray-300 focus:border-musa-blue focus:ring-musa-blue/20">
                        <SelectValue placeholder="Selecciona un servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service} value={service}>
                            {service}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-musa-dark mb-2">
                      Presupuesto estimado
                    </label>
                    <Select value={formData.budget} onValueChange={updateField('budget')}>
                      <SelectTrigger className="border-gray-300 focus:border-musa-blue focus:ring-musa-blue/20">
                        <SelectValue placeholder="Rango de inversión" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="€5,000 - €10,000">€5,000 - €10,000</SelectItem>
                        <SelectItem value="€10,000 - €25,000">€10,000 - €25,000</SelectItem>
                        <SelectItem value="€25,000 - €50,000">€25,000 - €50,000</SelectItem>
                        <SelectItem value="€50,000+">€50,000+</SelectItem>
                        <SelectItem value="Personalizado">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-musa-dark mb-2">
                      Cuéntanos sobre tu proyecto *
                    </label>
                    <Textarea
                      placeholder="Describe tu proyecto, objetivos, timeline y cualquier detalle que consideres importante..."
                      rows={5}
                      value={formData.message}
                      onChange={e => updateField('message')(e.target.value)}
                      className="border-gray-300 focus:border-musa-blue focus:ring-musa-blue/20"
                      required
                    />
                  </div>

                  <div className="flex items-start space-x-3">
                    <input 
                      type="checkbox" 
                      id="privacy"
                      className="mt-1 w-4 h-4 text-musa-blue border-gray-300 rounded focus:ring-musa-blue"
                      required
                    />
                    <label htmlFor="privacy" className="text-sm text-musa-gray leading-relaxed">
                      Acepto la política de privacidad y autorizo el tratamiento de mis datos para recibir 
                      información comercial de Musa Equipo Creativo.
                    </label>
                  </div>

                  <Button 
                    type="submit"
                    size="lg"
                    className="w-full bg-musa-green hover:bg-musa-green/90 text-musa-dark font-semibold py-4 rounded-xl text-lg transition-all duration-300 hover:scale-[1.02] musa-shadow"
                  >
                    Enviar por WhatsApp
                    <Send className="ml-2 w-5 h-5" aria-hidden="true" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom CTA */}
        <Reveal className="text-center mt-16">
          <div className="inline-flex items-center space-x-2 bg-musa-green/20 rounded-full px-6 py-3 mb-6">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-musa-dark font-medium">Respondemos en menos de 24 horas</span>
          </div>
          <p className="text-lg text-musa-gray max-w-2xl mx-auto">
            ¿Prefieres una llamada? Agenda directamente en nuestro calendario y hablemos 
            sobre cómo podemos transformar tu marca en una historia de éxito.
          </p>
        </Reveal>
      </div>
    </section>
  );
};

export default Contact;
