import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FirebaseError } from 'firebase/app';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLoginErrorMessage = (err: unknown) => {
    if (err instanceof FirebaseError) {
      switch (err.code) {
        case 'auth/invalid-email': return 'El correo no es válido.';
        case 'auth/user-disabled': return 'Cuenta deshabilitada.';
        case 'auth/user-not-found': return 'No existe la cuenta.';
        case 'auth/wrong-password': return 'Contraseña incorrecta.';
        case 'auth/too-many-requests': return 'Demasiados intentos. Espera.';
        default: return 'Error al iniciar sesión.';
      }
    }
    return 'Ocurrió un error inesperado.';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!email || !password) throw new Error('Completa todos los campos');
      await signIn(email, password);
      toast({ title: '¡Bienvenido!', description: 'Has iniciado sesión correctamente.' });
      navigate('/');
    } catch (err: any) {
      const message = err?.message === 'Completa todos los campos' ? err.message : getLoginErrorMessage(err);
      setError(message);
      toast({ variant: 'destructive', title: 'Error', description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans text-slate-900">
      
      {/* =======================
          SECCIÓN SUPERIOR (MÓVIL) / IZQUIERDA (PC)
      ======================= */}
      <div className="w-full lg:w-1/2 lg:h-screen relative bg-zinc-900 overflow-hidden shrink-0">
        
        {/* Imagen de fondo compartida */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop"
            alt="Fondo"
            className="w-full h-full object-cover opacity-70 lg:opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80 lg:bg-gradient-to-r lg:from-black/70 lg:to-transparent" />
        </div>

        {/* Contenido sobre la imagen (MÓVIL) */}
        <div className="lg:hidden relative z-10 h-[40vh] flex flex-col justify-between p-8">
          <div className="text-white font-bold text-2xl tracking-tight">Tesory</div>
          <div className="text-white pb-8">
            <h2 className="text-4xl font-extrabold leading-tight">Bienvenido de nuevo</h2>
          </div>
        </div>

        {/* Contenido sobre la imagen (DESKTOP) */}
        <div className="hidden lg:flex relative z-10 h-full flex-col justify-between p-16 text-white">
          <div className="text-3xl font-bold tracking-tight">Tesory</div>
          <div className="max-w-xl">
            <h1 className="text-6xl font-extrabold mb-6 leading-tight">Gestiona,<br />tu tesorería.</h1>
            <p className="text-zinc-200 text-xl font-light">Accede a tu plataforma y gestiona todo lo que necesitas desde un solo lugar.</p>
          </div>
          <div className="text-sm text-zinc-400">© {new Date().getFullYear()} Tesory.</div>
        </div>
      </div>

      {/* =======================
          FORMULARIO (MÓVIL: Fluye debajo | PC: Centrado derecha)
      ======================= */}
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center bg-gray-50 lg:bg-white px-4 relative">
        
        {/* Tarjeta de Formulario */}
        <div 
          className={cn(
            "w-full max-w-md bg-white p-8 lg:p-12 shadow-xl lg:shadow-none z-20 transition-all duration-300",
            "rounded-3xl -mt-12 lg:mt-0 mb-10 lg:mb-0 border border-gray-100 lg:border-none"
          )}
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ingresa tus datos</h2>
            <p className="text-gray-500 text-sm">Bienvenido, por favor ingresa tus credenciales.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="hola@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-gray-50"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <button type="button" className="text-sm font-medium text-orange-600 hover:underline">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-gray-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold rounded-xl"
              disabled={loading}
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
