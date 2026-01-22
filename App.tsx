import React, { useState, useEffect } from 'react';
import { UserProfile, ShiftLog } from './types';
import { saveProfile, getProfile, saveLog, getLogs } from './services/storageService';
import { Button } from './components/Button';
import { CameraCapture } from './components/CameraCapture';
import { History } from './components/History';
import { Bike, User, MapPin, Camera as CameraIcon, AlertTriangle, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<ShiftLog[]>([]);
  const [view, setView] = useState<'ONBOARDING' | 'DASHBOARD' | 'CAMERA'>('ONBOARDING');
  const [captureMode, setCaptureMode] = useState<'START' | 'END' | null>(null);

  // Form states for onboarding
  const [formData, setFormData] = useState({ name: '', bikeModel: '', plate: '', company: '' });

  // Load initial data
  useEffect(() => {
    const checkLogin = () => {
      try {
        const savedProfile = getProfile();
        if (savedProfile) {
          setProfile(savedProfile);
          setLogs(getLogs());
          setView('DASHBOARD');
        }
      } catch (e) {
        console.error("Erro ao carregar dados locais", e);
      } finally {
        // Small timeout to prevent flicker
        setTimeout(() => setLoading(false), 800);
      }
    };
    
    checkLogin();
  }, []);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.plate) {
      saveProfile(formData);
      setProfile(formData);
      setView('DASHBOARD');
    }
  };

  const startCapture = (mode: 'START' | 'END') => {
    setCaptureMode(mode);
    setView('CAMERA');
  };

  const handleCaptureResult = (imageSrc: string, locationText: string, confirmedOdometer: number) => {
    // Return to dashboard
    setView('DASHBOARD');
    
    const newLog: ShiftLog = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: captureMode!,
      odometer: confirmedOdometer,
      photoUrl: imageSrc, 
      locationText: locationText,
      timestamp: Date.now()
    };
    
    saveLog(newLog);
    setLogs(getLogs());
    setCaptureMode(null);
  };

  const refreshLogs = () => {
    setLogs(getLogs());
  };

  // --- VIEWS ---

  // 1. Loading Splash Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-urban-900 flex flex-col items-center justify-center">
         <div className="animate-pulse flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-urban-blue mb-4 shadow-lg shadow-blue-500/20">
              <Bike className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">MOTO HELP <span className="text-urban-blue">PRO KM</span></h1>
            <Loader2 className="w-6 h-6 text-urban-blue animate-spin mt-6" />
         </div>
      </div>
    );
  }

  // 2. Onboarding / Login (Only if no profile saved)
  if (view === 'ONBOARDING') {
    return (
      <div className="min-h-screen bg-urban-900 flex flex-col justify-center px-6 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-urban-blue mb-4 shadow-lg shadow-blue-500/20">
            <Bike className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">MOTO HELP <span className="text-urban-blue">PRO KM</span></h1>
          <p className="text-gray-400 mt-2">Controle de rodagem urbano</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 max-w-md mx-auto w-full">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nome Completo</label>
            <input 
              type="text" 
              required
              className="w-full bg-urban-800 border border-urban-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-urban-blue focus:outline-none"
              placeholder="Ex: João da Silva"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Empresa</label>
            <input 
              type="text" 
              required
              className="w-full bg-urban-800 border border-urban-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-urban-blue focus:outline-none"
              placeholder="Ex: Logística Express"
              value={formData.company}
              onChange={e => setFormData({...formData, company: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Modelo Moto</label>
              <input 
                type="text" 
                required
                className="w-full bg-urban-800 border border-urban-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-urban-blue focus:outline-none"
                placeholder="Ex: CG 160"
                value={formData.bikeModel}
                onChange={e => setFormData({...formData, bikeModel: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Placa</label>
              <input 
                type="text" 
                required
                className="w-full bg-urban-800 border border-urban-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-urban-blue focus:outline-none"
                placeholder="ABC-1234"
                value={formData.plate}
                onChange={e => setFormData({...formData, plate: e.target.value})}
              />
            </div>
          </div>
          <Button type="submit" fullWidth className="mt-6">
            Entrar / Salvar Dados
          </Button>
          <p className="text-xs text-center text-gray-500 mt-4">
            Seus dados ficarão salvos neste dispositivo.
          </p>
        </form>
      </div>
    );
  }

  // 3. Camera View
  if (view === 'CAMERA') {
    return (
      <CameraCapture 
        mode={captureMode || 'START'}
        onCapture={handleCaptureResult} 
        onCancel={() => setView('DASHBOARD')} 
      />
    );
  }

  // 4. Dashboard View (Logged In)
  const lastLog = logs.length > 0 ? logs[0] : null;
  const isWorking = lastLog?.type === 'START';

  // Logic to prevent multiple starts per day
  const todayDateString = new Date().toLocaleDateString('pt-BR');
  const hasStartedToday = logs.some(log => 
    log.type === 'START' && new Date(log.date).toLocaleDateString('pt-BR') === todayDateString
  );
  
  // Disable start if already working OR if already started today
  const isStartDisabled = isWorking || hasStartedToday;

  return (
    <div className="min-h-screen bg-urban-900 pb-20">
      {/* Header */}
      <header className="bg-urban-800 border-b border-urban-700 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-center sm:justify-between items-center relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-urban-700 flex items-center justify-center border border-urban-600">
              <User className="w-5 h-5 text-urban-blue" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">{profile?.name}</h2>
              <p className="text-xs text-gray-400">{profile?.bikeModel} • {profile?.plate}</p>
            </div>
          </div>
          {/* Logout button removed as requested */}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        
        {/* Status Card */}
        <div className="bg-gradient-to-r from-urban-800 to-urban-900 rounded-xl p-6 border border-urban-700 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-urban-blue/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Status Atual</h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${isWorking ? 'text-green-400' : 'text-gray-300'}`}>
              {isWorking ? 'EM ROTA' : (hasStartedToday ? 'FINALIZADO HOJE' : 'PARADO')}
            </span>
            {lastLog && (
              <span className="text-sm text-gray-500">
                Último registro: {lastLog.odometer}km
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Button 
              disabled={isStartDisabled} 
              onClick={() => startCapture('START')}
              className={`flex-col h-24 ${isStartDisabled ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
            >
              <CameraIcon className="w-6 h-6 mb-1" />
              <span>Abrir KM</span>
            </Button>
            <Button 
              variant="secondary" 
              disabled={!isWorking}
              onClick={() => startCapture('END')}
              className={`flex-col h-24 border-urban-blue ${!isWorking ? 'opacity-30 cursor-not-allowed' : 'border-2 border-urban-blue/50'}`}
            >
              <CameraIcon className="w-6 h-6 mb-1 text-urban-blue" />
              <span className="text-white">Fechar KM</span>
            </Button>
          </div>
          
          {hasStartedToday && !isWorking && (
            <div className="mt-4 flex items-center gap-2 text-yellow-500 text-xs bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
              <AlertTriangle className="w-4 h-4" />
              <span>Você já completou a jornada de hoje.</span>
            </div>
          )}
        </div>

        {/* Info Box regarding photos */}
        <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-4 flex gap-3">
          <MapPin className="w-5 h-5 text-urban-blue shrink-0" />
          <p className="text-sm text-blue-200/80">
            As fotos tiradas são salvas automaticamente na galeria do seu celular com data, hora e localização.
          </p>
        </div>

        {/* History Section */}
        <History logs={logs} profile={profile!} onDataChange={refreshLogs} />

      </main>
    </div>
  );
};

export default App;