// Endpoint de diagnóstico para ver qué está pasando
import { connectToDatabase } from "../../util/mongodb";

export default async function handler(req, res) {
  const info = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    hasMongoUri: !!process.env.MONGODB_URI,
    mongoUriPrefix: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'NO DEFINIDA',
    mongoDb: process.env.MONGODB_DB || 'NO DEFINIDA',
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
  };

  // Intentar conectar a MongoDB
  try {
    const connection = await connectToDatabase();
    info.mongoConnection = "✅ CONECTADO";
    info.mongoDbName = connection.db.databaseName;
  } catch (error) {
    info.mongoConnection = "❌ ERROR";
    info.mongoError = error.message;
    info.mongoErrorName = error.name;
  }

  return res.status(200).json(info);
}

