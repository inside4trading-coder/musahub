import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Briefcase, Map, Sparkles, Mail,
  BookOpen, Settings, LogOut, ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import musaLogoText from '@/assets/musa-logo-text.png';
import musaLogoIcon from '@/assets/musa-logo-icon.png';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'CRM', icon: Briefcase, path: '/crm' },
  { label: 'Prospección', icon: Map, path: '/prospecting' },
  { label: 'Generador', icon: Sparkles, path: '/generator' },
  { label: 'Email Campaigns', icon: Mail, path: '/email-campaigns' },
  { label: 'Knowledge Base', icon: BookOpen, path: '/knowledge' },
  { label: 'Configuración', icon: Settings, path: '/settings' },
];

export const AppSidebar = () => {
  const { signOut, profile } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-card transition-all duration-200",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src={musaLogoIcon} alt="Musa" className="h-7 w-7 object-contain" />
            <img src={musaLogoText} alt="Musa Hub" className="h-5 object-contain" />
          </div>
        )}
        {collapsed && (
          <img src={musaLogoIcon} alt="Musa" className="h-7 w-7 object-contain mx-auto" />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-heading font-semibold border-l-[3px] border-primary"
                  : "text-body hover:bg-muted"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="border-t border-border p-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-body hover:bg-muted transition-all"
        >
          <LogOut className="h-5 w-5 text-muted-foreground shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
};
