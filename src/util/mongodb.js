import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'timeTunnel'; // Usar 'timeTunnel' por defecto

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongo;

if (!cached) {
  cached = global.mongo = { conn: null, promise: null };
}

export async function connectToDatabase() {
  // Validar variables de entorno solo cuando se intenta conectar (no durante build)
  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable. " +
      "For local development, add it to .env.local. " +
      "For production, add it to Vercel environment variables."
    );
  }

  // Validar y corregir formato de URL de MongoDB
  let mongoUri = MONGODB_URI.trim();
  
  // Si usa mongodb:// en lugar de mongodb+srv://, mostrar advertencia pero intentar continuar
  if (mongoUri.startsWith('mongodb://') && !mongoUri.includes('mongodb+srv://')) {
    console.warn('⚠️  ADVERTENCIA: MONGODB_URI usa formato deprecado (mongodb://). ' +
                 'Para MongoDB Atlas, usa mongodb+srv:// en su lugar. ' +
                 'Ejemplo: mongodb+srv://usuario:password@cluster.mongodb.net/database?retryWrites=true&w=majority');
    
    // Intentar convertir mongodb:// a mongodb+srv:// si es posible
    if (mongoUri.includes('mongodb.net')) {
      mongoUri = mongoUri.replace('mongodb://', 'mongodb+srv://');
      console.warn('⚠️  URL convertida automáticamente a mongodb+srv://');
    }
  }

  // MONGODB_DB ahora tiene un valor por defecto 'timeTunnel', pero aún validamos que exista MONGODB_URI

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    };

    cached.promise = MongoClient.connect(mongoUri, opts)
      .then((client) => {
      return {
        client,
        db: client.db(MONGODB_DB),
      };
      })
      .catch((error) => {
        // Limpiar la promesa en caso de error para permitir reintentos
        cached.promise = null;
        console.error("Error conectando a MongoDB:", error.message);
        throw error;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
