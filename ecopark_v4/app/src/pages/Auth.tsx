import { useState } from 'react';
import { ParkingCircle, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Leaf } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function AuthPage() {
  const { login, register, goBack, canGoBack, authError } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const ok = await login(email, password);
        if (!ok) setError('Email ou mot de passe incorrect.');
      } else {
        if (name.trim().length < 2) { setError('Nom requis.'); return; }
        if (password.length < 8) { setError('Mot de passe : 8 caractères minimum.'); return; }
        const ok = await register(name.trim(), email, password);
        if (!ok) setError('Cet email est déjà utilisé.');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="eco-page-background min-h-screen bg-[#1b1b1b] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#1db588]/15 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-[#2ec595]/10 rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back button */}
        <button
          onClick={goBack}
          disabled={!canGoBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Retour</span>
        </button>

        {/* Card */}
        <div className="glass-card p-8 rounded-2xl border border-white/10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1db588] to-[#2ec595] flex items-center justify-center">
              <ParkingCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold font-['Poppins']">EcoPark</span>
              <span className="text-[#1db588] text-sm ml-1">Maroc</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2 font-['Poppins']">
            {mode === 'login' ? 'Bon retour !' : 'Créer un compte'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {mode === 'login'
              ? 'Connectez-vous pour gérer vos parkings.'
              : 'Rejoignez l\'écosystème de stationnement vert.'}
          </p>
          {authError && (
            <p role="alert" className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              {authError}
            </p>
          )}

          {/* Signup bonus banner */}
          {mode === 'register' && (
            <div className="flex items-center gap-2 bg-[#1db588]/10 border border-[#1db588]/30 rounded-xl p-3 mb-5">
              <Leaf className="w-4 h-4 text-[#1db588] shrink-0" />
              <p className="text-[#1db588] text-xs">
                <strong>Bonus inscription :</strong> 30 MAD offerts sur votre portefeuille !
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Votre nom"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#1db588]/50 focus:bg-white/8 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#1db588]/50 focus:bg-white/8 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#1db588]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1db588] hover:bg-[#1a8c6d] disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors mt-2"
            >
              {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          {/* Demo credentials */}
          {mode === 'login' && (
            <div className="mt-4 p-3 bg-white/5 rounded-xl text-xs text-gray-500">
              <p className="font-medium text-gray-400 mb-1">Compte démo :</p>
              <p>demo@ecopark.ma / EcoParkDemo2026!</p>
              <button
                onClick={() => { setEmail('demo@ecopark.ma'); setPassword('EcoParkDemo2026!'); }}
                className="text-[#1db588] hover:underline mt-1"
              >
                Remplir automatiquement
              </button>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-gray-400">
            {mode === 'login' ? (
              <>Pas encore de compte ?{' '}
                <button onClick={() => { setMode('register'); setError(''); }} className="text-[#1db588] hover:underline font-medium">
                  S'inscrire
                </button>
              </>
            ) : (
              <>Déjà un compte ?{' '}
                <button onClick={() => { setMode('login'); setError(''); }} className="text-[#1db588] hover:underline font-medium">
                  Se connecter
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
