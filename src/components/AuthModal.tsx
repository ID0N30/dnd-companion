"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { LogIn, UserPlus, Mail, Lock, User, AlertCircle, X, Sparkles } from "lucide-react";

export default function AuthModal({ 
  open, 
  onClose 
}: { 
  open: boolean; 
  onClose: () => void; 
}) {
  const { signInGoogle, signUpWithEmail, signInWithEmail } = useAuth();
  
  const [tab, setTab] = useState<"login" | "register">("login");
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (tab === "register") {
        if (!form.displayName.trim()) {
          throw new Error("⚠️ Por favor ingresa tu nombre de usuario.");
        }
        await signUpWithEmail(form.email, form.password, form.displayName);
      } else {
        await signInWithEmail(form.email, form.password);
      }
      setLoading(false);
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Error al autenticar.");
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInGoogle();
      setLoading(false);
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Error al iniciar sesión con Google.");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }} 
            animate={{ scale: 1, y: 0 }} 
            exit={{ scale: 0.9, y: 20 }} 
            className="bg-parchment-dark border-4 border-magic-gold rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-ink relative"
          >
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-1.5 text-ink-light hover:text-magic-red transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <Sparkles className="w-8 h-8 text-magic-gold mx-auto" />
              <h3 className="text-2xl font-bold font-cinzel text-magic-gold">
                {tab === 'login' ? 'Iniciar Sesión' : 'Crear Nueva Cuenta'}
              </h3>
              <p className="text-xs text-ink-light">
                {tab === 'login' 
                  ? 'Ingresa a tu cuenta de D&D Companion para administrar tus salas y héroes.' 
                  : 'Crea tu cuenta única con correo y nombre de usuario para unirte o crear campañas.'}
              </p>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex bg-parchment p-1 rounded-lg border border-ink/20 font-bold text-xs">
              <button 
                onClick={() => { setTab('login'); setError(''); }} 
                className={`flex-1 py-2 rounded transition cursor-pointer flex items-center justify-center gap-1.5 ${tab === 'login' ? 'bg-magic-gold text-black shadow' : 'text-ink-light hover:text-ink'}`}
              >
                <LogIn className="w-4 h-4" /> Iniciar Sesión
              </button>
              <button 
                onClick={() => { setTab('register'); setError(''); }} 
                className={`flex-1 py-2 rounded transition cursor-pointer flex items-center justify-center gap-1.5 ${tab === 'register' ? 'bg-magic-gold text-black shadow' : 'text-ink-light hover:text-ink'}`}
              >
                <UserPlus className="w-4 h-4" /> Registrarse
              </button>
            </div>

            {/* ERROR ALERT */}
            {error && (
              <div className="p-3 bg-red-950/80 border border-magic-red text-red-200 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-magic-red shrink-0 mt-0.5" />
                <span className="leading-tight font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {tab === "register" && (
                <div>
                  <label className="block font-bold mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-magic-gold" /> Nombre de Usuario (Único)
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={form.displayName}
                    onChange={e => setForm({...form, displayName: e.target.value})}
                    placeholder="Ej. DM_Gandalf o HeroeLegendario" 
                    className="w-full p-2.5 bg-parchment border border-ink/30 text-ink rounded font-bold focus:outline-none focus:border-magic-gold text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-magic-gold" /> Correo Electrónico
                </label>
                <input 
                  type="email" 
                  required 
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="ejemplo@gmail.com" 
                  className="w-full p-2.5 bg-parchment border border-ink/30 text-ink rounded focus:outline-none focus:border-magic-gold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-magic-gold" /> Contraseña
                </label>
                <input 
                  type="password" 
                  required 
                  minLength={6}
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  placeholder="Mínimo 6 caracteres" 
                  className="w-full p-2.5 bg-parchment border border-ink/30 text-ink rounded focus:outline-none focus:border-magic-gold text-sm"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-magic-gold text-black font-bold text-sm rounded-lg shadow hover:bg-yellow-500 transition cursor-pointer disabled:opacity-50"
              >
                {loading 
                  ? 'Procesando...' 
                  : (tab === 'login' ? 'Ingresar a mi Cuenta' : 'Crear Cuenta Única')}
              </button>
            </form>

            <div className="flex items-center gap-3 my-2">
              <div className="h-px bg-ink/20 flex-1"></div>
              <span className="text-[10px] text-ink-light uppercase font-bold">o entra con</span>
              <div className="h-px bg-ink/20 flex-1"></div>
            </div>

            <button 
              type="button" 
              onClick={handleGoogle}
              disabled={loading}
              className="w-full py-2.5 bg-parchment border border-ink/30 text-ink font-bold text-xs rounded-lg hover:border-magic-gold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <LogIn className="w-4 h-4 text-magic-gold" /> Google Workspace
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
