import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Wifi, Smartphone, Copy, Check, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Detects the local IP so judges on the same WiFi can scan and open the app
function useLocalUrl() {
  const [url, setUrl] = useState(window.location.origin);
  useEffect(() => {
    // window.location.hostname covers localhost and real LAN IP
    setUrl(window.location.origin);
  }, []);
  return url;
}

export default function QRAccess() {
  const { goBack, canGoBack, authError } = useApp();
  const appUrl  = useLocalUrl();
  const demoUrl = `${appUrl}`;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(demoUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="eco-page-background min-h-screen bg-[#141414] text-white flex flex-col items-center justify-center px-6">
      <button
        type="button"
        onClick={goBack}
        disabled={!canGoBack}
        aria-label="Retour à la page précédente"
        title={canGoBack ? 'Retour à la page précédente' : 'Aucune page précédente'}
        className="absolute left-4 top-4 flex items-center gap-2 rounded-lg px-3 py-2 text-gray-400 transition hover:bg-white/10 hover:text-[#1db588] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">Retour</span>
      </button>
      {authError && (
        <p role="alert" className="absolute top-20 max-w-lg rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-300">
          Impossible de restaurer la session : {authError}
        </p>
      )}

      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">🌱</div>
        <div className="text-3xl font-extrabold font-['Poppins']">
          EcoPark<span className="text-[#1db588]">Maroc</span>
        </div>
        <div className="text-gray-400 text-sm mt-1">Application de démonstration</div>
      </div>

      {/* QR code card */}
      <div className="bg-white rounded-3xl p-6 shadow-2xl shadow-black/50 mb-6">
        <QRCodeSVG
          value={demoUrl}
          size={220}
          bgColor="#ffffff"
          fgColor="#141414"
          level="H"
          includeMargin={false}
          imageSettings={{
            src: '',       // no logo overlay — keep it clean
            x: undefined,
            y: undefined,
            height: 0,
            width: 0,
            excavate: false,
          }}
        />
      </div>

      {/* Instructions */}
      <div className="w-full max-w-sm space-y-3 mb-6">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
          <Wifi className="w-5 h-5 text-[#1db588] shrink-0" />
          <div>
            <div className="text-sm font-medium">Même réseau WiFi</div>
            <div className="text-xs text-gray-500">Le juge doit être sur le même réseau que cet ordinateur</div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
          <Smartphone className="w-5 h-5 text-[#1db588] shrink-0" />
          <div>
            <div className="text-sm font-medium">Scanner avec l'appareil photo</div>
            <div className="text-xs text-gray-500">iOS et Android reconnaissent les QR codes nativement</div>
          </div>
        </div>
      </div>

      {/* URL display + copy */}
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 mb-4">
        <span className="text-xs font-mono text-gray-300 flex-1 truncate">{demoUrl}</span>
        <button
          onClick={copy}
          className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          title="Copier le lien"
        >
          {copied ? <Check className="w-4 h-4 text-[#1db588]" /> : <Copy className="w-4 h-4 text-gray-400" />}
        </button>
        <a
          href={demoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          title="Ouvrir"
        >
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </a>
      </div>

      {/* Demo credentials */}
      <div className="w-full max-w-sm glass-card rounded-2xl px-5 py-4 border border-[#1db588]/20 bg-[#1db588]/5">
        <div className="text-xs font-semibold text-[#1db588] mb-3">Compte de démonstration</div>
        <div className="space-y-1.5">
          {[
            ['Email',       'demo@ecopark.ma'],
            ['Mot de passe','EcoParkDemo2026!'],
            ['Plan',        'Standard (démo)'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-mono font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-gray-700 text-xs mt-8 text-center max-w-xs">
        EcoPark Maroc · Projet universitaire · Parking solaire intelligent · Marina Agadir
      </p>
    </div>
  );
}
