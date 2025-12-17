import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Componente de pantalla de carga mientras el service worker se activa
 * Muestra animaciones temáticas del túnel del tiempo
 */
export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Iniciando el túnel del tiempo...");

  useEffect(() => {
    // Simular progreso de carga
    const messages = [
      "Iniciando el túnel del tiempo...",
      "Cargando productos coleccionables...",
      "Preparando la experiencia...",
      "Casi listo...",
    ];

    let currentProgress = 0;
    let messageIndex = 0;

    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress > 100) currentProgress = 100;

      setProgress(currentProgress);

      // Cambiar mensaje según el progreso
      if (currentProgress > 25 && messageIndex === 0) {
        messageIndex = 1;
        setMessage(messages[1]);
      } else if (currentProgress > 50 && messageIndex === 1) {
        messageIndex = 2;
        setMessage(messages[2]);
      } else if (currentProgress > 75 && messageIndex === 2) {
        messageIndex = 3;
        setMessage(messages[3]);
      }

      if (currentProgress >= 100) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Efecto de túnel animado de fondo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="tunnel-layer tunnel-layer-1 tunnel-intense"></div>
        <div className="tunnel-layer tunnel-layer-2 tunnel-intense"></div>
        <div className="tunnel-layer tunnel-layer-3 tunnel-intense"></div>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-8 px-4">
        {/* Logo animado */}
        <div className="animate-float">
          <Image
            src="/img/tunel-logo-simple.svg"
            alt="TUNEL DEL TIEMPO"
            width={200}
            height={100}
            className="filter drop-shadow-2xl"
            unoptimized
          />
        </div>

        {/* Título */}
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center animate-pulse">
          TÚNEL DEL TIEMPO
        </h1>

        {/* Mensaje de carga */}
        <p className="text-xl md:text-2xl text-white/90 text-center font-medium">
          {message}
        </p>

        {/* Barra de progreso */}
        <div className="w-full max-w-md">
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 ease-out tunnel-shimmer"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-center text-white/70 mt-2 text-sm">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Partículas flotantes */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/30 rounded-full animate-pulse"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 3) * 20}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + i * 0.5}s`,
              }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}

