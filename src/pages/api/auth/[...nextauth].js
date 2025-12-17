import NextAuth from "next-auth";
import Providers from "next-auth/providers";
import { connectToDatabase } from "../../../util/mongodb";
import bcrypt from "bcryptjs";

// Determinar si estamos en producción (Vercel) o desarrollo
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = !!process.env.VERCEL;

// Obtener NEXTAUTH_URL - CRÍTICO para Vercel
let baseUrl = process.env.NEXTAUTH_URL;
if (!baseUrl) {
  if (isProduction || isVercel) {
    baseUrl = 'https://tuneldeltiempoo.vercel.app';
  } else {
    baseUrl = 'http://localhost:3000';
  }
}

// Asegurar que baseUrl no tenga trailing slash
baseUrl = baseUrl.replace(/\/$/, '');

console.log("🔐 [NEXTAUTH] Configuración:", {
  isProduction,
  isVercel,
  baseUrl,
  hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
  hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET
});

export default NextAuth({
  providers: [
    Providers.Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log("🔐 [NEXTAUTH] Iniciando autorización...");
          
          // Validar y sanitizar credenciales
          if (!credentials || !credentials.username || !credentials.password) {
            console.log("❌ [NEXTAUTH] Credenciales faltantes");
            throw new Error("Usuario y contraseña son requeridos");
          }

          // Sanitizar username para prevenir inyección
          const username = credentials.username.trim().slice(0, 50);
          const password = credentials.password;

          if (username.length < 3 || username.length > 20) {
            console.log("❌ [NEXTAUTH] Username inválido:", username.length);
            throw new Error("Usuario o contraseña incorrectos");
          }

          console.log("🔄 [NEXTAUTH] Conectando a MongoDB...");
          const { db } = await connectToDatabase();
          
          // Usar query sanitizado para prevenir inyección NoSQL
          console.log("🔍 [NEXTAUTH] Buscando usuario:", username.substring(0, 3) + "...");
          const user = await db.collection("users").findOne({
            username: username,
          });

          if (!user) {
            console.log("❌ [NEXTAUTH] Usuario no encontrado");
            // No revelar si el usuario existe o no (mejor seguridad)
            throw new Error("Usuario o contraseña incorrectos");
          }

          console.log("🔐 [NEXTAUTH] Verificando contraseña...");
          const isValid = await bcrypt.compare(
            password,
            user.password
          );

          if (!isValid) {
            console.log("❌ [NEXTAUTH] Contraseña incorrecta");
            throw new Error("Usuario o contraseña incorrectos");
          }

          console.log("✅ [NEXTAUTH] Autorización exitosa para:", user.email);
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            username: user.username,
            image: user.image || null,
          };
        } catch (error) {
          console.error("❌ [NEXTAUTH] Error en autorización:", {
            message: error.message,
            name: error.name,
            stack: error.stack?.substring(0, 200)
          });
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async session(session, token) {
      try {
        if (token) {
          session.user.id = token.id;
          session.user.username = token.username;
          session.user.name = token.name;
          session.user.email = token.email;
          session.user.image = token.image;
        }

        // Obtener la imagen actualizada del usuario desde la base de datos
        if (session.user && session.user.email) {
          try {
            const { db } = await connectToDatabase();
            const user = await db.collection("users").findOne({ email: session.user.email });
            if (user && user.image) {
              session.user.image = user.image;
            }

            // Verificar si el usuario es administrador
            session.admin = false;
            const adminResult = await db
              .collection("admins")
              .findOne({ user: session.user.email });
            if (adminResult) {
              session.admin = true;
            }
          } catch (dbError) {
            console.error("❌ [NEXTAUTH] Error en callback de sesión:", dbError.message);
            // Continuar sin actualizar, usar datos del token
          }
        }
        return session;
      } catch (error) {
        console.error("❌ [NEXTAUTH] Error crítico en session callback:", error);
        return session;
      }
    },
    async jwt(token, user, account) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
    updateAge: 24 * 60 * 60, // Actualizar cada 24 horas
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // En producción (Vercel) siempre usar secure, en desarrollo solo si es HTTPS
        secure: isProduction || isVercel || baseUrl.startsWith('https://'),
        // CRÍTICO: No establecer domain en Vercel para que funcione en todos los subdominios
        domain: undefined,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction || isVercel || baseUrl.startsWith('https://'),
        domain: undefined,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction || isVercel || baseUrl.startsWith('https://'),
        domain: undefined,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET || (isProduction ? undefined : 'development-secret-key-change-in-production'),
  theme: "dark",
  debug: process.env.NODE_ENV === 'development',
});
