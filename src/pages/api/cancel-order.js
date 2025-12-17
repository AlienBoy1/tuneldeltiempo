import { connectToDatabase } from "../../util/mongodb";
import { withAuth } from "../../middleware/auth";
import { validateAndConvertObjectId, validateOrderStatus } from "../../util/security";
import { checkRateLimit } from "../../util/rateLimiter";
import { sanitizeObject } from "../../util/validation";

async function handler(req, res) {
    // Aplicar rate limiting
    const canContinue = await checkRateLimit(req, res);
    if (!canContinue) {
        return; // Ya se envió respuesta 429
    }

    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método no permitido" });
    }

    try {
        const session = req.session; // Ya viene del middleware withAuth
        
        // Sanitizar y validar datos
        const sanitizedData = sanitizeObject(req.body);
        const { status, _id } = sanitizedData;
        
        if (!status || !_id) {
            return res.status(400).json({ message: "Estado e ID del pedido son requeridos" });
        }
        
        // Validar que el estado sea válido
        if (!validateOrderStatus(status)) {
            return res.status(400).json({ message: "Estado de pedido no válido" });
        }
        
        // Validar ObjectId
        let orderId;
        try {
            orderId = validateAndConvertObjectId(_id, "ID del pedido");
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
        
        const { db } = await connectToDatabase();
        
        // Verificar que el pedido existe
        const order = await db.collection("orders").findOne({ _id: orderId });
        
        if (!order) {
            return res.status(404).json({ message: "Pedido no encontrado" });
        }
        
        // Verificar que el usuario es el propietario del pedido o es admin
        const sanitizedEmail = sanitizeObject({ email: session.user.email }).email;
        if (order.user !== sanitizedEmail && !session.admin) {
            return res.status(403).json({ message: "No tienes permiso para cancelar este pedido" });
        }
        
        // Actualizar estado del pedido
        const ord_status = { status, timestamp: new Date() };
        const order_status = {
            current: ord_status,
            info: [...(order.order_status?.info || []), ord_status],
        };
        
        await db.collection("orders").updateOne(
            { _id: orderId }, 
            { $set: { order_status, status } }
        );
        
        return res.status(200).json({ message: "Pedido cancelado exitosamente" });
    } catch (err) {
        console.error("Error cancelando pedido:", err);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
}

export default withAuth(handler);
