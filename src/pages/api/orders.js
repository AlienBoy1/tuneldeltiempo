import { connectToDatabase } from "../../util/mongodb";
import { withAuth } from "../../middleware/auth";
import { checkRateLimit } from "../../util/rateLimiter";
import { sanitizeObject } from "../../util/validation";

async function handler(req, res) {
  // Aplicar rate limiting
  const canContinue = await checkRateLimit(req, res);
  if (!canContinue) {
    return; // Ya se envió respuesta 429
  }

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    const session = req.session; // Ya viene del middleware withAuth
    
    const { db } = await connectToDatabase();
    
    // Solo usuarios autenticados pueden ver sus propios pedidos
    // Sanitizar email para prevenir inyección
    const sanitizedEmail = sanitizeObject({ email: session.user.email }).email;
    
    let orders = await db
      .collection("orders")
      .find({ user: sanitizedEmail, payment_status: "paid" })
      .sort({ timestamp: -1 })
      .toArray();
    
    orders = JSON.parse(JSON.stringify(orders));
    return res.status(200).json(orders);
  } catch (err) {
    console.error("Error obteniendo pedidos:", err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}

export default withAuth(handler);
