import { connectToDatabase } from "../../../util/mongodb";
import { withAuth } from "../../../middleware/auth";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    // La sesión viene del middleware withAuth
    const session = req.session;
    
    if (!session || !session.user || !session.user.email) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const userId = session.user.email;
    const { endpoint } = req.body;

    const { db } = await connectToDatabase();

    // Eliminar la suscripción asociada al usuario
    // Si se proporciona un endpoint específico, eliminarlo; sino, eliminar todas las suscripciones del usuario
    let result;
    if (endpoint) {
      result = await db.collection("pushSubscriptions").deleteOne({ 
        userId, 
        "subscription.endpoint": endpoint 
      });
    } else {
      // Si no se proporciona endpoint, eliminar todas las suscripciones del usuario
      result = await db.collection("pushSubscriptions").deleteMany({ userId });
    }

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No se encontró suscripción para eliminar" });
    }

    console.log("✅ [PUSH] Suscripción eliminada para:", userId);
    return res.status(200).json({ message: "Suscripción eliminada exitosamente" });
  } catch (error) {
    console.error("❌ [PUSH] Error eliminando suscripción:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}

export default withAuth(handler);
