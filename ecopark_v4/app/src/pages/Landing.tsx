import { useApp } from '../context/AppContext';
import { citiesData as cityCatalog } from '../data';
import { useEffect, useState, useRef } from 'react';
import { 
  MapPin, 
  Battery, 
  Sun, 
  Car, 
  Zap, 
  Leaf, 
  TrendingUp, 
  Clock, 
  CreditCard,
  Menu,
  X,
  ArrowLeft,
  Download,
  Phone,
  Mail,
  Instagram,
  Twitter,
  Facebook,
  Navigation,
  ParkingCircle,
  Wallet,
  BarChart3,
  Trees,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Pricing plans
const pricingPlans = [
  {
    name: 'Éco-Découverte',
    price: 0,
    period: 'gratuit',
    description: 'Parfait pour les utilisateurs occasionnels',
    features: [
      'Recherche de parking en temps réel',
      'Navigation GPS de base',
      'Paiement sans contact',
      'Historique des 7 derniers jours',
      'Support par email'
    ],
    cta: 'Commencer Gratuitement',
    popular: false
  },
  {
    name: 'Standard',
    price: 49,
    period: 'mois',
    description: 'Pour les utilisateurs réguliers',
    features: [
      'Toutes les fonctionnalités Éco-Découverte',
      'Réservation anticipée (24h)',
      'Tarifs préférentiels -10%',
      'Recharge VE incluse (2h/mois)',
      'Cashback CO₂',
      'Support prioritaire'
    ],
    cta: 'Choisir Standard',
    popular: true
  },
  {
    name: 'Premium',
    price: 99,
    period: 'mois',
    description: 'Pour les professionnels et flottes',
    features: [
      'Toutes les fonctionnalités Standard',
      'Réservation illimitée',
      'Tarifs préférentiels -20%',
      'Recharge VE illimitée',
      'V2G - Vendez votre énergie',
      'Dashboard analytics avancé',
      'Support dédié 24/7'
    ],
    cta: 'Choisir Premium',
    popular: false
  }
];

// Illustrative project estimates, not measurements from the API.
const environmentalData = {
  co2Saved: 150,
  treesEquivalent: 6900,
  kmAvoided: 750000,
  energyProduced: 160000,
  homesPowered: 45,
  evKm: 500000,
  fuelSaved: 50000
};

// Energy pricing for ONEE integration
const energyPricing = {
  offPeak: 1.2, // 23h-06h
  normal: 1.5,  // 06h-17h
  peak: 1.8     // 17h-23h
};

function Landing() {
  const { navigate, goBack, canGoBack, parkingLots, parkingLoading, parkingError, authError } = useApp();
  const [selectedCityId, setSelectedCityId] = useState('casablanca');
  const selectedCity = cityCatalog.find(city => city.id === selectedCityId) ?? cityCatalog[0];
  const selectedCityLots = parkingLots.filter(lot => lot.cityId === selectedCity.id);
  const cityCount = new Set(parkingLots.map(lot => lot.cityId)).size;
  const totalAvailable = parkingLots.reduce((total, lot) => total + lot.available, 0);
  const totalEvAvailable = parkingLots.reduce((total, lot) => total + lot.evAvailable, 0);
  const countLabel = (value: number) => parkingLoading && parkingLots.length === 0 ? '…' : value.toLocaleString('fr-MA');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [animatedStats, setAnimatedStats] = useState({
    co2: 0,
    trees: 0,
    energy: 0,
    evKm: 0
  });
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animate stats when in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateStats();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const animateStats = () => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setAnimatedStats({
        co2: Math.round(environmentalData.co2Saved * easeOut),
        trees: Math.round(environmentalData.treesEquivalent * easeOut),
        energy: Math.round(environmentalData.energyProduced * easeOut),
        evKm: Math.round(environmentalData.evKm * easeOut)
      });

      if (step >= steps) {
        clearInterval(timer);
      }
    }, interval);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="eco-page-background min-h-screen bg-[#1b1b1b] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrollY > 50 ? 'bg-[#1b1b1b]/90 backdrop-blur-lg border-b border-white/10' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goBack}
                disabled={!canGoBack}
                aria-label="Retour à la page précédente"
                title={canGoBack ? 'Retour à la page précédente' : 'Aucune page précédente'}
                className="mr-1 rounded-lg p-2 text-gray-500 transition hover:bg-white/10 hover:text-[#1db588] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1db588] to-[#2ec595] flex items-center justify-center">
                <ParkingCircle className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold font-['Poppins']">EcoPark</span>
                <span className="text-[#1db588] text-sm ml-1">Maroc</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-sm text-gray-300 hover:text-[#1db588] transition-colors">Fonctionnalités</button>
              <button onClick={() => scrollToSection('cities')} className="text-sm text-gray-300 hover:text-[#1db588] transition-colors">Villes</button>
              <button onClick={() => scrollToSection('energy')} className="text-sm text-gray-300 hover:text-[#1db588] transition-colors">Énergie</button>
              <button onClick={() => scrollToSection('environment')} className="text-sm text-gray-300 hover:text-[#1db588] transition-colors">Environnement</button>
              <button onClick={() => scrollToSection('pricing')} className="text-sm text-gray-300 hover:text-[#1db588] transition-colors">Tarifs</button>
            </div>

            {/* CTA Button */}
            <div className="hidden lg:block">
              <Button className="bg-[#1db588] hover:bg-[#1a8c6d] text-white rounded-full px-6" onClick={() => navigate('auth')}>
                <Download className="w-4 h-4 mr-2" />
                Connexion
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden bg-[#1b1b1b]/95 backdrop-blur-lg border-t border-white/10">
            <div className="px-4 py-4 space-y-3">
              <button onClick={() => scrollToSection('features')} className="block w-full text-left py-2 text-gray-300 hover:text-[#1db588]">Fonctionnalités</button>
              <button onClick={() => scrollToSection('cities')} className="block w-full text-left py-2 text-gray-300 hover:text-[#1db588]">Villes</button>
              <button onClick={() => scrollToSection('energy')} className="block w-full text-left py-2 text-gray-300 hover:text-[#1db588]">Énergie</button>
              <button onClick={() => scrollToSection('environment')} className="block w-full text-left py-2 text-gray-300 hover:text-[#1db588]">Environnement</button>
              <button onClick={() => scrollToSection('pricing')} className="block w-full text-left py-2 text-gray-300 hover:text-[#1db588]">Tarifs</button>
              <Button className="w-full bg-[#1db588] hover:bg-[#1a8c6d] text-white mt-4">
                <Download className="w-4 h-4 mr-2" />
                Télécharger l'App
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="landing-hero-background absolute inset-0" />
        <div className="absolute inset-0 noise-overlay opacity-20" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          {authError && (
            <div role="alert" className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              Impossible de restaurer la session : {authError}
            </div>
          )}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1db588]/10 border border-[#1db588]/30">
                <Leaf className="w-4 h-4 text-[#1db588]" />
                <span className="text-sm text-[#1db588]">Le premier parking vert au Maroc</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-['Poppins'] leading-tight">
                Stationnement{' '}
                <span className="text-gradient">Intelligent</span>
                {' '}pour un Maroc Vert
              </h1>

              <p className="text-lg text-gray-400 max-w-xl">
                Trouvez, réservez et garez-vous en toute simplicité tout en participant à la transition écologique.
                Production solaire, recharge VE, et réduction de votre empreinte carbone.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-[#1db588] hover:bg-[#1a8c6d] text-white rounded-full px-8 h-14 text-base" onClick={() => navigate('auth')}>
                  <Download className="w-5 h-5 mr-2" />
                  Commencer Gratuitement
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 rounded-full px-8 h-14 text-base"
                  onClick={() => scrollToSection('cities')}
                >
                  <MapPin className="w-5 h-5 mr-2" />
                  Explorer les Parkings
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-[#1db588]">{countLabel(parkingLots.length)}</div>
                  <div className="text-sm text-gray-400">Parkings dans la base</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-[#1db588]">{countLabel(cityCount)}</div>
                  <div className="text-sm text-gray-400">Villes couvertes</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-[#1db588]">{countLabel(totalAvailable)}</div>
                  <div className="text-sm text-gray-400">Places disponibles</div>
                </div>
              </div>
              {parkingError && <p role="alert" className="text-sm text-red-300">Données de parkings indisponibles : {parkingError}</p>}
            </div>

            <div className="relative lg:pl-8">
              <div className="relative animate-float">
                <img
                  src="/dashboard-mockup.jpg"
                  alt="EcoPark Dashboard"
                  className="rounded-2xl shadow-2xl shadow-[#1db588]/20 border border-white/10"
                />

                <div className="absolute -top-6 -left-6 glass-card p-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1db588]/20 flex items-center justify-center">
                      <Car className="w-5 h-5 text-[#1db588]" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Places disponibles (API)</div>
                      <div className="text-xl font-bold">{countLabel(totalAvailable)}</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-6 -right-6 glass-card p-4 animate-fade-in" style={{ animationDelay: '0.7s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#2ec595]/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-[#2ec595]" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Bornes VE disponibles</div>
                      <div className="text-xl font-bold">{countLabel(totalEvAvailable)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-['Poppins'] mb-4">
              Fonctionnalités <span className="text-gradient">Clés</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Une solution complète qui combine technologie de pointe et engagement environnemental
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Clock, title: 'Réservation en Temps Réel', desc: 'Trouvez et réservez votre place instantanément', color: 'green' },
              { icon: CreditCard, title: 'Paiement Sans Contact', desc: 'Payez en un clic avec votre smartphone', color: 'white' },
              { icon: Navigation, title: 'Guidage GPS Intelligent', desc: 'Navigation optimisée jusqu\'à votre place', color: 'white' },
              { icon: TrendingUp, title: 'Tarification Dynamique', desc: 'Prix adaptés à la demande en temps réel', color: 'green' },
              { icon: Leaf, title: 'Impact Carbone', desc: 'Suivez votre contribution environnementale', color: 'green' },
              { icon: Battery, title: 'Recharge VE Intégrée', desc: 'Bornes de recharge à chaque parking', color: 'white' },
            ].map((feature, index) => (
              <Card 
                key={index} 
                className={`glass-card-hover group cursor-pointer ${
                  feature.color === 'green' ? 'border-[#1db588]/30' : ''
                }`}
              >
                <CardContent className="p-8">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 ${
                    feature.color === 'green' 
                      ? 'bg-[#1db588]/20 text-[#1db588]' 
                      : 'bg-white/10 text-white'
                  }`}>
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Cities Section */}
      <section id="cities" className="py-20 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-['Poppins'] mb-4">
              Nos <span className="text-gradient">Villes</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Disponible dans les principales villes du Maroc avec des parkings intelligents et écologiques
            </p>
          </div>

          {/* City Selector */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {cityCatalog.filter(city => parkingLots.some(lot => lot.cityId === city.id)).map((city) => (
              <button
                key={city.id}
                onClick={() => setSelectedCityId(city.id)}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedCityId === city.id
                    ? 'bg-[#1db588] text-white shadow-lg shadow-[#1db588]/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {city.name}
              </button>
            ))}
          </div>

          {/* City Content */}
          {parkingLoading && parkingLots.length === 0 && <p className="text-center text-gray-400">Chargement des parkings…</p>}
          {parkingError && <p role="alert" className="mb-6 text-center text-sm text-red-300">Impossible de charger les parkings : {parkingError}</p>}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* City Image */}
            <div className="relative rounded-2xl overflow-hidden group">
              <img 
                src={selectedCity.image} 
                alt={selectedCity.name}
                className="w-full h-[300px] lg:h-[400px] object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1b1b1b] via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6">
                <h3 className="text-3xl font-bold font-['Poppins']">{selectedCity.name}</h3>
                <p className="text-[#1db588] text-lg">{selectedCity.nameAr}</p>
              </div>
            </div>

            {/* Parking Lots List */}
            <div className="space-y-4">
              <h4 className="text-xl font-semibold mb-4">Parkings disponibles</h4>
              {selectedCityLots.map((lot) => (
                <Dialog key={lot.id}>
                  <DialogTrigger asChild>
                    <div className="glass-card-hover p-4 cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[#1db588]/10 flex items-center justify-center">
                            <ParkingCircle className="w-6 h-6 text-[#1db588]" />
                          </div>
                          <div>
                            <h5 className="font-medium group-hover:text-[#1db588] transition-colors">{lot.name}</h5>
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <Car className="w-3 h-3" />
                                {lot.capacity} places
                              </span>
                              <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                {lot.evCharging} bornes
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`${
                            lot.available > 100 ? 'bg-[#1db588]' : lot.available > 50 ? 'bg-yellow-500' : 'bg-red-500'
                          } text-white mb-1`}>
                            {lot.available} libres
                          </Badge>
                          <div className="text-sm text-gray-400">{lot.price} MAD/h</div>
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-[#2b2b2b] border-white/10 text-white max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-['Poppins']">{lot.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <img 
                        src="/parking-lot-1.jpg" 
                        alt={lot.name}
                        className="w-full h-48 object-cover rounded-xl"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="glass-card p-4 text-center">
                          <Car className="w-6 h-6 text-[#1db588] mx-auto mb-2" />
                          <div className="text-2xl font-bold">{lot.capacity}</div>
                          <div className="text-sm text-gray-400">Places totales</div>
                        </div>
                        <div className="glass-card p-4 text-center">
                          <div className="text-2xl font-bold text-[#1db588]">{lot.available}</div>
                          <div className="text-sm text-gray-400">Places disponibles</div>
                        </div>
                        <div className="glass-card p-4 text-center">
                          <Zap className="w-6 h-6 text-[#2ec595] mx-auto mb-2" />
                          <div className="text-2xl font-bold">{lot.evCharging}</div>
                          <div className="text-sm text-gray-400">Bornes VE</div>
                        </div>
                        <div className="glass-card p-4 text-center">
                          <Wallet className="w-6 h-6 text-[#1db588] mx-auto mb-2" />
                          <div className="text-2xl font-bold">{lot.price}</div>
                          <div className="text-sm text-gray-400">MAD/heure</div>
                        </div>
                      </div>
                      <Button className="w-full bg-[#1db588] hover:bg-[#1a8c6d]">
                        <Navigation className="w-4 h-4 mr-2" />
                        Y aller
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Energy Section */}
      <section id="energy" className="py-20 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1db588]/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-['Poppins'] mb-4">
              Gestion <span className="text-gradient">Énergétique</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Production locale, stockage intelligent et intégration au réseau national
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Energy Dashboard */}
            <div className="relative">
              <img 
                src="/energy-dashboard.jpg" 
                alt="Energy Dashboard"
                className="rounded-2xl shadow-2xl border border-white/10"
              />
              
              {/* Floating Stats */}
              <div className="absolute -top-4 -right-4 glass-card p-4">
                <div className="flex items-center gap-2">
                  <Sun className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm font-medium">78 kW max. estimés</span>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 glass-card p-4">
                <div className="flex items-center gap-2">
                  <Battery className="w-5 h-5 text-[#1db588]" />
                  <span className="text-sm font-medium">500 kWh de stockage prévus</span>
                </div>
              </div>
            </div>

            {/* Energy Features */}
            <div className="space-y-6">
              <Card className="glass-card-hover border-[#1db588]/20">
                <CardContent className="p-8">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-xl bg-yellow-400/20 flex items-center justify-center flex-shrink-0">
                      <Sun className="w-7 h-7 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-3">Ombrières Photovoltaïques</h3>
                      <p className="text-gray-400 leading-relaxed mb-4">
                        Estimation de projet : 160,000 kWh/an. La production réelle n'est pas encore mesurée par l'application.
                      </p>
                      <div className="flex items-center gap-2 text-[#1db588] text-sm">
                        <TrendingUp className="w-4 h-4" />
                        <span>Économie: 180,000 MAD/an</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card-hover border-[#1db588]/20">
                <CardContent className="p-8">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-xl bg-[#1db588]/20 flex items-center justify-center flex-shrink-0">
                      <Battery className="w-7 h-7 text-[#1db588]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-3">Stockage Batteries</h3>
                      <p className="text-gray-400 leading-relaxed mb-4">
                        Batterie de 500 kWh prévue pour le stockage énergétique et l'arbitrage tarifaire
                      </p>
                      <div className="flex items-center gap-2 text-[#1db588] text-sm">
                        <TrendingUp className="w-4 h-4" />
                        <span>Revenus V2G: 30,000 MAD/an</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card-hover border-[#1db588]/20">
                <CardContent className="p-8">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-xl bg-[#2ec595]/20 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-7 h-7 text-[#2ec595]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-3">Bornes de Recharge VE</h3>
                      <p className="text-gray-400 leading-relaxed mb-4">
                        3 niveaux de recharge: Lente (3.7kW), Rapide (22kW), Supercharge (150kW)
                      </p>
                      <div className="flex items-center gap-2 text-[#1db588] text-sm">
                        <TrendingUp className="w-4 h-4" />
                        <span>Revenus recharge: 120,000 MAD/an</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ONEE Integration */}
          <div className="mt-16">
            <Card className="glass-card border-[#1db588]/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1db588]/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-[#1db588]" />
                  </div>
                  Intégration ONEE - Tarification Dynamique
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="glass-card p-6 text-center">
                    <div className="text-base text-gray-400 mb-3">23h - 06h (Creux)</div>
                    <div className="text-4xl font-bold text-[#1db588]">{energyPricing.offPeak}</div>
                    <div className="text-base text-gray-400">MAD/kWh</div>
                    <div className="mt-3 text-sm text-[#1db588]">Recharge batteries + VE</div>
                  </div>
                  <div className="glass-card p-6 text-center">
                    <div className="text-base text-gray-400 mb-3">06h - 17h (Normal)</div>
                    <div className="text-4xl font-bold text-yellow-400">{energyPricing.normal}</div>
                    <div className="text-base text-gray-400">MAD/kWh</div>
                    <div className="mt-3 text-sm text-yellow-400">Autoconsommation solaire</div>
                  </div>
                  <div className="glass-card p-6 text-center">
                    <div className="text-base text-gray-400 mb-3">17h - 23h (Pic)</div>
                    <div className="text-4xl font-bold text-orange-400">{energyPricing.peak}</div>
                    <div className="text-base text-gray-400">MAD/kWh</div>
                    <div className="mt-3 text-sm text-orange-400">Vente surplus → ONEE</div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-[#1db588]/10 rounded-xl border border-[#1db588]/30">
                  <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-[#1db588] flex-shrink-0" />
                    <p className="text-sm text-gray-300">
                      <span className="text-[#1db588] font-medium">V2G (Vehicle-to-Grid):</span>{' '}
                      Vos véhicules électriques deviennent des batteries mobiles. Pendant les heures de pic, 
                      vendez l'énergie stockée dans votre batterie au réseau ONEE et générez des revenus.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Environment Section */}
      <section id="environment" className="py-20 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-['Poppins'] mb-4">
              Impact <span className="text-gradient">Environnemental</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Chaque stationnement contribue à un avenir plus vert pour le Maroc
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Estimations indicatives du projet — ces chiffres ne sont pas des mesures en temps réel.
            </p>
          </div>

          <div ref={statsRef} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="glass-card border-[#1db588]/20 text-center">
              <CardContent className="p-6">
                <div className="w-16 h-16 rounded-full bg-[#1db588]/20 flex items-center justify-center mx-auto mb-4">
                  <Leaf className="w-8 h-8 text-[#1db588]" />
                </div>
                <div className="text-4xl font-bold text-[#1db588] mb-2">{animatedStats.co2}</div>
                <div className="text-sm text-gray-400">Tonnes CO₂ économisées/an</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-[#1db588]/20 text-center">
              <CardContent className="p-6">
                <div className="w-16 h-16 rounded-full bg-[#2ec595]/20 flex items-center justify-center mx-auto mb-4">
                  <Trees className="w-8 h-8 text-[#2ec595]" />
                </div>
                <div className="text-4xl font-bold text-[#2ec595] mb-2">{animatedStats.trees.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Équivalent arbres plantés</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-[#1db588]/20 text-center">
              <CardContent className="p-6">
                <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center mx-auto mb-4">
                  <Sun className="w-8 h-8 text-yellow-400" />
                </div>
                <div className="text-4xl font-bold text-yellow-400 mb-2">{animatedStats.energy.toLocaleString()}</div>
                <div className="text-sm text-gray-400">kWh produits/an</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-[#1db588]/20 text-center">
              <CardContent className="p-6">
                <div className="w-16 h-16 rounded-full bg-[#1db588]/20 flex items-center justify-center mx-auto mb-4">
                  <Car className="w-8 h-8 text-[#1db588]" />
                </div>
                <div className="text-4xl font-bold text-[#1db588] mb-2">{(animatedStats.evKm / 1000).toFixed(0)}K</div>
                <div className="text-sm text-gray-400">km VE/an</div>
              </CardContent>
            </Card>
          </div>

          {/* Environmental Breakdown */}
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Réduction CO₂ par Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Réduction temps de recherche</span>
                    <span className="text-[#1db588]">45%</span>
                  </div>
                  <Progress value={45} className="h-2 bg-white/10" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Énergie solaire produite</span>
                    <span className="text-[#1db588]">38%</span>
                  </div>
                  <Progress value={38} className="h-2 bg-white/10" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Recharge VE vs essence</span>
                    <span className="text-[#1db588]">17%</span>
                  </div>
                  <Progress value={17} className="h-2 bg-white/10" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Objectifs Maroc 2050</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#1db588]/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-[#1db588]" />
                    </div>
                    <div>
                      <div className="font-medium">80% Énergies Renouvelables</div>
                      <div className="text-sm text-gray-400">Production solaire locale</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#1db588]/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-[#1db588]" />
                    </div>
                    <div>
                      <div className="font-medium">Réduction CO₂ de 45%</div>
                      <div className="text-sm text-gray-400">150 tonnes/an économisés</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#1db588]/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-[#1db588]" />
                    </div>
                    <div>
                      <div className="font-medium">2,500 Bornes VE</div>
                      <div className="text-sm text-gray-400">Infrastructure intégrée</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1db588]/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-['Poppins'] mb-4">
              Nos <span className="text-gradient">Tarifs</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Choisissez le forfait qui correspond à vos besoins
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`glass-card relative ${
                  plan.popular 
                    ? 'border-[#1db588] scale-105 shadow-xl shadow-[#1db588]/20' 
                    : 'border-white/10'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#1db588] text-white px-4 py-1">Plus Populaire</Badge>
                  </div>
                )}
                <CardContent className="p-8">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <p className="text-gray-400 text-sm mb-6">{plan.description}</p>
                  
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-400"> MAD/{plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[#1db588] flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    onClick={() => navigate('auth')}
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-[#1db588] hover:bg-[#1a8c6d] text-white' 
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden">
            <img 
              src="/parking-lot-2.jpg" 
              alt="Smart Parking"
              className="w-full h-[400px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1b1b1b] via-[#1b1b1b]/80 to-transparent" />
            
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-xl ml-8 lg:ml-16">
                <h2 className="text-3xl sm:text-4xl font-bold font-['Poppins'] mb-4">
                  Prêt à rejoindre la révolution verte?
                </h2>
                <p className="text-gray-300 mb-8">
                  Téléchargez l'application EcoPark Maroc dès maintenant et commencez à réduire 
                  votre empreinte carbone tout en profitant d'un stationnement intelligent.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="bg-[#1db588] hover:bg-[#1a8c6d] text-white rounded-full px-8">
                    <Download className="w-5 h-5 mr-2" />
                    App Store
                  </Button>
                  <Button size="lg" className="bg-white/10 hover:bg-white/20 text-white rounded-full px-8">
                    <Download className="w-5 h-5 mr-2" />
                    Google Play
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1db588] to-[#2ec595] flex items-center justify-center">
                  <ParkingCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-xl font-bold font-['Poppins']">EcoPark</span>
                  <span className="text-[#1db588] text-sm ml-1">Maroc</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-6">
                Le premier réseau de parkings intelligents et écologiques au Maroc. 
                Production solaire, recharge VE, et réduction de l'empreinte carbone.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#1db588]/20 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#1db588]/20 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#1db588]/20 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">Liens Rapides</h4>
              <ul className="space-y-3">
                <li><button onClick={() => scrollToSection('features')} className="text-gray-400 hover:text-[#1db588] transition-colors text-sm">Fonctionnalités</button></li>
                <li><button onClick={() => scrollToSection('cities')} className="text-gray-400 hover:text-[#1db588] transition-colors text-sm">Nos Villes</button></li>
                <li><button onClick={() => scrollToSection('energy')} className="text-gray-400 hover:text-[#1db588] transition-colors text-sm">Énergie</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="text-gray-400 hover:text-[#1db588] transition-colors text-sm">Tarifs</button></li>
              </ul>
            </div>

            {/* Cities */}
            <div>
              <h4 className="font-semibold mb-4">Villes</h4>
              <ul className="space-y-3">
                <li><span className="text-gray-400 text-sm">Casablanca</span></li>
                <li><span className="text-gray-400 text-sm">Marrakech</span></li>
                <li><span className="text-gray-400 text-sm">Rabat</span></li>
                <li><span className="text-gray-400 text-sm">Tanger</span></li>
                <li><span className="text-gray-400 text-sm">Agadir</span></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#1db588]" />
                  <span className="text-gray-400 text-sm">contact@ecopark.ma</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#1db588]" />
                  <span className="text-gray-400 text-sm">+212 5XX-XXXXXX</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © 2026 EcoPark Maroc. Tous droits réservés.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-gray-400 hover:text-[#1db588] transition-colors text-sm">Politique de confidentialité</a>
              <a href="#" className="text-gray-400 hover:text-[#1db588] transition-colors text-sm">Conditions d'utilisation</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
