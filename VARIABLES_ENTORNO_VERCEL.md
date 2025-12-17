# 🔑 Variables de Entorno para Vercel - TUNEL DEL TIEMPO

## 📋 Lista Completa de Variables Requeridas

Copia y pega estas variables en Vercel: **Settings → Environment Variables**

---

## 1. 🔔 VAPID Keys (Para Notificaciones Push) - REQUERIDO

**Primero, genera las keys:**
```bash
npx web-push generate-vapid-keys
```

**Agrega en Vercel:**

| Variable | Valor | Entornos |
|----------|-------|----------|
| `VAPID_PUBLIC_KEY` | [Tu clave pública completa] | ☑️ Production ☑️ Preview ☑️ Development |
| `VAPID_PRIVATE_KEY` | [Tu clave privada completa] | ☑️ Production ☑️ Preview ☑️ Development |

**⚠️ IMPORTANTE:**
- Copia las keys COMPLETAS (son strings muy largos)
- No dejes espacios al inicio o final
- Selecciona los 3 entornos para ambas variables

---

## 2. 🗄️ MongoDB (REQUERIDO)

| Variable | Valor | Entornos |
|----------|-------|----------|
| `MONGODB_URI` | `mongodb+srv://usuario:password@cluster.mongodb.net/database?retryWrites=true&w=majority` | ☑️ Production ☑️ Preview ☑️ Development |
| `MONGODB_DB` | `zinger` | ☑️ Production ☑️ Preview ☑️ Development |

**Ejemplo de MONGODB_URI:**
```
mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/zinger?retryWrites=true&w=majority
```

**⚠️ IMPORTANTE:** 
- Ambas variables son REQUERIDAS
- Sin ellas, el build fallará
- `MONGODB_DB` debe ser el nombre de tu base de datos (en tu caso: `zinger`)

---

## 3. 🔐 NextAuth (Para Autenticación) - REQUERIDO

| Variable | Valor | Entornos |
|----------|-------|----------|
| `NEXTAUTH_URL` | `https://tu-proyecto.vercel.app` | ☑️ Production (solo) |
| `NEXTAUTH_SECRET` | [String aleatorio de 32 caracteres] | ☑️ Production ☑️ Preview ☑️ Development |

**Para generar NEXTAUTH_SECRET:**
```bash
# Opción 1: Usando OpenSSL
openssl rand -base64 32

# Opción 2: Usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opción 3: Online
https://generate-secret.vercel.app/32
```

**⚠️ IMPORTANTE:**
- `NEXTAUTH_URL` debe ser la URL de tu proyecto en Vercel (ej: `https://tuneldeltiempo.vercel.app`)
- `NEXTAUTH_SECRET` debe ser diferente para cada proyecto
- Selecciona solo Production para `NEXTAUTH_URL`
- Selecciona los 3 entornos para `NEXTAUTH_SECRET`

---

## 4. 💳 Stripe (Para Pagos) - OPCIONAL

Si usas Stripe para pagos, agrega:

| Variable | Valor | Entornos |
|----------|-------|----------|
| `STRIPE_PUBLIC_KEY` | `pk_test_...` o `pk_live_...` | ☑️ Production ☑️ Preview ☑️ Development |
| `STRIPE_SECRET_KEY` | `sk_test_...` o `sk_live_...` | ☑️ Production ☑️ Preview ☑️ Development |

**⚠️ NOTA:** 
- Si no usas Stripe, puedes omitir estas variables
- Usa `pk_test_` y `sk_test_` para desarrollo
- Usa `pk_live_` y `sk_live_` para producción

---

## 📝 Instrucciones Paso a Paso para Vercel

### Paso 1: Conectar el Repositorio

1. Ve a https://vercel.com/new
2. Selecciona "Import Git Repository"
3. Busca y selecciona: `AlienBoy1/tuneldeltiempo`
4. Haz clic en "Import"

### Paso 2: Configurar el Proyecto

