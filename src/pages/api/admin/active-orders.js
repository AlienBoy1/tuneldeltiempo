import { withAdmin } from "../../../middleware/auth";
import { connectToDatabase } from "../../../util/mongodb";

async function handler(req, res) {
    try {
        if (req.method !== "GET") {
            return res.status(405).json({ message: "Método no permitido" });
        }

        const { db } = await connectToDatabase();
        let orders = await db
            .collection("orders")
            .find({
                payment_status: "paid",
                "order_status.current.status": {
                    $in: ["shipping soon", "shipped", "out for delivery"],
                },
            })
            .sort({ timestamp: -1 })
            .toArray();
        orders = JSON.parse(JSON.stringify(orders));
        return res.status(200).json(orders);
    } catch (err) {
        console.error("Error en active-orders:", err);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
}

export default withAdmin(handler);
