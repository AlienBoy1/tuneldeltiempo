import Router from "next/router";
import NProgress from "nprogress"; //nprogress module
import { Provider } from "react-redux";
import { store } from "../app/store";
import { Provider as NextAuthProvider, useSession } from "next-auth/client";
import { ToastContainer } from "react-toastify"; //styles of nprogress
import Layout from "../components/Layout/Layout";
import NotificationPrompt from "../components/NotificationPrompt/NotificationPrompt";
// Cargar polyfills primero para compatibilidad con iOS/Safari
import "../polyfills";
import "../styles/globals.css";
import "react-toastify/dist/ReactToastify.css";
import "nprogress/nprogress.css";
import { SWRConfig } from "swr";
import fetcher from "../util/fetch";
import { useEffect, useState } from "react";
import { useRef } from "react";
import offlineSync from "../util/OfflineSync";
import indexedDBService from "../util/IndexedDBService";
import NormalToast from "../util/Toast/NormalToast";
import OfflineBanner from "../components/OfflineBanner/OfflineBanner";
import OfflineLinkHandler from "../components/OfflineLink/OfflineLink";
import { ThemeProvider } from "../contexts/ThemeContext";
import { checkAndClearOldCache } from "../util/clearCache";
import AppLoader from "../components/AppLoader/AppLoader";

//Binding events.
Router.events.on("routeChangeStart", () => NProgress.start());
Router.events.on("routeChangeComplete", () => NProgress.done());
Router.events.on("routeChangeError", (err, url) => {
  NProgress.done();
  
  // Si el error es por estar offline, no mostrar el error
  if (err && err.cancelled) {
    console.log("Navegación cancelada (probablemente offline)");
    return;
  }
  
  // Si hay un error de red, intentar usar cache
  if (typeof window !== "undefined" && !navigator.onLine) {
    console.log("📴 Offline: Error de navegación, el service worker debería manejar esto");
    // No hacer nada, el service worker manejará la navegación offline
    return;
  }
  
  // Si el error es de routing (undefined includes), es un problema de Next.js offline
  // Este error ocurre cuando Next.js intenta resolver rutas dinámicas sin datos
  if (err && (err.message?.includes('includes') || err.toString().includes('includes') || err.message?.includes('Cannot read properties'))) {
    console.warn("⚠️ Error de routing detectado (probablemente offline):", err);
    console.warn("URL intentada:", url);
    
    // Si estamos offline, prevenir que Next.js muestre el error
    if (typeof window !== "undefined" && !navigator.onLine) {
      console.log("📴 Offline: Previniendo error de routing, el service worker manejará la navegación");
      // No hacer nada, el service worker debería manejar esto
      return;
    }
    
    // Si hay conexión pero hay un error, intentar recargar
    if (typeof window !== "undefined" && url) {
      try {
        // Usar window.location para forzar una navegación completa
        window.location.href = url;
      } catch (e) {
        console.error("Error navegando directamente:", e);
      }
    }
    return;
  }
  
  console.error("Error de navegación:", err);
});

