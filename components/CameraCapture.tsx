import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, CheckCircle, MapPin, Save, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { readOdometer } from '../services/geminiService';

interface CameraCaptureProps {
  mode: 'START' | 'END';
  onCapture: (imageSrc: string, locationText: string, confirmedOdometer: number) => void;
  onCancel: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ mode, onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationText, setLocationText] = useState<string>("Buscando endereço...");
  const [processing, setProcessing] = useState(false);
  
  // Review State
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [manualKm, setManualKm] = useState<string>('');

  useEffect(() => {
    if (!capturedImage) {
      startCamera();
    }
    getLocation();

    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedImage]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setLoading(false);
          videoRef.current?.play();
        };
      }
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
      onCancel();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationText("Localização indisponível");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const date = new Date().toLocaleString('pt-BR');
        
        try {
            // Using Nominatim for reverse geocoding (OpenStreetMap)
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            
            if (data && data.address) {
                const road = data.address.road || data.address.pedestrian || data.address.footway || '';
                const number = data.address.house_number || '';
                const suburb = data.address.suburb || data.address.neighbourhood || '';
                const city = data.address.city || data.address.town || data.address.municipality || '';
                
                let addressLine = road;
                if (number) addressLine += `, ${number}`;
                if (suburb) addressLine += ` - ${suburb}`;
                if (city) addressLine += ` / ${city}`;
                
                if (addressLine.replace(/[^a-zA-Z0-9]/g, '').length > 0) {
                     setLocationText(`${addressLine}\n${date}`);
                } else {
                     setLocationText(`Lat: ${latitude.toFixed(5)}, Long: ${longitude.toFixed(5)}\n${date}`);
                }
            } else {
                setLocationText(`Lat: ${latitude.toFixed(5)}, Long: ${longitude.toFixed(5)}\n${date}`);
            }
        } catch (error) {
            console.error("Erro ao buscar endereço:", error);
             setLocationText(`Lat: ${latitude.toFixed(5)}, Long: ${longitude.toFixed(5)}\n${date}`);
        }
      },
      (error) => {
        console.error("Erro de localização:", error);
        setLocationText(`Localização não obtida\n${new Date().toLocaleString('pt-BR')}`);
      },
      { enableHighAccuracy: true }
    );
  };

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setProcessing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw Overlay
      const fontSize = Math.max(16, canvas.width / 25);
      const padding = 20;
      const lineHeight = fontSize * 1.5;
      
      // Semi-transparent bottom bar
      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(0, canvas.height - (lineHeight * 3), canvas.width, lineHeight * 3);

      // Text styles
      context.font = `bold ${fontSize}px sans-serif`;
      context.fillStyle = '#ffffff';
      context.textAlign = 'left';

      const lines = locationText.split('\n');
      lines.forEach((line, index) => {
        const maxWidth = canvas.width - (padding * 2);
        context.fillText(line, padding, canvas.height - (lineHeight * 2) + (index * lineHeight), maxWidth);
      });

      // Branding
      const brandingText = "MOTO HELP PRO KM";
      context.fillStyle = '#3b82f6'; // Blue
      const textWidth = context.measureText(brandingText).width;
      context.fillText(brandingText, canvas.width - padding - textWidth, canvas.height - padding);

      const imageSrc = canvas.toDataURL('image/jpeg', 0.85);
      
      // Stop camera stream now
      stopCamera();

      // Try AI OCR
      let detectedKm: number | null = null;
      if (process.env.API_KEY) {
         detectedKm = await readOdometer(imageSrc) || null;
      }
      
      setCapturedImage(imageSrc);
      if (detectedKm) {
        setManualKm(detectedKm.toString());
      }
      setProcessing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setManualKm('');
    setProcessing(false);
  };

  const handleConfirm = () => {
    if (!manualKm) {
      alert("Por favor, informe a quilometragem.");
      return;
    }
    const km = parseInt(manualKm);
    if (isNaN(km)) {
      alert("Quilometragem inválida.");
      return;
    }

    // Download image ONLY when confirmed
    try {
      const link = document.createElement('a');
      link.download = `motohelp_pro_${Date.now()}.jpg`;
      link.href = capturedImage!;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Erro ao salvar imagem", e);
    }

    onCapture(capturedImage!, locationText, km);
  };

  // --- RENDER ---

  // REVIEW MODE
  if (capturedImage) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex-1 relative bg-urban-900 overflow-y-auto">
          <img src={capturedImage} alt="Captura" className="w-full h-auto object-contain bg-black" />
          
          <div className="p-6 space-y-6 pb-24">
             <div>
                <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                   <MapPin className="text-urban-blue w-5 h-5" />
                   Localização Capturada
                </h3>
                <p className="text-gray-400 bg-urban-800 p-3 rounded-lg text-sm border border-urban-700">
                  {locationText}
                </p>
             </div>

             <div className="bg-urban-800 p-4 rounded-xl border border-urban-blue/30 shadow-lg shadow-blue-900/10">
                <label className="block text-urban-blue font-bold text-lg mb-2">
                  {mode === 'START' ? 'Quilometragem Inicial' : 'Quilometragem Final'}
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    inputMode="numeric"
                    placeholder="000000"
                    value={manualKm}
                    onChange={(e) => setManualKm(e.target.value)}
                    className="w-full bg-black border-2 border-urban-700 rounded-lg p-4 text-3xl font-mono text-white focus:border-urban-blue focus:outline-none focus:ring-1 focus:ring-urban-blue"
                    autoFocus
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">KM</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  *Verifique o valor lido na foto e corrija se necessário.
                </p>
             </div>
          </div>
        </div>

        <div className="p-4 bg-urban-900 border-t border-urban-700 flex gap-4 absolute bottom-0 w-full">
           <Button variant="secondary" onClick={handleRetake} className="flex-1">
              <RotateCcw className="w-4 h-4" /> Refazer
           </Button>
           <Button variant="primary" onClick={handleConfirm} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              <Save className="w-4 h-4" /> Salvar
           </Button>
        </div>
      </div>
    );
  }

  // CAMERA MODE
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <div className="absolute top-0 w-full p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
          <span className="text-white font-bold flex items-center gap-2">
            <span className="bg-urban-blue px-2 py-1 rounded text-xs uppercase font-bold tracking-wider">
               {mode === 'START' ? 'FOTO INICIAL' : 'FOTO FINAL'}
            </span>
          </span>
          <button onClick={onCancel} className="p-2 bg-white/10 rounded-full text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Viewfinder */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          {loading && <div className="text-urban-blue animate-pulse">Iniciando câmera...</div>}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute bottom-4 left-4 right-4 bg-black/60 p-2 rounded text-xs text-center text-white/80">
             {locationText}
          </div>
        </div>

        {/* Controls */}
        <div className="p-8 bg-black flex justify-center items-center gap-8">
           <button 
             onClick={takePhoto}
             disabled={loading || processing}
             className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent active:bg-white/20 transition-all disabled:opacity-50"
           >
             <div className="w-16 h-16 rounded-full bg-white"></div>
           </button>
        </div>
        
        {processing && (
           <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
             <RefreshCw className="w-10 h-10 text-urban-blue animate-spin mb-4" />
             <p className="text-white font-bold">Processando...</p>
           </div>
        )}
      </div>
    </div>
  );
};