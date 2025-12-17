import { useState, useEffect } from "react";
import Loader from "react-loader-spinner";

/**
 * Componente de carga que muestra el estado de la aplicación
 * mientras se cachea y se configuran los service workers
 */
export default function AppLoader({ onReady }) {
  const [status, setStatus] = useState({
    stage: "initializing", // initializing, caching, activating, ready, error
    message: "Iniciando aplicación...",
    progress: 0,
    error: null,
    showErrorDetails: false
  });

  useEffect(() => {
    let timeoutId;
    let isReady = false;

    const markAsReady = () => {
      if (isReady) return;
      isReady = true;
      setStatus(prev => ({
        ...prev,
        stage: "ready",
        message: "¡Aplicación lista!",
        progress: 100
      }));
      if (onReady) {
        onReady();
      }
    };

    const checkServiceWorker = async () => {
      try {
        // Etapa 1: Verificar compatibilidad (rápido)
        setStatus(prev => ({
          ...prev,
          stage: "initializing",
          message: "Verificando compatibilidad del navegador...",
          progress: 30
        }));

        await new Promise(resolve => setTimeout(resolve, 150));

        // Etapa 2: Verificar service worker (no bloquear si no está)
        setStatus(prev => ({
          ...prev,
          message: "Verificando Service Worker...",
          progress: 50
        }));

        if ("serviceWorker" in navigator) {
          try {
            const registration = await Promise.race([
              navigator.serviceWorker.getRegistration(),
              new Promise(resolve => setTimeout(() => resolve(null), 300))
            ]);
            
            if (registration) {
              setStatus(prev => ({
                ...prev,
                message: "Service Worker detectado",
                progress: 70
              }));
            }
          } catch (swError) {
            console.warn("Service Worker no disponible:", swError);
            // Continuar sin bloquear
          }
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        // Etapa 3: Verificar IndexedDB (rápido, no crítico)
        setStatus(prev => ({
          ...prev,
          message: "Configurando almacenamiento local...",
          progress: 80
        }));

        if ("indexedDB" in window) {
          try {
            const indexedDBService = (await import("../../util/IndexedDBService")).default;
            await Promise.race([
              indexedDBService.init(),
              new Promise(resolve => setTimeout(resolve, 300))
            ]);
          } catch (dbError) {
            console.warn("IndexedDB no disponible:", dbError);
            // No es crítico, continuar
          }
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        // Etapa 4: Verificar conexión (rápido, no crítico)
        setStatus(prev => ({
          ...prev,
          message: "Verificando conexión...",
          progress: 90
        }));

        try {
          await Promise.race([
            fetch("/api/categories", {
              method: "GET",
              credentials: "include",
              cache: "no-cache"
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 500))
          ]);
        } catch (fetchError) {
          // No es crítico, la app puede funcionar offline
          console.warn("Verificación de conexión:", fetchError.message);
        }

        // Etapa 5: Finalización
        setStatus(prev => ({
          ...prev,
          message: "Aplicación lista para usar",
          progress: 100
        }));

        await new Promise(resolve => setTimeout(resolve, 100));

        markAsReady();

      } catch (error) {
        console.error("Error en AppLoader:", error);
        // Aún así, marcar como ready para no bloquear la app
        setStatus(prev => ({
          ...prev,
          stage: "ready",
          message: "Aplicación lista (con advertencias)",
          progress: 100,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          }
        }));
        markAsReady();
      }
    };

    // Iniciar verificación
    checkServiceWorker();

    // Timeout de seguridad más corto (máximo 1 segundo)
    timeoutId = setTimeout(() => {
      if (!isReady) {
        console.log("AppLoader: Timeout de seguridad, marcando como ready");
        markAsReady();
      }
    }, 1000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [onReady]);

  const toggleErrorDetails = () => {
    setStatus(prev => ({
      ...prev,
      showErrorDetails: !prev.showErrorDetails
    }));
  };

  if (status.stage === "ready") {
    return null; // No mostrar nada cuando esté listo
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Efecto de túnel de fondo */}
      <div className="absolute inset-0 tunnel-wrapper">
        <div className="tunnel-layer tunnel-layer-1 tunnel-intense"></div>
        <div className="tunnel-layer tunnel-layer-2 tunnel-intense"></div>
        <div className="tunnel-layer tunnel-layer-3 tunnel-intense"></div>
      </div>

      <div className="relative z-10 max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
          {/* Logo o icono */}
          <div className="text-center mb-6">
            <div className="inline-block animate-pulse-glow">
              <Loader
                type="TailSpin"
                color="#6366f1"
                height={80}
                width={80}
              />
            </div>
          </div>

          {/* Mensaje principal */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              {status.stage === "error" ? "⚠️ Error" : "TUNEL DEL TIEMPO"}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
              {status.message}
            </p>
            
            {status.stage !== "error" && (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Espere mientras la aplicación se prepara para su uso online/offline
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg">
                  ⚠️ Es importante esperar para poder continuar con inicio de sesión o navegación de la aplicación
                </p>
              </>
            )}
          </div>

          {/* Barra de progreso */}
          {status.stage !== "error" && (
            <div className="mb-6">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${status.progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                {status.progress}% completado
              </p>
            </div>
          )}

          {/* Error details */}
          {status.stage === "error" && status.error && (
            <div className="mt-4">
              <button
                onClick={toggleErrorDetails}
                className="w-full text-left text-sm text-red-600 dark:text-red-400 hover:underline mb-2"
              >
                {status.showErrorDetails ? "Ocultar" : "Ver"} detalles del error
              </button>
              
              {status.showErrorDetails && (
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto max-h-64">
                  <div className="mb-2 text-yellow-400">
                    {status.error.name}: {status.error.message}
                  </div>
                  {status.error.stack && (
                    <pre className="whitespace-pre-wrap text-xs">
                      {status.error.stack}
                    </pre>
                  )}
                </div>
              )}

              <div className="mt-4 text-center">
                <button
                  onClick={() => window.location.reload()}
                  className="button px-6 py-2"
                >
                  Recargar Aplicación
                </button>
              </div>
            </div>
          )}

          {/* Indicador de estado */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className={`w-2 h-2 rounded-full ${
                status.stage === "error" 
                  ? "bg-red-500 animate-pulse" 
                  : status.stage === "ready"
                  ? "bg-green-500"
                  : "bg-blue-500 animate-pulse"
              }`}></div>
              <span>
                {status.stage === "error" 
                  ? "Error detectado" 
                  : status.stage === "ready"
                  ? "Listo"
                  : "Inicializando..."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

