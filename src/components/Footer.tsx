import React from 'react';
import { Instagram, Linkedin, Twitter, Mail, Phone, MapPin, ArrowUp } from 'lucide-react';
import musaLogoFooter from '@/assets/musa-logo-footer.png';
import { Button } from '@/components/ui/button';
const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  const quickLinks = [{
    label: 'Inicio',
    href: '#inicio'
  }, {
    label: 'Módulos',
    href: '#servicios'
  }, {
    label: 'Backstage',
    href: '#backstage'
  }, {
    label: 'Beneficios',
    href: '#beneficios'
  }, {
    label: 'FAQ',
    href: '#faq'
  }, {
    label: 'Contacto',
    href: '#contacto'
  }];
  const services = ['CRM Pipeline', 'Prospección geográfica', 'Telefonía VoIP', 'Email Campaigns', 'Dashboard en vivo', 'Backstage', 'Knowledge Base', 'Automatizaciones IA'];
  const socialLinks = [{
    icon: Instagram,
    href: 'https://instagram.com/musacreativo',
    label: 'Instagram'
  }, {
    icon: Linkedin,
    href: 'https://linkedin.com/company/musacreativo',
    label: 'LinkedIn'
  }];
  const handleNavClick = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };
  return <footer className="bg-musa-dark text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-1 flex flex-col items-start">
            <div className="mb-2 w-full flex justify-start">
              <img
                src={musaLogoFooter}
                alt="Musa Equipo Creativo"
                className="h-44 w-auto block -ml-10 md:-ml-12"
              />
            </div>
            <p className="text-musa-gray leading-relaxed mb-6 text-left">
              El motor comercial que orquesta tu equipo.<br />Un producto de Musa · Equipo Creativo.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map(social => <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} className="w-10 h-10 bg-musa-gray/20 rounded-lg flex items-center justify-center hover:bg-musa-green hover:text-musa-dark transition-all duration-300">
                  <social.icon className="w-5 h-5" aria-hidden="true" />
                </a>)}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-6">Navegación</h4>
            <ul className="space-y-3">
              {quickLinks.map(link => <li key={link.label}>
                  <button onClick={() => handleNavClick(link.href)} className="text-musa-gray hover:text-musa-green transition-colors duration-300">
                    {link.label}
                  </button>
                </li>)}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-bold mb-6">Módulos</h4>
            <ul className="space-y-3">
              {services.map(service => <li key={service}>
                  <span className="text-musa-gray hover:text-musa-green transition-colors duration-300 cursor-pointer">
                    {service}
                  </span>
                </li>)}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-bold mb-6">Contacto</h4>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-musa-green" />
                <a href="mailto:hola@musacreativo.com" className="text-musa-gray hover:text-white transition-colors">
                  hola@musacreativo.com
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-musa-green" />
                <a href="tel:+34681811671" className="text-musa-gray hover:text-white transition-colors">
                  +34 681 811 671
                </a>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-musa-green mt-1" />
                <div className="text-musa-gray">
                  <div>Madrid, España</div>
                  <div>Miami, USA</div>
                  <div>Caracas, Venezuela</div>
                </div>
              </div>
            </div>

            {/* Demo CTA */}
            <div className="mt-8">
              <h5 className="font-semibold mb-3">¿Listo para verlo en acción?</h5>
              <p className="text-sm text-musa-gray mb-3">Agenda una demo de 20 minutos de Musa Hub.</p>
              <Button size="sm" className="bg-musa-green hover:bg-musa-green/90 text-musa-dark font-semibold px-4" onClick={() => handleNavClick('#contacto')}>
                Solicitar demo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-musa-gray/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-musa-gray">
              <span>© {new Date().getFullYear()} Musa Equipo Creativo. Todos los derechos reservados.</span>
            </div>
            
            <button onClick={scrollToTop} aria-label="Volver arriba" className="w-10 h-10 bg-musa-green rounded-lg flex items-center justify-center text-musa-dark hover:bg-musa-green/90 transition-all duration-300 hover:scale-110">
              <ArrowUp className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;