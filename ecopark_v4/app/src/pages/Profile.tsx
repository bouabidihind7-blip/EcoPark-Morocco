import { useState } from 'react';
import { Wallet, Leaf, Car, Crown, ChevronRight, LogOut, CreditCard, Bell, Shield, Edit2, Check, X, QrCode } from 'lucide-react';
import { useApp } from '../context/AppContext';
import AppLayout from './AppLayout';
import { PRICING_PLANS } from '../data';

const PLAN_COLORS: Record<string, string> = {
  free: 'text-gray-400',
  standard: 'text-blue-400',
  premium: 'text-amber-400',
};
const PLAN_BG: Record<string, string> = {
  free: 'bg-white/5',
  standard: 'bg-blue-400/10',
  premium: 'bg-amber-400/10',
};
const PLAN_BORDER: Record<string, string> = {
  free: 'border-white/10',
  standard: 'border-blue-400/30',
  premium: 'border-amber-400/30',
};

const RELOAD_AMOUNTS = [50, 100, 200, 500];

export default function Profile() {
  const {
    user,
    logout,
    updateUser,
    updateProfileName,
    navigate,
    bookings,
    bookingError,
  } = useApp();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name ?? '');
  const [reloading, setReloading] = useState(false);
  const [reloadAmt, setReloadAmt] = useState(100);
  const [reloadSuccess, setReloadSuccess] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState(false);
  const [accountError, setAccountError] = useState('');

  if (!user) return null;

  const plan = PRICING_PLANS.find(p => p.id === user.plan) ?? PRICING_PLANS[0];
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleSaveName = async () => {
    if (newName.trim().length >= 2) {
      setAccountError('');
      try {
        await updateProfileName(newName.trim());
        setEditingName(false);
      } catch (error) {
        setAccountError(error instanceof Error ? error.message : 'Impossible de modifier le nom.');
      }
    }
  };

  const handleLogout = async () => {
    setAccountError('');
    try {
      await logout();
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Impossible de terminer la session.');
    }
  };

  const handleReload = () => {
    updateUser({ walletBalance: user.walletBalance + reloadAmt });
    setReloadSuccess(true);
    setTimeout(() => { setReloadSuccess(false); setReloading(false); }, 2000);
  };

  const handleUpgrade = (planId: 'standard' | 'premium') => {
    updateUser({ plan: planId });
    setUpgradePlan(false);
  };

  const treeEquiv = Math.round(user.co2Saved * 0.05);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1db588] to-[#2ec595] flex items-center justify-center text-white font-bold text-xl">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#1db588]/50 flex-1"
                  autoFocus
                />
                <button onClick={handleSaveName} className="p-1.5 rounded-lg bg-[#1db588]/20 text-[#1db588]"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingName(false)} className="p-1.5 rounded-lg bg-white/10 text-gray-400"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg font-['Poppins'] truncate">{user.name}</h2>
                <button onClick={() => setEditingName(true)} className="text-gray-500 hover:text-gray-300">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-gray-400 text-sm truncate">{user.email}</p>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 border ${PLAN_COLORS[user.plan]} ${PLAN_BG[user.plan]} ${PLAN_BORDER[user.plan]}`}>
              <Crown className="w-3 h-3" />
              {plan.name}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="glass-card rounded-2xl p-6 text-center">
            <Wallet className="w-6 h-6 text-[#1db588] mx-auto mb-2" />
            <div className="font-bold text-2xl">{user.walletBalance.toFixed(0)}</div>
            <div className="text-sm text-gray-500">MAD</div>
          </div>
          <button
            type="button"
            onClick={() => navigate('my-bookings')}
            className="glass-card rounded-2xl p-6 text-center transition hover:border-[#1db588]/30"
          >
            <Car className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="font-bold text-2xl">{user.totalBookings}</div>
            <div className="text-sm text-gray-500">Réservations</div>
          </button>
          <div className="glass-card rounded-2xl p-6 text-center">
            <Leaf className="w-6 h-6 text-[#1db588] mx-auto mb-2" />
            <div className="font-bold text-2xl">{user.co2Saved.toFixed(1)}</div>
            <div className="text-sm text-gray-500">kg CO₂</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">Réservations et historique</h3>
              <p className="mt-1 text-xs text-gray-500">
                {bookings.filter(booking => booking.status === 'active').length} active(s) ·{' '}
                {bookings.filter(booking => booking.status !== 'active').length} dans l’historique
              </p>
            </div>
            <Car className="h-5 w-5 shrink-0 text-[#1db588]" />
          </div>
          {bookingError && (
            <p role="alert" className="mb-3 rounded-lg bg-red-400/10 px-3 py-2 text-xs text-red-300">
              Impossible de charger les réservations : {bookingError}
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate('my-bookings')}
            className="w-full rounded-xl bg-[#1db588] py-3 text-sm font-semibold text-white transition hover:bg-[#1a8c6d]"
          >
            Consulter mes réservations et mon historique
          </button>
        </div>

        {(accountError || bookingError) && (
          <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {accountError || bookingError}
          </p>
        )}

        {/* Eco impact */}
        {user.co2Saved > 0 && (
          <div className="glass-card rounded-2xl p-4 bg-[#1db588]/5 border border-[#1db588]/20">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-4 h-4 text-[#1db588]" />
              <span className="text-sm font-semibold text-[#1db588]">Impact environnemental</span>
            </div>
            <p className="text-xs text-gray-400">
              Grâce à vos {user.totalBookings} réservation{user.totalBookings > 1 ? 's' : ''}, vous avez économisé{' '}
              <strong className="text-white">{user.co2Saved.toFixed(1)} kg de CO₂</strong>,
              équivalent à la plantation de <strong className="text-[#1db588]">{treeEquiv} arbre{treeEquiv > 1 ? 's' : ''}</strong>.
            </p>
          </div>
        )}

        {/* Wallet reload */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <button
            onClick={() => setReloading(!reloading)}
            className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-[#1db588]/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-[#1db588]" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">Recharger le portefeuille</div>
              <div className="text-xs text-gray-500">Solde : {user.walletBalance.toFixed(2)} MAD</div>
            </div>
            <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${reloading ? 'rotate-90' : ''}`} />
          </button>

          {reloading && (
            <div className="px-4 pb-4 border-t border-white/5">
              {reloadSuccess ? (
                <div className="flex items-center gap-2 text-[#1db588] py-3 justify-center">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">+{reloadAmt} MAD ajoutés !</span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mt-3 mb-2">Choisissez un montant :</p>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {RELOAD_AMOUNTS.map(amt => (
                      <button
                        key={amt}
                        onClick={() => setReloadAmt(amt)}
                        className={`py-2 rounded-xl text-sm font-semibold transition-all ${
                          reloadAmt === amt
                            ? 'bg-[#1db588] text-white'
                            : 'bg-white/5 hover:bg-white/10 text-gray-300'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 text-xs text-gray-500 items-center mb-3">
                    <CreditCard className="w-3 h-3" />
                    <span>CIH · Attijariwafa · CMI · Maroc Telecom</span>
                  </div>
                  <button
                    onClick={handleReload}
                    className="w-full bg-[#1db588] hover:bg-[#1a8c6d] text-white font-semibold rounded-xl py-3 text-sm transition-colors"
                  >
                    Recharger {reloadAmt} MAD
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Plan upgrade */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <button
            onClick={() => setUpgradePlan(!upgradePlan)}
            className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 flex items-center justify-center">
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">Plan actuel : {plan.name}</div>
              <div className="text-xs text-gray-500">
                {user.plan === 'premium' ? 'Vous êtes au maximum !' : 'Passez à un plan supérieur'}
              </div>
            </div>
            {user.plan !== 'premium' && (
              <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${upgradePlan ? 'rotate-90' : ''}`} />
            )}
          </button>

          {upgradePlan && user.plan !== 'premium' && (
            <div className="px-4 pb-4 border-t border-white/5 space-y-2 pt-3">
              {PRICING_PLANS.filter(p => p.id !== 'free' && p.id !== user.plan).map(p => (
                <button
                  key={p.id}
                  onClick={() => handleUpgrade(p.id as 'standard' | 'premium')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01] ${PLAN_BG[p.id]} ${PLAN_BORDER[p.id]}`}
                >
                  <Crown className={`w-5 h-5 ${PLAN_COLORS[p.id]}`} />
                  <div className="flex-1 text-left">
                    <div className={`font-semibold text-sm ${PLAN_COLORS[p.id]}`}>{p.name}</div>
                    <div className="text-xs text-gray-500">-{p.discount}% sur tous les parkings</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{p.price} MAD</div>
                    <div className="text-xs text-gray-500">/mois</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        {[
          { icon: Bell, label: 'Notifications', desc: 'Alertes de réservation' },
          { icon: Shield, label: 'Sécurité', desc: 'Mot de passe · 2FA' },
          { icon: CreditCard, label: 'Moyens de paiement', desc: 'Cartes bancaires enregistrées' },
        ].map(({ icon: Icon, label, desc }) => (
          <button
            key={label}
            className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
              <Icon className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs text-gray-500">{desc}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        ))}

        {/* QR Access for judges */}
        <button
          onClick={() => navigate('qr')}
          className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 border border-white/5 hover:border-[#1db588]/20 transition-all mb-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#1db588]/10 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-[#1db588]" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-medium text-sm">Accès juge — QR Code</div>
            <div className="text-xs text-gray-500">Partager l'app via QR</div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>

        {/* Logout */}
        <button
          onClick={() => void handleLogout()}
          className="w-full flex items-center gap-3 p-4 rounded-2xl border border-red-400/20 bg-red-400/5 hover:bg-red-400/10 transition-colors text-red-400"
        >
          <div className="w-9 h-9 rounded-xl bg-red-400/10 flex items-center justify-center">
            <LogOut className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">Se déconnecter</span>
        </button>

        <p className="text-center text-xs text-gray-600 pb-2">
          EcoPark Maroc v1.0.0 · Membre depuis {new Date(user.joinedAt).toLocaleDateString('fr-MA', { month: 'long', year: 'numeric' })}
        </p>
      </div>
    </AppLayout>
  );
}