function MyApp({ Component, pageProps }) {
  const [appReady, setAppReady] = useState(false);

  // Polyfills para compatibilidad con iOS/Safari
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Mejorar compatibilidad con Safari - definir global si no existe
      if (typeof global === "undefined") {
        window.global = window;
      }
      
      // Asegurar que las APIs necesarias estén disponibles
      if (!window.requestIdleCallback) {
        window.requestIdleCallback = function(callback) {
          return setTimeout(callback, 1);
        };
        window.cancelIdleCallback = function(id) {
          clearTimeout(id);
        };
      }
    }
  }, []);

  // Verificar y limpiar caché antiguo al cargar
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Verificar si hay caché antiguo y limpiarlo
      checkAndClearOldCache().catch(console.error);
    }
  }, []);

  // Manejo de errores global para Safari/iOS
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Capturar errores de web-vitals que pueden fallar en Safari
      const originalError = window.onerror;
      window.onerror = function(message, source, lineno, colno, error) {
        // Suprimir errores específicos de web-vitals en Safari
        if (typeof message === "string" && (
          message.includes("is not a function") ||
          message.includes("e is not a function") ||
          (source && source.includes("web-vitals"))
        )) {
          console.warn("Error de web-vitals suprimido en Safari:", message);
          return true; // Prevenir que el error se propague
        }
        // Para otros errores, usar el manejador original
        if (originalError) {
          return originalError(message, source, lineno, colno, error);
        }
        return false;
      };

      // También capturar errores no manejados de promesas
      const originalUnhandledRejection = window.onunhandledrejection;
      window.onunhandledrejection = function(event) {
        if (event.reason && typeof event.reason === "object") {
          const message = event.reason.message || String(event.reason);
          if (message.includes("is not a function") || message.includes("web-vitals")) {
            console.warn("Error de promesa suprimido en Safari:", message);
            event.preventDefault();
            return;
          }
        }
        if (originalUnhandledRejection) {
          return originalUnhandledRejection(event);
        }
      };

      return () => {
        window.onerror = originalError;
        window.onunhandledrejection = originalUnhandledRejection;
      };
    }
  }, []);

  useEffect(() => {
    // Filtrar un warning conocido proveniente de la librería `react-reveal`
    // que usa lifecycles obsoletos (RevealBase -> componentWillReceiveProps).
    // Esto evita que la consola se llene de warnings mientras se usa la
    // librería. Es una mitigación segura para desarrollo. Si se desea,
    // reemplazar react-reveal por una alternativa compatible con React 18.
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const mounted = { current: true };
    
    // Suprimir errores de red cuando estamos offline
    console.error = function (...args) {
      try {
        const allArgs = args.map(arg => {
          if (typeof arg === "string") return arg;
          if (typeof arg === "object" && arg !== null) {
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        }).join(" ");
        
        // Suprimir errores de red cuando estamos offline
        if (typeof window !== "undefined" && !navigator.onLine) {
          if (
            allArgs.includes("ERR_INTERNET_DISCONNECTED") ||
            allArgs.includes("Network Error") ||
            allArgs.includes("net::ERR_INTERNET_DISCONNECTED") ||
            allArgs.includes("Failed to fetch") ||
            (allArgs.includes("GET http://") && allArgs.includes("ERR_INTERNET_DISCONNECTED"))
          ) {
            // Silenciar estos errores cuando estamos offline
            return;
          }
        }
        
        // Verificar si es un warning de RevealBase
        if (
          allArgs.includes("RevealBase") && (
            allArgs.includes("componentWillReceiveProps") ||
            allArgs.includes("getDerivedStateFromProps") ||
            allArgs.includes("UNSAFE_componentWillReceiveProps")
          )
        ) {
          // Suprimir este warning específico
          return;
        }
      } catch (e) {
        // Si hay error al procesar, mostrar el error original
      }
      originalConsoleError.apply(console, args);
    };
    // Registrar service worker para PWA
    // Registrar el service worker cuando estemos en un contexto seguro (HTTPS)
    // o en localhost/127.0.0.1 — esto permite probar con ngrok o en la red local
    // sin requerir un deploy a GitHub/Vercel.
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const isSecure = window.location.protocol === "https:";

      if (isSecure || isLocalhost) {
        // En desarrollo, usar el service worker personalizado
        // En producción, next-pwa generará sw.js
        const isDevelopment = process.env.NODE_ENV !== "production";
        const swPath = isDevelopment ? "/sw-custom.js" : "/sw.js";
        
        // Registrar el service worker de forma simple y sin bucles
        (async () => {
          try {
            // Verificar registros existentes
            const registrations = await navigator.serviceWorker.getRegistrations();
            const existingReg = registrations.find(reg => {
              const scriptURL = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL;
              return scriptURL && scriptURL.includes(swPath);
            });
            
            if (existingReg && existingReg.active) {
              console.log(`✅ Service Worker ya está registrado y activo (${swPath})`);
              return;
            }
            
            // Limpiar registros antiguos si existen
            if (registrations.length > 0) {
              console.log("Limpiando service workers antiguos...");
              await Promise.all(registrations.map(reg => reg.unregister()));
            }
            
            // Registrar nuevo service worker
            const registration = await navigator.serviceWorker.register(swPath, {
              scope: '/',
              updateViaCache: 'none',
            });
            
            console.log(`✅ Service Worker registrado (${swPath})`);

            // Fallback: si hay uno en espera, forzar activación inmediata
            if (registration.waiting) {
              console.log("⏸️ Service Worker en espera, enviando SKIP_WAITING");
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            
            // Verificar estado después de un momento
            setTimeout(() => {
              if (registration.active) {
                console.log("✅ Service Worker activo y listo");
              } else if (registration.installing) {
                console.log("⏳ Service Worker instalándose...");
              } else if (registration.waiting) {
                console.log("⏸️ Service Worker esperando activación");
              }
            }, 1000);
            
            // Escuchar actualizaciones SOLO UNA VEZ y SIN recargar automáticamente
            let hasUpdateListener = false;
            registration.addEventListener('updatefound', () => {
              if (hasUpdateListener) return;
              hasUpdateListener = true;
              
              console.log("🔄 Nueva versión del Service Worker encontrada");
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'activated') {
                    console.log("✅ Nueva versión del Service Worker activada");
                    console.log("💡 Recarga manualmente la página para usar la nueva versión");
                    // NO recargar automáticamente para evitar bucles
                  }
                });
              }
            });
            
          } catch (error) {
            console.error(`Error registrando Service Worker (${swPath}):`, error);
            
            // Si falla con sw.js en producción, intentar con sw-custom.js como fallback
            if (!isDevelopment && swPath === "/sw.js") {
              try {
                console.log("Intentando con service worker personalizado como fallback...");
                await navigator.serviceWorker.register("/sw-custom.js");
                console.log("Service Worker personalizado registrado");
              } catch (error2) {
                console.error("Error registrando Service Worker personalizado:", error2);
              }
            }
          }
        })();
      }
    }
    return () => {
      // restaurar console.error cuando se desmonte
      console.error = originalConsoleError;
      mounted.current = false;
    };
  }, []);

  // Obtener sesión reactiva usando useSession (solo en cliente)
  const [session, sessionLoading] = typeof window !== "undefined" ? useSession() : [null, true];

  // Inyectar datos de sesión (email/username) en window para que utilidades cliente
  // como pushNotifications puedan verificar autenticación rápidamente.
  // NOTA: El servidor obtiene el userId de la sesión automáticamente, esto es solo para verificación rápida en el cliente.
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        if (session && session.user && session.user.email) {
          window.__USER_EMAIL__ = session.user.email;
          window.__USER_NAME__ = session.user.name || session.user.username || null;
          console.log("✅ [SESSION] Email actualizado en window:", session.user.email);
        } else {
          // Limpiar cuando no hay sesión
          window.__USER_EMAIL__ = null;
          window.__USER_NAME__ = null;
          if (!sessionLoading) {
            console.log("🔒 [SESSION] Sesión no disponible");
          }
        }
      }
    } catch (e) {
      console.error("❌ [SESSION] Error actualizando window.__USER_EMAIL__:", e);
    }
  }, [session, sessionLoading]);

  // Inicializar servicios offline y listeners de sincronización
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Inicializar IndexedDB
      indexedDBService.init().catch((error) => {
        console.error("Error inicializando IndexedDB:", error);
      });
      
      // Escuchar eventos de sincronización para mostrar feedback
      const handleSyncItemComplete = (event) => {
        if (event.detail?.message) {
          NormalToast(event.detail.message);
        }
      };
      
      const handleSyncItemError = (event) => {
        if (event.detail?.message) {
          NormalToast(event.detail.message, true);
        }
      };
      
      const handleSyncComplete = (event) => {
        if (event.detail?.message) {
          NormalToast(event.detail.message);
        }
      };
      
      const handleSyncError = (event) => {
        if (event.detail?.message) {
          NormalToast(event.detail.message, true);
        }
      };
      
      window.addEventListener('syncItemComplete', handleSyncItemComplete);
      window.addEventListener('syncItemError', handleSyncItemError);
      window.addEventListener('syncComplete', handleSyncComplete);
      window.addEventListener('syncError', handleSyncError);

      // El mensaje de offline ahora se maneja en OfflineBanner
      // No mostrar toast aquí para evitar duplicados

      // Solicitar sincronización en background si está disponible
      // Nota: Background Sync requiere permisos y puede no estar disponible en todos los navegadores
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          // Verificar si sync está disponible antes de intentar usarlo
          if (registration.sync && typeof registration.sync.register === 'function') {
            registration.sync.register("sync-data").catch((err) => {
              // Silenciar errores de permisos - es normal que no esté disponible
              if (err.name !== 'NotAllowedError' && err.name !== 'TypeError') {
                console.warn("Background Sync no disponible:", err.name);
              }
            });
          }
        }).catch(() => {
          // Silenciar errores de service worker
        });
      }

      // Escuchar mensajes del service worker para guardar notificaciones
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.addEventListener("message", async (event) => {
          if (event.data && event.data.type === "SAVE_NOTIFICATION") {
            const userId = window.__USER_EMAIL__;
            if (userId && event.data.notification) {
              try {
                await fetch("/api/notifications/save", {
                  credentials: "include",
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    userId,
                    ...event.data.notification,
                  }),
                });
                console.log("Notificación guardada desde service worker");
              } catch (error) {
                console.error("Error guardando notificación:", error);
              }
            }
          }
        });
      }
      
      return () => {
        window.removeEventListener('syncItemComplete', handleSyncItemComplete);
        window.removeEventListener('syncItemError', handleSyncItemError);
        window.removeEventListener('syncComplete', handleSyncComplete);
        window.removeEventListener('syncError', handleSyncError);
      };
    }
  }, []);

  // Cachear toda la información cuando un admin inicia sesión
  useEffect(() => {
    if (typeof window !== "undefined" && session && session.admin && !sessionLoading) {
      const cacheAdminData = async () => {
        try {
          console.log("📦 Admin detectado, cacheando toda la información...");
          
          // Cachear usuarios
          try {
            const usersResponse = await fetch("/api/admin/users", {
              credentials: "include",
            });
            if (usersResponse.ok) {
              const users = await usersResponse.json();
              await indexedDBService.saveUsers(users);
              console.log("✅ Usuarios cacheados:", users.length);
            }
          } catch (error) {
            console.error("Error cacheando usuarios:", error);
          }
          
          // Cachear productos
          try {
            const dishesResponse = await fetch("/api/dishes", {
              credentials: "include",
            });
            if (dishesResponse.ok) {
              const dishes = await dishesResponse.json();
              await indexedDBService.saveDishes(dishes);
              console.log("✅ Productos cacheados:", dishes.length);
              
              // Cachear imágenes de productos
              try {
                const { cacheAllDishImages } = await import("../util/imageCache");
                await cacheAllDishImages(dishes);
                console.log("✅ Imágenes de productos cacheadas");
              } catch (imageError) {
                console.error("Error cacheando imágenes de productos:", imageError);
              }
            }
          } catch (error) {
            console.error("Error cacheando productos:", error);
          }
          
          // Cachear categorías
          try {
            const categoriesResponse = await fetch("/api/categories", {
              credentials: "include",
            });
            if (categoriesResponse.ok) {
              const categories = await categoriesResponse.json();
              await indexedDBService.saveCategories(categories);
              console.log("✅ Categorías cacheadas:", categories.length);
            }
          } catch (error) {
            console.error("Error cacheando categorías:", error);
          }
          
          // Cachear pedidos activos
          try {
            const ordersResponse = await fetch("/api/admin/active-orders", {
              credentials: "include",
            });
            if (ordersResponse.ok) {
              const orders = await ordersResponse.json();
              await indexedDBService.saveOrders(orders);
              console.log("✅ Pedidos activos cacheados:", orders.length);
            }
          } catch (error) {
            console.error("Error cacheando pedidos activos:", error);
          }
          
          console.log("✅ Cache inicial completo para admin");
          NormalToast("Datos cacheados para uso offline");
        } catch (error) {
          console.error("Error en cache inicial:", error);
        }
      };
      
      // Ejecutar cache después de un pequeño delay para asegurar que todo esté listo
      const timeoutId = setTimeout(cacheAdminData, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [session, sessionLoading]);

  return (
    <NextAuthProvider session={pageProps.session}>
      <ThemeProvider>
        {/* Mostrar AppLoader solo si la app no está lista (solo en cliente) */}
        {typeof window !== "undefined" && !appReady && (
          <AppLoader onReady={() => {
            console.log("✅ AppLoader: Aplicación lista, ocultando loader");
            setAppReady(true);
          }} />
        )}
        
        {/* Contenido principal - siempre renderizar, AppLoader se oculta cuando está listo */}
        <SWRConfig
          value={{
            refreshInterval: 1000,
            fetcher,
            // Deshabilitar revalidación cuando está offline
            revalidateOnFocus: typeof window !== "undefined" ? navigator.onLine : true,
            revalidateOnReconnect: true,
            // Usar cache cuando está offline
            shouldRetryOnError: (error, key) => {
              // No reintentar si estamos offline
              if (typeof window !== "undefined" && !navigator.onLine) {
                return false;
              }
              return true;
            },
          }}
        >
          <Provider store={store}>
            <OfflineBanner />
            <OfflineLinkHandler />
            <Layout admin={Component?.admin} auth={Component?.auth}>
              <Component {...pageProps} />
              <NotificationPrompt />
              <ToastContainer limit={4} />
            </Layout>
          </Provider>
        </SWRConfig>
      </ThemeProvider>
    </NextAuthProvider>
  );
}

export default MyApp;
