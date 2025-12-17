import { connectToDatabase } from "../../../util/mongodb";
import { configureWebPush } from "../../../util/vapid";
import webpush from "web-push";
import { withAuth } from "../../../middleware/auth";
import { validatePushSubscription } from "../../../util/security";
import { checkRateLimit } from "../../../util/rateLimiter";
import { setSecurityHeaders } from "../../../util/security";
import { sanitizeObject } from "../../../util/validation";

async function handler(req, res) {
    // Aplicar rate limiting
    const canContinue = await checkRateLimit(req, res);
    if (!canContinue) {
        return; // Ya se envió respuesta 429
    }

    // Agregar headers de seguridad
    setSecurityHeaders(res);

    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método no permitido" });
    }

    try {
        // La sesión viene del middleware withAuth
        const session = req.session;
        
        if (!session || !session.user || !session.user.email) {
            console.error("❌ [PUSH] No hay sesión válida");
            return res.status(401).json({ message: "No autorizado. Debes iniciar sesión." });
        }

        const userId = session.user.email;
        const username = session.user.username || session.user.name || null;

        console.log("✅ [PUSH] Suscripción recibida para usuario:", userId);

        // Sanitizar y validar el body
        const sanitized = sanitizeObject(req.body);
        let { subscription } = sanitized;

        if (!subscription) {
            return res.status(400).json({ message: "Suscripción requerida" });
        }

        // Normalizar la suscripción si es necesario
        if (subscription.getKey && typeof subscription.getKey === 'function') {
            try {
                const p256dhKey = subscription.getKey('p256dh');
                const authKey = subscription.getKey('auth');
                
                subscription = {
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: Buffer.from(p256dhKey).toString('base64'),
                        auth: Buffer.from(authKey).toString('base64'),
                    },
                };
            } catch (e) {
                console.error('❌ [PUSH] Error normalizando suscripción:', e);
                return res.status(400).json({ message: "Error procesando suscripción" });
            }
        }

        // Validar la suscripción
        const validation = validatePushSubscription(subscription);
        if (!validation.valid) {
            console.error("❌ [PUSH] Suscripción inválida:", validation.error);
            return res.status(400).json({ message: validation.error });
        }

        console.log("✅ [PUSH] Suscripción válida, guardando en base de datos...");

        // Conectar a la base de datos
        const { db } = await connectToDatabase();

        // Guardar o actualizar la suscripción del usuario
        await db.collection("pushSubscriptions").updateOne(
            { userId },
            {
                $set: {
                    subscription: subscription,
                    userId: userId,
                    username: username,
                    updatedAt: new Date(),
                },
            },
            { upsert: true }
        );

        console.log("✅ [PUSH] Suscripción guardada para:", userId);

        // Intentar enviar notificaciones pendientes
        try {
            configureWebPush();
            const pending = await db
                .collection("pendingNotifications")
                .find({ userId })
                .toArray();

            if (pending.length > 0) {
                console.log(`📬 [PUSH] Enviando ${pending.length} notificaciones pendientes a ${userId}`);
                for (const p of pending) {
                    try {
                        await webpush.sendNotification(subscription, JSON.stringify(p.payload));
                        // Si se envió correctamente, borrarla
                        await db.collection("pendingNotifications").deleteOne({ _id: p._id });
                    } catch (e) {
                        console.error("❌ [PUSH] Error enviando notificación pendiente:", e);
                        // Si la suscripción está inválida, eliminarla
                        if (e.statusCode === 410 || e.statusCode === 404) {
                            await db.collection("pushSubscriptions").deleteOne({ userId });
                        }
                    }
                }
            }
        } catch (e) {
            console.error("❌ [PUSH] Error procesando notificaciones pendientes:", e);
            // No fallar la suscripción si hay error con las pendientes
        }

        return res.status(200).json({ 
            message: "Suscripción guardada exitosamente",
            userId: userId 
        });
    } catch (error) {
        console.error("❌ [PUSH] Error guardando suscripción:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
}

export default withAuth(handler);
