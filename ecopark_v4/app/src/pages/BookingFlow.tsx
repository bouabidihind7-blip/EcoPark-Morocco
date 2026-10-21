import { useState } from 'react';
import { ArrowLeft, Car, Zap, Accessibility, Crown, Clock, CreditCard, CheckCircle2, Wallet, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import type { SpotType } from '../types';
import { SPOT_PRICES, DURATION_OPTIONS } from '../data';
import AppLayout from './AppLayout';

const SPOT_TYPES: { id: SpotType; label: string; icon: typeof Car; desc: string; color: string }[] = [
  { id: 'standard', label: 'Standard', icon: Car, desc: 'Place classique', color: 'text-blue-400' },
  { id: 'ev', label: 'Recharge VE', icon: Zap, desc: 'Borne de recharge incluse', color: 'text-yellow-400' },
  { id: 'handicapped', label: 'PMR', icon: Accessibility, desc: 'Accès facilité', color: 'text-purple-400' },
  { id: 'vip', label: 'VIP', icon: Crown, desc: 'Place réservée premium', color: 'text-amber-400' },
];

export default function BookingFlow() {
  const { bookingDraft, setBookingDraft, createBooking, navigate, user } = useApp();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    id: string;
    spotNumber: string;
    endTime: string;
    price: number;
    qrCodeToken: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const lot = bookingDraft.parkingLot;
  if (!lot) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <p>Aucun parking sélectionné.</p>
          <button onClick={() => navigate('parking')} className="mt-3 text-[#1db588] hover:underline">
            Choisir un parking
          </button>
        </div>
      </AppLayout>
    );
  }

  const multiplier = SPOT_PRICES[bookingDraft.spotType];
  const totalPrice = Math.round(lot.price * multiplier * bookingDraft.duration * 10) / 10;
  const canAfford = (user?.walletBalance ?? 0) >= totalPrice;

  const handleConfirm = async () => {
    setError('');
    if (!canAfford) { setError('Solde insuffisant. Rechargez votre portefeuille.'); return; }
    setSubmitting(true);
    try {
      const booking = await createBooking(bookingDraft);
      if (!booking.qrCodeToken) {
        throw new Error('Le serveur n’a pas renvoyé le jeton QR de cette réservation.');
      }
      setConfirmedBooking({
        id: booking.id,
        spotNumber: booking.spotNumber,
        endTime: booking.endTime,
        price: booking.price,
        qrCodeToken: booking.qrCodeToken,
      });
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La réservation a échoué. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 4: Success
  if (step === 4 && confirmedBooking) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-10 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#1db588]/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9 text-[#1db588]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-['Poppins'] mb-2">Réservation confirmée !</h2>
            <p className="text-gray-400 text-sm">Votre place est réservée. Présentez ce QR code à l'entrée.</p>
          </div>

          <div className="glass-card rounded-2xl p-8 space-y-5">
            <div className="flex justify-center">
              <div className="rounded-xl bg-white p-3">
                <QRCodeSVG
                  value={confirmedBooking.qrCodeToken}
                  size={196}
                  level="M"
                  aria-label="QR code sécurisé de la réservation"
                />
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Référence</div>
              <div className="font-mono text-sm font-semibold">{confirmedBooking.id.slice(0, 8).toUpperCase()}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-gray-500 text-xs mb-1">Parking</div>
                <div className="font-medium truncate">{lot.name}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-gray-500 text-xs mb-1">Place</div>
                <div className="font-semibold text-[#1db588]">{confirmedBooking.spotNumber}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-gray-500 text-xs mb-1">Durée</div>
                <div className="font-medium">{bookingDraft.duration}h</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-gray-500 text-xs mb-1">Montant</div>
                <div className="font-semibold">{confirmedBooking.price.toFixed(2)} MAD</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('my-bookings')}
              className="flex-1 bg-[#1db588] hover:bg-[#1a8c6d] text-white font-semibold rounded-xl py-3 transition-colors"
            >
              Voir mes réservations
            </button>
            <button
              onClick={() => navigate('dashboard')}
              className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl py-3 transition-colors"
            >
              Accueil
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const steps = ['Type de place', 'Durée', 'Paiement'];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <button onClick={() => step > 1 ? setStep((s) => (s - 1) as 1|2|3) : navigate('dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">{step > 1 ? 'Retour' : 'Annuler'}</span>
        </button>

        {/* Parking info card */}
        <div className="glass-card rounded-2xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1db588]/10 flex items-center justify-center shrink-0">
            <Car className="w-5 h-5 text-[#1db588]" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{lot.name}</div>
            <div className="text-xs text-gray-400">{bookingDraft.cityName} · {lot.price} MAD/h de base</div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((label, i) => {
            const stepN = i + 1;
            const active = step === stepN;
            const done = step > stepN;
            return (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  done ? 'bg-[#1db588] text-white' : active ? 'bg-[#1db588] text-white' : 'bg-white/10 text-gray-500'
                }`}>
                  {done ? '✓' : stepN}
                </div>
                <span className={`text-xs hidden sm:block ${active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
                {i < 2 && <div className={`flex-1 h-0.5 rounded ${done ? 'bg-[#1db588]' : 'bg-white/10'}`} />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Spot type */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold font-['Poppins']">Type de place</h2>
            <p className="text-gray-400 text-sm">Choisissez votre type de stationnement.</p>
            <div className="space-y-3">
              {SPOT_TYPES.map(({ id, label, icon: Icon, desc, color }) => {
                const isEV = id === 'ev' && lot.evAvailable === 0;
                const selected = bookingDraft.spotType === id;
                return (
                  <button
                    key={id}
                    disabled={isEV}
                    onClick={() => setBookingDraft({ spotType: id })}
                    className={`w-full glass-card rounded-2xl p-4 flex items-center gap-4 border transition-all ${
                      selected ? 'border-[#1db588] bg-[#1db588]/5' : 'border-white/5 hover:border-white/15'
                    } ${isEV ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-gray-500">{isEV ? 'Aucune borne disponible' : desc}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${selected ? 'text-[#1db588]' : 'text-gray-300'}`}>
                        x{SPOT_PRICES[id].toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(lot.price * SPOT_PRICES[id]).toFixed(1)} MAD/h
                      </div>
                    </div>
                    {selected && <div className="w-4 h-4 rounded-full bg-[#1db588] flex items-center justify-center shrink-0">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full bg-[#1db588] hover:bg-[#1a8c6d] text-white font-semibold rounded-xl py-4 mt-4 transition-colors"
            >
              Continuer
            </button>
          </div>
        )}

        {/* Step 2: Duration */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold font-['Poppins']">Durée de stationnement</h2>
            <p className="text-gray-400 text-sm">Choisissez combien de temps vous souhaitez vous garer.</p>
            <div className="grid grid-cols-2 gap-3">
              {DURATION_OPTIONS.map(({ value, label }) => {
                const selected = bookingDraft.duration === value;
                const price = (lot.price * multiplier * value).toFixed(1);
                return (
                  <button
                    key={value}
                    onClick={() => setBookingDraft({ duration: value })}
                    className={`glass-card rounded-2xl p-4 text-left border transition-all ${
                      selected ? 'border-[#1db588] bg-[#1db588]/5' : 'border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className={`w-4 h-4 ${selected ? 'text-[#1db588]' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${selected ? 'text-[#1db588]' : 'text-white'}`}>{label}</span>
                    </div>
                    <div className="text-lg font-bold">{price} MAD</div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep(3)}
              className="w-full bg-[#1db588] hover:bg-[#1a8c6d] text-white font-semibold rounded-xl py-4 mt-2 transition-colors"
            >
              Continuer
            </button>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold font-['Poppins']">Récapitulatif</h2>

            <div className="glass-card rounded-2xl p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Parking</span>
                <span className="font-medium">{lot.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Type de place</span>
                <span className="font-medium capitalize">{bookingDraft.spotType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Durée</span>
                <span className="font-medium">{bookingDraft.duration}h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tarif</span>
                <span>{lot.price} × {SPOT_PRICES[bookingDraft.spotType]} × {bookingDraft.duration}h</span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-xl text-[#1db588]">{totalPrice} MAD</span>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Méthode de paiement</h3>
              <div className={`glass-card rounded-2xl p-4 flex items-center gap-3 border ${
                canAfford ? 'border-[#1db588]/30 bg-[#1db588]/5' : 'border-red-400/30 bg-red-400/5'
              }`}>
                <Wallet className={`w-5 h-5 ${canAfford ? 'text-[#1db588]' : 'text-red-400'}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium">Portefeuille EcoPark</div>
                  <div className={`text-xs ${canAfford ? 'text-gray-400' : 'text-red-400'}`}>
                    Solde : {user?.walletBalance?.toFixed(2)} MAD
                    {!canAfford && ' — Solde insuffisant'}
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  canAfford ? 'border-[#1db588] bg-[#1db588]' : 'border-red-400'
                }`}>
                  {canAfford && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </div>

            {!canAfford && (
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-2">Rechargez via l'application mobile</p>
                <div className="flex items-center gap-2 justify-center">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500">CMI · CIH · Maroc Telecom</span>
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={!canAfford || submitting}
              className="w-full bg-[#1db588] hover:bg-[#1a8c6d] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-4 transition-colors flex items-center justify-center gap-2"
            >
              <QrCode className="w-5 h-5" />
              {submitting ? 'Enregistrement...' : `Confirmer et payer ${totalPrice} MAD`}
            </button>
            <p className="text-center text-xs text-gray-600">
              Paiement sécurisé · Remboursement 50% si annulation
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
