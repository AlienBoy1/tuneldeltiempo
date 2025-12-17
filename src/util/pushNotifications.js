// Utilidades para manejar push notifications
// Sistema simplificado y robusto

/**
 * Espera a que el service worker esté completamente listo
 */
async function waitForServiceWorker(maxAttempts = 20, delayMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.active) {
        return registration;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Service Worker no está disponible después de múltiples intentos");
}

/**
 * Convierte una URL base64 a Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Convierte un ArrayBuffer a base64
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Solicita permisos de notificación
 */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    throw new Error("Este navegador no soporta notificaciones");
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    throw new Error("Los permisos de notificación están denegados. Por favor, habilítalos en la configuración de tu navegador.");
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

/**
 * Verifica que el usuario esté autenticado antes de suscribirse
 */
async function ensureAuthenticated() {
  // Primero verificar si hay sesión en window (más rápido)
  if (window.__USER_EMAIL__) {
    return true;
  }

  // Si no, intentar obtener la sesión desde el servidor
  try {
    const sessionResponse = await fetch("/api/auth/session", {
      credentials: "include",
    });
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      if (sessionData && sessionData.user && sessionData.user.email) {
        window.__USER_EMAIL__ = sessionData.user.email;
        return true;
      }
    }
  } catch (error) {
    console.warn("⚠️ No se pudo verificar la sesión:", error);
  }

  return false;
}

/**
 * Suscribe al usuario a las notificaciones push
 * NOTA: El servidor obtiene el userId de la sesión automáticamente
 */
export async function subscribeToPushNotifications() {
  try {
    // 1. Verificar que el usuario esté autenticado
    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
      throw new Error("Debes iniciar sesión para activar las notificaciones. Por favor, inicia sesión e intenta de nuevo.");
    }

    // 2. Verificar que el service worker esté disponible
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service Worker no está disponible en este navegador");
    }

    if (!("PushManager" in window)) {
      throw new Error("Push notifications no están disponibles en este navegador");
    }

    // 3. Verificar HTTPS en móviles
    const isHTTPS = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isHTTP = typeof window !== 'undefined' && window.location.protocol === 'http:';
    const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile && isHTTP) {
      throw new Error(
        "Las notificaciones push requieren HTTPS en dispositivos móviles. " +
        "Para desarrollo local, usa ngrok (ngrok http 3000) o despliega la aplicación en producción con HTTPS."
      );
    }

    // 4. Esperar a que el service worker esté completamente listo
    console.log("⏳ Esperando a que el service worker esté listo...");
    let registration;
    try {
      registration = await waitForServiceWorker(20, 1000);
      console.log("✅ Service Worker listo");
      
      // Esperar un momento adicional para asegurar que el listener de push esté registrado
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e) {
      throw new Error("No se pudo obtener el registro del service worker. Asegúrate de que esté registrado y activo. Intenta recargar la página completamente (Ctrl+F5) y espera 10 segundos antes de intentar de nuevo.");
    }

    // 5. Verificar que el pushManager esté disponible
    if (!registration.pushManager) {
      throw new Error("PushManager no está disponible en el service worker");
    }

    // 6. Obtener la VAPID public key
    console.log("📡 Obteniendo clave VAPID...");
    let vapidKey = null;
    try {
      const r = await fetch("/api/push/vapid", {
        credentials: "include",
      });
      if (r.ok) {
        const data = await r.json();
        vapidKey = data.publicKey;
        console.log("✅ Clave VAPID obtenida");
      } else {
        throw new Error(`No se pudo obtener la clave VAPID (status: ${r.status})`);
      }
    } catch (e) {
      throw new Error("No se pudo obtener la clave VAPID. Verifica la configuración del servidor.");
    }

    if (!vapidKey) {
      throw new Error("No se pudo obtener la clave VAPID. Verifica la configuración del servidor.");
    }

    // 7. Convertir la clave VAPID a Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidKey);

    // 8. Verificar permisos de notificación
    if (Notification.permission !== "granted") {
      throw new Error("Los permisos de notificación no están concedidos");
    }

    // 9. Crear la suscripción
    console.log("🚀 Creando suscripción push...");
    let subscription;
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      console.log("✅ Suscripción creada exitosamente");
    } catch (subscribeError) {
      if (subscribeError.name === 'AbortError') {
        throw new Error(
          "Error al suscribirse. Esto puede ocurrir en localhost con algunos navegadores. " +
          "Soluciones: 1) Usa Chrome o Firefox para desarrollo, 2) Despliega en HTTPS para producción, " +
          "3) Usa ngrok para crear un túnel HTTPS (ngrok http 3000)"
        );
      }
      throw subscribeError;
    }
          
    // 10. Convertir la suscripción a formato JSON
    const subscriptionJson = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
        auth: arrayBufferToBase64(subscription.getKey("auth")),
      },
    };

    // 11. Enviar la suscripción al servidor
    // NOTA: El servidor obtiene el userId de la sesión automáticamente
    console.log("📤 Enviando suscripción al servidor...");
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscription: subscriptionJson,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 401) {
        throw new Error("No estás autenticado. Por favor, inicia sesión e intenta de nuevo.");
      }
      
      throw new Error(errorData.message || `Error al guardar la suscripción (status: ${response.status})`);
    }

    console.log("✅ Suscripción guardada exitosamente en el servidor");
    return subscription;
  } catch (error) {
    console.error("❌ Error suscribiéndose a push notifications:", error);
    throw error;
  }
}

/**
 * Desuscribe de las notificaciones push
 */
export async function unsubscribeFromPushNotifications() {
  try {
    if (!("serviceWorker" in navigator)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return false;
    }

    // Desuscribirse localmente
    await subscription.unsubscribe();

    // Notificar al servidor (opcional, pero recomendado)
    try {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.warn("⚠️ Error notificando al servidor sobre la desuscripción:", error);
      // No fallar si el servidor no responde
    }

    return true;
  } catch (error) {
    console.error("❌ Error desuscribiéndose:", error);
    return false;
  }
}

/**
 * Verifica si el usuario está suscrito a las notificaciones push
 */
export async function checkSubscriptionStatus() {
  try {
    if (!("serviceWorker" in navigator)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    console.error("Error verificando suscripción:", error);
    return false;
  }
}

/**
 * Verifica y renueva suscripciones automáticamente (solo si el usuario está autenticado)
 */
export async function checkAndRenewSubscriptions() {
  try {
    // Verificar autenticación primero
    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
      return; // Usuario no autenticado, no hacer nada
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Si no hay suscripción pero hay permisos, intentar suscribirse automáticamente
      if (Notification.permission === "granted") {
        console.log("🔄 No hay suscripción activa, intentando suscribirse automáticamente...");
        try {
          await subscribeToPushNotifications();
          console.log("✅ Suscripción renovada automáticamente");
        } catch (error) {
          // Silenciar errores de autenticación o permisos
          if (!error.message?.includes("autenticado") && !error.message?.includes("permisos")) {
            console.warn("⚠️ No se pudo renovar la suscripción automáticamente:", error.message);
          }
        }
      }
      return;
    }

    console.log("✅ Suscripción activa encontrada");
  } catch (error) {
    // Silenciar errores de autenticación
    if (!error.message?.includes("autenticado")) {
      console.error("Error verificando suscripciones:", error);
    }
  }
}
