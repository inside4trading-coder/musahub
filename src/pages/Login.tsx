import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notify } from '@/lib/toast';
import musaLogo from '@/assets/musa-logo-2.png';

const Login = () => {
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const reduce = useReducedMotion();

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      notify.error('Error al iniciar sesión', { description: error.message });
    }
    setLoading(false);
  };

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: reduce ? 0 : 0.12 } },
  };
  const item: Variants = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="flex min-h-screen items-center justify-center gradient-hero p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-4xl"
      >
        <div className="flex overflow-hidden rounded-2xl border border-border bg-card shadow-modal">
          {/* Logo side — panel oscuro (invariante al tema) con aura de marca animada */}
          <div
            className="relative hidden w-1/2 items-center justify-center overflow-hidden p-12 md:flex"
            style={{ backgroundColor: 'hsl(220 39% 13%)' }}
          >
            <motion.div
              aria-hidden="true"
              className="absolute -left-10 -top-10 h-60 w-60 rounded-full blur-3xl"
              style={{ background: 'hsl(var(--color-lime) / 0.30)' }}
              animate={reduce ? undefined : { x: [0, 20, 0], y: [0, 16, 0], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              aria-hidden="true"
              className="absolute -bottom-12 -right-8 h-64 w-64 rounded-full blur-3xl"
              style={{ background: 'hsl(var(--color-teal) / 0.28)' }}
              animate={reduce ? undefined : { x: [0, -18, 0], y: [0, -14, 0], opacity: [0.45, 0.75, 0.45] }}
              transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.img
              src={musaLogo}
              alt="Musa Equipo Creativo"
              className="relative w-80 h-auto brightness-0 invert"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.2 }}
            />
          </div>

          {/* Form side */}
          <div className="flex w-full flex-col justify-center p-8 md:w-1/2 md:p-12">
            <motion.div variants={container} initial="hidden" animate="show">
              <motion.div variants={item} className="mb-8 text-center">
                <h1 className="text-3xl font-extrabold tracking-tight" style={{ letterSpacing: '-0.03em' }}>
                  <span className="text-heading">musa</span>
                  <span className="text-primary"> hub</span>
                  <motion.span
                    className="ml-1 inline-block text-lg text-primary"
                    animate={reduce ? undefined : { opacity: [1, 0.35, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    ●
                  </motion.span>
                </h1>
                <p className="label-style mt-2">Agency Portal</p>
              </motion.div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <motion.div variants={item} className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-heading">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-[10px] border-border bg-muted focus:border-primary focus:ring-primary/15"
                  />
                </motion.div>
                <motion.div variants={item} className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-heading">
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 rounded-[10px] border-border bg-muted focus:border-primary focus:ring-primary/15"
                  />
                </motion.div>
                <motion.div variants={item}>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-card-hover"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Entrando…
                      </>
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </Button>
                </motion.div>
              </form>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
