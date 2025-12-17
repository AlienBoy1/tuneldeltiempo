import { connectToDatabase } from "../../util/mongodb";

export default async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    const { db } = await connectToDatabase();
    let dishes = await db.collection("dishes").find({}).toArray();
    dishes = JSON.parse(JSON.stringify(dishes));
    return res.status(200).json(dishes);
  } catch (err) {
    // En caso de error, devolver array vacío en lugar de 500
    // Esto permite que la app cargue aunque falle la BD
    console.error("Error obteniendo productos:", err.message);
    return res.status(200).json([]);
  }
};


/*dis.forEach(async(itm)=>{
        await db.collection("dishes").insertOne(itm)
    })*/

//await db.collection("dishes").deleteMany({})
