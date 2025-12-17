import { connectToDatabase } from "../../../util/mongodb";
import bcrypt from "bcryptjs";

// Rate limiting simplificado
const rateLimitStore = new Map();
function checkRegisterRateLimit(req) {
  try {
    if (!req || !req.headers) return true;
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const key = `register:${ip}`;
    const now = Date.now();
    let entry = rateLimitStore.get(key);
    if (!entry || entry.expiresAt < now) {
      entry = { count: 0, expiresAt: now + (60 * 60 * 1000) };
      rateLimitStore.set(key, entry);
    }
    entry.count++;
    return entry.count <= 3;
  } catch (error) {
    console.error("Error en rate limiting:", error);
    return true;
  }
}

// Validación básica inline
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

function validateUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function validateName(name) {
  return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/.test(name);
}

export default async function handler(req, res) {
  // Log inicial con información del entorno
  console.log("📝 [REGISTER] Iniciando registro...");
  console.log("📝 [REGISTER] Entorno:", process.env.NODE_ENV);
  console.log("📝 [REGISTER] MONGODB_URI configurado:", !!process.env.MONGODB_URI);
  console.log("📝 [REGISTER] MONGODB_DB:", process.env.MONGODB_DB || 'timeTunnel (default)');
  
  try {
    // Rate limiting
    if (!checkRegisterRateLimit(req)) {
      console.log("⛔ [REGISTER] Rate limit excedido");
      return res.status(429).json({ 
        message: 'Demasiados intentos de registro. Por favor intenta en 1 hora.',
        retryAfter: 3600
      });
    }

    // Verificar método
    if (req.method !== "POST") {
      console.log("❌ [REGISTER] Método no permitido:", req.method);
      return res.status(405).json({ message: "Método no permitido" });
    }

    // Verificar body
    if (!req.body || typeof req.body !== "object") {
      console.log("❌ [REGISTER] Body inválido");
      return res.status(400).json({ message: "Datos de registro no proporcionados" });
    }

    console.log("✅ [REGISTER] Validaciones básicas pasadas");

    // Extraer datos
    const rawData = req.body;
    const name = (rawData.name || "").trim();
    const username = (rawData.username || "").trim();
    const email = (rawData.email || "").trim().toLowerCase();
    const password = rawData.password || "";
    const confirmPassword = rawData.confirmPassword || "";

    console.log("📋 [REGISTER] Datos recibidos:", { 
      name: name.substring(0, 10) + "...", 
      username, 
      email: email.substring(0, 10) + "...",
      hasPassword: !!password,
      hasConfirmPassword: !!confirmPassword
    });

    // Validar campos requeridos
    if (!name || !username || !email || !password || !confirmPassword) {
      console.log("❌ [REGISTER] Campos faltantes");
      return res.status(400).json({ 
        message: "Todos los campos son requeridos" 
      });
    }

    // Validar formato
    if (!validateName(name)) {
      console.log("❌ [REGISTER] Nombre inválido");
      return res.status(400).json({ message: "El nombre debe tener entre 2 y 50 caracteres y solo letras" });
    }

    if (!validateUsername(username)) {
      console.log("❌ [REGISTER] Username inválido");
      return res.status(400).json({ message: "El nombre de usuario debe tener entre 3 y 20 caracteres alfanuméricos o guiones bajos" });
    }

    if (!validateEmail(email)) {
      console.log("❌ [REGISTER] Email inválido");
      return res.status(400).json({ message: "El correo electrónico no es válido" });
    }

    if (!validatePassword(password)) {
      console.log("❌ [REGISTER] Contraseña inválida");
      return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas y números" });
    }

    if (password !== confirmPassword) {
      console.log("❌ [REGISTER] Contraseñas no coinciden");
      return res.status(400).json({ message: "Las contraseñas no coinciden" });
    }

    console.log("✅ [REGISTER] Validaciones de formato pasadas");

    // Conectar a MongoDB
    let db;
    try {
      console.log("🔄 [REGISTER] Conectando a MongoDB...");
      const connection = await connectToDatabase();
      if (!connection || !connection.db) {
        throw new Error("Conexión inválida");
      }
      db = connection.db;
      console.log("✅ [REGISTER] Conectado a MongoDB");
    } catch (dbError) {
      console.error("❌ [REGISTER] Error MongoDB:", {
        message: dbError.message,
        name: dbError.name,
        stack: dbError.stack?.substring(0, 200)
      });
      return res.status(500).json({ 
        message: "Error de conexión con la base de datos. Por favor intenta más tarde." 
      });
    }

    // Verificar usuario existente
    let existingUser;
    try {
      console.log("🔍 [REGISTER] Verificando usuario existente...");
      existingUser = await db.collection("users").findOne({
        $or: [{ username }, { email }]
      });
      if (existingUser) {
        console.log("❌ [REGISTER] Usuario ya existe");
        if (existingUser.username === username) {
          return res.status(400).json({ message: "El nombre de usuario ya está en uso" });
        }
        if (existingUser.email === email) {
          return res.status(400).json({ message: "El correo electrónico ya está en uso" });
        }
      }
      console.log("✅ [REGISTER] Usuario no existe, puede continuar");
    } catch (queryError) {
      console.error("❌ [REGISTER] Error verificando usuario:", queryError);
      return res.status(500).json({ 
        message: "Error al verificar usuario existente. Por favor intenta más tarde." 
      });
    }

    // Verificar si es primer usuario
    let isFirstUser = false;
    try {
      console.log("🔢 [REGISTER] Contando usuarios...");
      const userCount = await db.collection("users").countDocuments();
      isFirstUser = userCount === 0;
      console.log(`📊 [REGISTER] Total usuarios: ${userCount}, es primer usuario: ${isFirstUser}`);
    } catch (countError) {
      console.error("❌ [REGISTER] Error contando usuarios:", countError);
      isFirstUser = false;
    }

    // Hashear contraseña
    let hashedPassword;
    try {
      console.log("🔐 [REGISTER] Hasheando contraseña...");
      hashedPassword = await bcrypt.hash(password, 10);
      console.log("✅ [REGISTER] Contraseña hasheada");
    } catch (hashError) {
      console.error("❌ [REGISTER] Error hasheando contraseña:", hashError);
      return res.status(500).json({ 
        message: "Error al procesar la contraseña. Por favor intenta más tarde." 
      });
    }

    // Crear usuario
    let result;
    try {
      console.log("💾 [REGISTER] Creando usuario...");
      result = await db.collection("users").insertOne({
        name,
        username,
        email,
        password: hashedPassword,
        createdAt: new Date(),
      });

      if (!result || !result.insertedId) {
        throw new Error("No se pudo crear el usuario");
      }
      console.log("✅ [REGISTER] Usuario creado:", result.insertedId.toString());
    } catch (insertError) {
      console.error("❌ [REGISTER] Error insertando usuario:", {
        message: insertError.message,
        code: insertError.code,
        name: insertError.name
      });
      
      if (insertError.code === 11000) {
        return res.status(400).json({ 
          message: "El usuario o correo electrónico ya está en uso" 
        });
      }
      
      return res.status(500).json({ 
        message: "Error al crear el usuario. Por favor intenta más tarde." 
      });
    }

    // Crear admin si es primer usuario
    if (isFirstUser) {
      try {
        console.log("👑 [REGISTER] Creando administrador...");
        await db.collection("admins").insertOne({
          user: email,
          createdAt: new Date(),
        });
        console.log("✅ [REGISTER] Administrador creado");
      } catch (adminError) {
        console.error("❌ [REGISTER] Error creando admin (usuario ya creado):", adminError);
        // No fallar, el usuario ya está creado
      }
    }

    console.log("🎉 [REGISTER] Registro exitoso");
    return res.status(201).json({
      message: "Usuario registrado exitosamente",
      userId: result.insertedId.toString(),
      isAdmin: isFirstUser,
    });

  } catch (error) {
    console.error("❌ [REGISTER] Error crítico:", {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500),
      code: error.code,
      env: {
        hasMongoUri: !!process.env.MONGODB_URI,
        mongoDb: process.env.MONGODB_DB || 'timeTunnel (default)',
        nodeEnv: process.env.NODE_ENV
      }
    });
    
    // En producción, no exponer detalles del error
    const isDevelopment = process.env.NODE_ENV === "development";
    
    return res.status(500).json({ 
      message: "Error interno del servidor. Por favor intenta más tarde.",
      ...(isDevelopment && {
        error: error.message,
        errorName: error.name,
        stack: error.stack?.substring(0, 200)
      })
    });
  }
}
