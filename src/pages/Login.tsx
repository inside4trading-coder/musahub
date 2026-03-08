import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import musaLogo from '@/assets/musa-logo-2.png';

const Login = () => {
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error('Error al iniciar sesión', { description: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center gradient-hero">
      <div className="w-full max-w-4xl mx-4">
        <div className="rounded-2xl bg-card shadow-modal border border-border flex overflow-hidden">
          {/* Logo Side */}
          <div className="hidden md:flex w-1/2 items-center justify-center bg-[hsl(var(--color-heading))] p-12">
            <img
              src={musaLogo}
              alt="Musa Equipo Creativo"
              className="w-64 h-auto brightness-0 invert"
            />
          </div>

          {/* Form Side */}
          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-extrabold tracking-tight" style={{ letterSpacing: '-0.03em' }}>
                <span className="text-heading">musa</span>
                <span className="text-primary"> hub</span>
                <span className="text-primary ml-1 text-lg">●</span>
              </h1>
              <p className="label-style mt-2">Agency Portal</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-heading font-semibold text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-[10px] bg-muted border-border focus:border-primary focus:ring-primary/15"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-heading font-semibold text-sm">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-[10px] bg-muted border-border focus:border-primary focus:ring-primary/15"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                {loading ? 'Entrando...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
