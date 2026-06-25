import React, { useState, useEffect } from 'react';
import { Menu, X, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import musaLogo from '@/assets/musa-logo.png';

// Backoffice de Musa Hub (la app/CRM). Apuntamos a la raíz: la SPA enruta al login
// del lado del cliente. Entrar directo a /login da 404 (falta el rewrite de SPA en
// el proyecto del backoffice).
const BACKOFFICE_URL = 'https://musahub.vercel.app/';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const navItems = [{
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
  const handleNavClick = (href: string) => {
    setIsOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };
  return <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-[0_8px_32px_rgba(45,55,72,0.08)]' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <img alt="Musa Equipo Creativo" className="h-32 w-auto object-contain" src="/lovable-uploads/e87b74c9-6789-4dc0-80c5-f974a6bdc8bc.png" />
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-8">
            {navItems.map(item => <button key={item.label} onClick={() => handleNavClick(item.href)} className="text-musa-dark hover:text-musa-blue transition-colors duration-300 font-medium">
                {item.label}
              </button>)}
            <div className="flex items-center gap-3">
              <Button asChild variant="outline" className="border-musa-dark/20 text-musa-dark hover:border-musa-blue hover:text-musa-blue font-semibold px-5 py-2 rounded-lg transition-all duration-300">
                <a href={BACKOFFICE_URL} target="_blank" rel="noopener noreferrer">
                  <LogIn className="w-4 h-4 mr-2" aria-hidden="true" />
                  Acceder
                </a>
              </Button>
              <Button onClick={() => handleNavClick('#contacto')} className="bg-musa-green hover:bg-musa-green/90 text-musa-dark font-semibold px-6 py-2 rounded-lg transition-all duration-300 hover:scale-105">
                Solicitar demo
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button className="lg:hidden text-musa-dark" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && <div className="lg:hidden bg-white border-t border-gray-200 py-4 animate-fade-in">
            {navItems.map(item => <button key={item.label} onClick={() => handleNavClick(item.href)} className="block w-full text-left px-4 py-3 text-musa-dark hover:bg-musa-green/10 transition-colors duration-300">
                {item.label}
              </button>)}
            <div className="px-4 pt-4 space-y-3">
              <Button asChild variant="outline" className="w-full border-musa-dark/20 text-musa-dark font-semibold py-3 rounded-lg">
                <a href={BACKOFFICE_URL} target="_blank" rel="noopener noreferrer">
                  <LogIn className="w-4 h-4 mr-2" aria-hidden="true" />
                  Acceder al backoffice
                </a>
              </Button>
              <Button onClick={() => handleNavClick('#contacto')} className="w-full bg-musa-green hover:bg-musa-green/90 text-musa-dark font-semibold py-3 rounded-lg">
                Solicitar demo
              </Button>
            </div>
          </div>}
      </div>
    </nav>;
};
export default Navigation;