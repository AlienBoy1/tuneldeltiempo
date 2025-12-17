import { useState, useEffect } from "react";
import { useSession } from "next-auth/client";
import { BellIcon } from "@heroicons/react/outline";
import { ExclamationCircleIcon } from "@heroicons/react/solid";
import { 
  requestNotificationPermission, 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications, 
  checkSubscriptionStatus,
  checkAndRenewSubscriptions 
} from "../../util/pushNotifications";
import NormalToast from "../../util/Toast/NormalToast";

function NotificationPrompt() {
  const [session, sessionLoading] = useSession();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  // Verificar estado de suscripción cuando cambia la sesión
  useEffect(() => {
    if ("serviceWorker" in navigator && session && !sessionLoading) {
      checkSubscription();
      
      // Verificar y renovar suscripciones expiradas cada 5 minutos
      const renewInterval = setInterval(() => {
        checkAndRenewSubscriptions().catch(console.error);
      }, 5 * 60 * 1000);
      
      return () => clearInterval(renewInterval);
    }
  }, [session, sessionLoading]);

  const checkSubscription = async () => {
    try {
      const subscribed = await checkSubscriptionStatus();
      setIsSubscribed(subscribed);
    } catch (error) {
      console.error("Error verificando suscripción:", error);
      setIsSubscribed(false);
    }
  };

  const handleSubscribe = async () => {
    // Verificar que el usuario esté autenticado
    if (!session || sessionLoading) {
      NormalToast("Debes iniciar sesión para recibir notificaciones", true);
      return;
    }

    // Verificar HTTPS en móviles
    const isHTTPS = window.location.protocol === 'https:';
    const isHTTP = window.location.protocol === 'http:';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile && isHTTP) {
      const hostname = window.location.hostname;
      const isLocalNetwork = hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');
      
      let errorMessage = "⚠️ Las notificaciones push requieren HTTPS en dispositivos móviles.\n\n";
      
      if (isLocalNetwork) {
        errorMessage += "Estás accediendo desde una IP local (http://). Para usar notificaciones push en móviles, necesitas HTTPS.\n\n";
        errorMessage += "Soluciones:\n";
        errorMessage += "1. Usa ngrok para crear un túnel HTTPS:\n";
        errorMessage += "   - Instala ngrok: https://ngrok.com/\n";
        errorMessage += "   - Ejecuta: ngrok http 3000\n";
        errorMessage += "   - Accede desde tu móvil usando la URL HTTPS de ngrok\n\n";
        errorMessage += "2. Configura HTTPS local (más complejo)\n\n";
        errorMessage += "3. Despliega la app en producción con HTTPS";
      } else {
        errorMessage += "La aplicación debe estar en HTTPS para que las notificaciones push funcionen en móviles.";
      }
      
      NormalToast(errorMessage, true);
      return;
    }

    // Advertencia para Edge en localhost
    const isEdge = navigator.userAgent.includes("Edg");
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isEdge && isLocal) {
      NormalToast(
        "⚠️ Edge no soporta push notifications en localhost. Usa Chrome/Firefox para desarrollo o despliega en HTTPS para producción.",
        true
      );
      return;
    }

    setIsLoading(true);
    try {
      // Verificar que el service worker esté disponible
      if (!("serviceWorker" in navigator)) {
        NormalToast("Tu navegador no soporta notificaciones push", true);
        setIsLoading(false);
        return;
      }

      // Verificar que PushManager esté disponible
      if (!("PushManager" in window)) {
        NormalToast("Las notificaciones push no están disponibles en tu navegador", true);
        setIsLoading(false);
        return;
      }

      // Solicitar permisos de notificación
      const hasPermission = await requestNotificationPermission();
      
      if (!hasPermission) {
        NormalToast("Se necesitan permisos de notificación. Por favor, permite las notificaciones en la configuración de tu navegador.", true);
        setIsLoading(false);
        return;
      }

      // Suscribirse a las notificaciones push
      // La función subscribeToPushNotifications maneja todo el proceso
      await subscribeToPushNotifications();
      
      setIsSubscribed(true);
      NormalToast("✅ Notificaciones activadas correctamente");
      
      // Verificar la suscripción después de un momento
      setTimeout(() => {
        checkSubscription();
      }, 1500);
    } catch (error) {
      console.error("❌ Error suscribiéndose:", error);
      
      // Mostrar mensaje de error específico
      let errorMessage = error.message || "Error al activar notificaciones";
      
      // Mensajes adicionales según el navegador
      const isBrave = navigator.userAgent.includes("Brave");
      const isEdge = navigator.userAgent.includes("Edg");
      const isChrome = navigator.userAgent.includes("Chrome") && !isEdge;
      
      if (error.name === "AbortError" || error.message?.includes("push service error")) {
        if (isBrave) {
          errorMessage += " Si usas Brave: 1) Verifica que los Shields no estén bloqueando las notificaciones, 2) Ve a brave://settings/content/notifications y permite las notificaciones para este sitio, 3) Recarga la página completamente.";
        } else if (isEdge) {
          errorMessage += " Para Edge: 1) Verifica que no haya extensiones bloqueando las notificaciones, 2) Intenta en modo InPrivate, 3) Verifica edge://settings/content/notifications.";
        } else if (isChrome) {
          errorMessage += " Para Chrome: 1) Verifica chrome://settings/content/notifications, 2) Asegúrate de que no haya extensiones bloqueando las notificaciones, 3) Intenta en modo incógnito.";
        }
      }
      
      NormalToast(errorMessage, true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const removed = await unsubscribeFromPushNotifications();
      if (removed) {
        setIsSubscribed(false);
        NormalToast("Notificaciones desactivadas");
      } else {
        NormalToast("No había suscripción activa", true);
      }
    } catch (error) {
      console.error("Error desuscribiéndose:", error);
      NormalToast("Error al desactivar notificaciones", true);
    } finally {
      setIsLoading(false);
    }
  };

  // No mostrar el componente si el usuario no está autenticado
  if (!session || sessionLoading) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {/* Botón de campana con alerta */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative bg-white shadow-lg rounded-full p-3 hover:shadow-xl transition-all duration-200 border border-gray-200 hover:border-primary-light"
        aria-label="Notificaciones"
      >
        <BellIcon className="w-6 h-6 text-primary-light" />
        {/* Icono de alerta encima de la campana si no está suscrito */}
        {!isSubscribed && (
          <div className="absolute -top-1 -right-1">
            <ExclamationCircleIcon className="w-4 h-4 text-yellow-500 bg-white rounded-full" />
          </div>
        )}
      </button>

      {/* Panel desplegable */}
      {showPanel && (
        <>
          {/* Overlay para cerrar al hacer clic fuera */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowPanel(false)}
          />
          <div className="absolute bottom-16 right-0 bg-white shadow-lg rounded-lg p-4 w-80 border border-gray-200 animate-slide-up z-50">
            <div className="flex items-start gap-3">
              <BellIcon className="w-6 h-6 text-primary-light flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-gray-800 mb-1">
                  Activar Notificaciones
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Recibe notificaciones sobre tus pedidos y ofertas especiales
                </p>
                {!isSubscribed ? (
                  <button
                    onClick={handleSubscribe}
                    disabled={isLoading}
                    className="button text-xs py-2 px-4 disabled:opacity-50 w-full"
                  >
                    {isLoading ? "Activando..." : "Activar Notificaciones"}
                  </button>
                ) : (
                  <button
                    onClick={handleUnsubscribe}
                    disabled={isLoading}
                    className="button text-xs py-2 px-4 disabled:opacity-50 bg-red-500 text-white w-full"
                  >
                    {isLoading ? "Desactivando..." : "Desactivar Notificaciones"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationPrompt;
