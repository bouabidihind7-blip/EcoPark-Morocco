import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, Car, Zap, Crown, Accessibility, MapPin, Plus, AlertTriangle, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import type { Booking } from '../types';
import AppLayout from './AppLayout';

function TimeUntilEnd({ endTime, onExpire }: { endTime: string; onExpire?: () => void }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('Expiré');
        onExpire?.();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  return (
    <div className="text-center">
      <div className="font-mono text-3xl font-bold text-[#1db588]">{remaining}</div>
      <div className="text-xs text-gray-500 mt-1">temps restant</div>
    </div>
  );
}

const SPOT_ICONS: Record<string, typeof Car> = {
  standard: Car, ev: Zap, vip: Crown, handicapped: Accessibility
};
const SPOT_COLORS: Record<string, string> = {
  standard: 'text-blue-400', ev: 'text-yellow-400', vip: 'text-amber-400', handicapped: 'text-purple-400'
};

function BookingCard({ booking }: { booking: Booking }) {
  const { cancelBooking, extendBooking } = useApp();
  const [extending, setExtending] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const Icon = SPOT_ICONS[booking.spotType] ?? Car;
  const iconColor = SPOT_COLORS[booking.spotType] ?? 'text-blue-400';
  const isActive = booking.status === 'active';
  const endDate = new Date(booking.endTime);
  const startDate = new Date(booking.startTime);

  const handleExtend = async (h: number) => {
    setActionError('');
    setBusy(true);
    try {
      const ok = await extendBooking(booking.id, h);
      if (!ok) setActionError('Solde insuffisant pour prolonger.');
      else setExtending(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Impossible de prolonger la réservation.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setActionError('');
    setBusy(true);
    try {
      await cancelBooking(booking.id);
      setShowCancel(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Impossible d’annuler la réservation.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`glass-card rounded-2xl overflow-hidden border ${
      isActive ? 'border-[#1db588]/30' : 'border-white/5'
    }`}>
      {/* Status bar */}
      <div className={`px-4 py-2 flex items-center gap-2 ${
        isActive ? 'bg-[#1db588]/10' :
        booking.status === 'completed' ? 'bg-white/5' : 'bg-red-400/10'
      }`}>
        {isActive && <div className="w-2 h-2 bg-[#1db588] rounded-full animate-pulse" />}
        {(booking.status === 'completed' || booking.status === 'expired') && <CheckCircle2 className="w-4 h-4 text-gray-500" />}
        {booking.status === 'cancelled' && <XCircle className="w-4 h-4 text-red-400" />}
        <span className={`text-xs font-semibold uppercase tracking-wide ${
          isActive ? 'text-[#1db588]' :
          booking.status === 'completed' || booking.status === 'expired' ? 'text-gray-500' : 'text-red-400'
        }`}>
          {isActive ? 'Active' : booking.status === 'completed' ? 'Terminée' : booking.status === 'expired' ? 'Expirée' : 'Annulée'}
        </span>
        <span className="ml-auto text-xs text-gray-600 font-mono">{booking.id.slice(0, 8).toUpperCase()}</span>
      </div>

      <div className="p-6 space-y-5">
        {/* Parking info */}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{booking.parkingLotName}</div>
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {booking.cityName}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-bold text-white">{booking.price.toFixed(1)} MAD</div>
            <div className="text-xs text-gray-500">{booking.duration}h</div>
          </div>
        </div>

        {/* Timer for active */}
        {isActive && (
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <TimeUntilEnd endTime={booking.endTime} />
            <div className="text-xs text-gray-500 mt-2">
              Fin à {endDate.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-gray-500 mb-0.5">Place</div>
            <div className="font-semibold text-[#1db588]">{booking.spotNumber}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-gray-500 mb-0.5">Début</div>
            <div className="font-medium">
              {startDate.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-gray-500 mb-0.5">CO₂ éco.</div>
            <div className="font-medium text-[#1db588]">{booking.co2Saved} kg</div>
          </div>
        </div>

        {/* Actions for active bookings */}
        {isActive && booking.canCancel && booking.qrCodeToken && (
          <button
            type="button"
            onClick={() => setShowQr(!showQr)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1db588]/10 py-2.5 text-sm font-medium text-[#1db588] transition hover:bg-[#1db588]/20"
          >
            <QrCode className="h-4 w-4" />
            {showQr ? 'Masquer le QR d’accès' : 'Afficher le QR d’accès'}
          </button>
        )}
        {showQr && booking.qrCodeToken && (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-4">
            <QRCodeSVG value={booking.qrCodeToken} size={180} level="M" aria-label="QR code de réservation" />
            <p className="text-xs text-gray-600">À présenter à l’entrée du parking</p>
          </div>
        )}

        {actionError && (
          <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">
            {actionError}
          </p>
        )}

        {isActive && (
          <div className="flex gap-2">
            <button
              onClick={() => setExtending(!extending)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#1db588]/10 hover:bg-[#1db588]/20 text-[#1db588] text-sm font-medium rounded-xl py-2.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Prolonger
            </button>
            {booking.canCancel && (
              <button
                onClick={() => setShowCancel(!showCancel)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-400/10 hover:bg-red-400/20 text-red-400 text-sm font-medium rounded-xl py-2.5 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Annuler
              </button>
            )}
          </div>
        )}

        {/* Extend panel */}
        {extending && (
          <div className="bg-white/5 rounded-xl p-3 space-y-2">
            <p className="text-xs text-gray-400 font-medium">Prolonger de (5 MAD/h) :</p>
            <div className="flex gap-2">
              {[1, 2, 3].map(h => (
                <button key={h} disabled={busy} onClick={() => void handleExtend(h)}
                  className="flex-1 bg-[#1db588] hover:bg-[#1a8c6d] text-white text-sm font-semibold rounded-lg py-2 transition-colors">
                  +{h}h
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cancel confirmation */}
        {showCancel && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <p className="text-xs text-red-300 font-medium">Annuler cette réservation ?</p>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Annule la réservation et libère la place. Le portefeuille est une simulation locale.
            </p>
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={() => void handleCancel()}
                className="flex-1 bg-red-400 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg py-2 transition-colors"
              >
                Confirmer l'annulation
              </button>
              <button
                onClick={() => setShowCancel(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-semibold rounded-lg py-2 transition-colors"
              >
                Garder
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyBookings() {
  const { bookings, user, navigate, bookingError } = useApp();
  const [tab, setTab] = useState<'active' | 'history'>(
    user?.email === 'demo@ecopark.ma' ? 'history' : 'active'
  );

  const userBookings = bookings.filter(b => b.userId === user?.id);
  const activeBookings = userBookings.filter(b => b.status === 'active');
  const historyBookings = userBookings.filter(b => b.status !== 'active')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const shown = tab === 'active' ? activeBookings : historyBookings;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold font-['Poppins'] mb-6">Mes Réservations</h1>
        {bookingError && (
          <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
            Impossible de charger les réservations depuis le serveur : {bookingError}
          </p>
        )}
        {user?.email === 'demo@ecopark.ma' && tab === 'history' && (
          <p className="mb-4 text-xs text-gray-500">
            Historique fictif enregistré dans PostgreSQL pour tester la démonstration; il ne représente pas de clients réels.
          </p>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              tab === 'active' ? 'bg-[#1db588] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Clock className="w-4 h-4" />
            Actives
            {activeBookings.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                tab === 'active' ? 'bg-white/20 text-white' : 'bg-[#1db588] text-white'
              }`}>
                {activeBookings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              tab === 'history' ? 'bg-[#1db588] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Historique
            {historyBookings.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                tab === 'history' ? 'bg-white/20 text-white' : 'bg-white/20 text-gray-400'
              }`}>
                {historyBookings.length}
              </span>
            )}
          </button>
        </div>

        {/* Bookings list */}
        {shown.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              {tab === 'active' ? <Clock className="w-8 h-8 text-gray-600" /> : <CheckCircle2 className="w-8 h-8 text-gray-600" />}
            </div>
            <p className="text-gray-400 mb-4">
              {tab === 'active' ? 'Aucune réservation active' : 'Aucun historique'}
            </p>
            <button
              onClick={() => navigate('parking')}
              className="bg-[#1db588] hover:bg-[#1a8c6d] text-white font-semibold rounded-xl px-6 py-3 transition-colors"
            >
              Réserver un parking
            </button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {shown.map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