1. **Framework Preset:** Next.js (debería detectarse automáticamente)
2. **Root Directory:** `.` (dejar por defecto)
3. **Build Command:** `npm run build` (debería estar por defecto)
4. **Output Directory:** `.next` (debería estar por defecto)
5. **Install Command:** `npm install --legacy-peer-deps` (importante)

### Paso 3: Agregar Variables de Entorno

**ANTES de hacer clic en "Deploy":**

1. Haz clic en "Environment Variables" o "Variables de Entorno"
2. Agrega cada variable de la siguiente manera:

   **Para cada variable:**
   - **Key:** `VAPID_PUBLIC_KEY`
   - **Value:** [Pega tu valor completo]
   - **Selecciona entornos:** ☑️ Production ☑️ Preview ☑️ Development
   - Haz clic en "Add" o "Agregar"

3. **Repite para todas las variables:**
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `MONGODB_URI`
   - `MONGODB_DB`
   - `NEXTAUTH_URL` (solo Production)
   - `NEXTAUTH_SECRET`
   - `STRIPE_PUBLIC_KEY` (si usas Stripe)
   - `STRIPE_SECRET_KEY` (si usas Stripe)

### Paso 4: Desplegar

1. Haz clic en "Deploy"
2. Espera 2-5 minutos para que termine el build
3. Una vez completado, tu app estará disponible en: `https://tu-proyecto.vercel.app`

---

## 🔄 Si ya desplegaste sin variables

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Agrega las variables faltantes
4. Ve a **Deployments**
5. Haz clic en los 3 puntos (⋯) del último despliegue
6. Selecciona **"Redeploy"**
7. **Desmarca** "Use existing Build Cache"
8. Haz clic en **"Redeploy"**

---

## ✅ Checklist de Variables

Antes de desplegar, verifica que tengas:

- [ ] `VAPID_PUBLIC_KEY` (con los 3 entornos)
- [ ] `VAPID_PRIVATE_KEY` (con los 3 entornos)
- [ ] `MONGODB_URI` (con los 3 entornos)
- [ ] `MONGODB_DB` = `zinger` (con los 3 entornos)
- [ ] `NEXTAUTH_URL` = `https://tu-proyecto.vercel.app` (solo Production)
- [ ] `NEXTAUTH_SECRET` (con los 3 entornos)
- [ ] `STRIPE_PUBLIC_KEY` (opcional, si usas Stripe)
- [ ] `STRIPE_SECRET_KEY` (opcional, si usas Stripe)

---

## 🆘 Solución de Problemas

### Error: "MONGODB_URI is not defined"
- Verifica que agregaste `MONGODB_URI` en Vercel
- Asegúrate de seleccionar los 3 entornos
- Haz un redeploy después de agregar la variable

### Error: "VAPID keys not found"
- Verifica que agregaste ambas keys (`VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`)
- Asegúrate de copiar las keys completas sin espacios
- Haz un redeploy después de agregar las variables

### Error: "NEXTAUTH_SECRET is missing"
- Genera un nuevo secret usando uno de los métodos arriba
- Agrega la variable en Vercel
- Haz un redeploy

### La app se despliega pero muestra contenido antiguo
- Limpia el caché del navegador: `Ctrl + Shift + Delete`
- O prueba en modo incógnito: `Ctrl + Shift + N`
- Verifica que el deployment más reciente tenga tus commits recientes

---

## 📞 Notas Finales

- **NO** subas archivos `.env.local` a GitHub
- **SÍ** agrega todas las variables en Vercel
- Después de agregar variables, **siempre haz un redeploy**
- La URL de tu proyecto será: `https://tu-proyecto.vercel.app`
- Puedes cambiar el nombre del proyecto en **Settings → General**

---

## 🎯 Resumen Rápido

**Variables Mínimas Requeridas:**
```
VAPID_PUBLIC_KEY = [tu-clave-publica]
VAPID_PRIVATE_KEY = [tu-clave-privada]
MONGODB_URI = [tu-uri-completa]
MONGODB_DB = zinger
NEXTAUTH_URL = https://tu-proyecto.vercel.app
NEXTAUTH_SECRET = [genera-un-secret]
```

¡Listo para desplegar! 🚀

