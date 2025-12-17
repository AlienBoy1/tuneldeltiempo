import { getSession } from "next-auth/client";
import { connectToDatabase } from "../../../util/mongodb";
import { validateAndConvertObjectId } from "../../../util/security";
import { withAuth } from "../../../middleware/auth";
import { checkRateLimit } from "../../../util/rateLimiter";

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
        
        // Validar ObjectId
        let orderId;
        try {
            orderId = validateAndConvertObjectId(req.query.id, "ID del pedido");
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }

        const { db } = await connectToDatabase();
        let order;
        
        // Si es admin, puede ver cualquier pedido; si no, solo sus propios pedidos
        if (session.admin) {
            order = await db.collection("orders").findOne({ _id: orderId });
        } else {
            order = await db.collection("orders").findOne({ 
                user: session.user.email, 
                _id: orderId 
            });
        }
        
        if (!order) {
            return res.status(404).json({ message: "Pedido no encontrado" });
        }
        
        order = JSON.parse(JSON.stringify(order));
        return res.status(200).json(order);
    } catch (err) {
        console.error("Error obteniendo detalles del pedido:", err);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
}

export default withAuth(handler);
