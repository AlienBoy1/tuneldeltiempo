import { connectToDatabase } from "../../util/mongodb";

export default async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    const { db } = await connectToDatabase();
    let categories = await db.collection("categories").find({}).toArray();
    categories = JSON.parse(JSON.stringify(categories));
    return res.status(200).json(categories);
  } catch (err) {
    // En caso de error, devolver array vacío en lugar de 500
    // Esto permite que la app cargue aunque falle la BD
    console.error("Error obteniendo categorías:", err.message);
    return res.status(200).json([]);
  }
};
