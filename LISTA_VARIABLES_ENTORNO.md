# 📋 Lista Completa de Variables de Entorno

## Variables Requeridas para Vercel

Copia estas variables desde tu archivo `.env.local` y agrégalas en Vercel: **Settings → Environment Variables**

---

## 🔔 1. VAPID Keys (Notificaciones Push) - REQUERIDO

```env
VAPID_PUBLIC_KEY=tu-clave-publica-completa
VAPID_PRIVATE_KEY=tu-clave-privada-completa
```

**Entornos:** ☑️ Production ☑️ Preview ☑️ Development

---

## 🗄️ 2. MongoDB - REQUERIDO

```env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/timeTunnel?retryWrites=true&w=majority
MONGODB_DB=timeTunnel
```

**Entornos:** ☑️ Production ☑️ Preview ☑️ Development

---

## 🔐 3. NextAuth (Autenticación) - REQUERIDO

```env
NEXTAUTH_URL=https://tu-proyecto.vercel.app
NEXTAUTH_SECRET=tu-secret-generado
```

**Entornos:**
- `NEXTAUTH_URL`: ☑️ Production (solo)
- `NEXTAUTH_SECRET`: ☑️ Production ☑️ Preview ☑️ Development

---

## 💳 4. Stripe (Pagos) - OPCIONAL

```env
STRIPE_PUBLIC_KEY=pk_test_... o pk_live_...
STRIPE_SECRET_KEY=sk_test_... o sk_live_...
STRIPE_SIGNING_SECRET=whsec_...
```

**Entornos:** ☑️ Production ☑️ Preview ☑️ Development

**Nota:** Si no usas Stripe, puedes omitir estas variables.

---

## 🌐 5. HOST (URL Base) - OPCIONAL

```env
HOST=https://tu-proyecto.vercel.app
```

**Entornos:** ☑️ Production (solo)

**Nota:** Esta variable se usa para las URLs de éxito y cancelación de Stripe. Si no usas Stripe, puedes omitirla.

---

## 📝 Formato para Copiar en Vercel

Cuando agregues las variables en Vercel, usa este formato:

| Variable | Valor | Entornos |
|----------|-------|----------|
| `VAPID_PUBLIC_KEY` | [Copia desde tu .env.local] | Production, Preview, Development |
| `VAPID_PRIVATE_KEY` | [Copia desde tu .env.local] | Production, Preview, Development |
| `MONGODB_URI` | [Copia desde tu .env.local] | Production, Preview, Development |
| `MONGODB_DB` | `timeTunnel` | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://tu-proyecto.vercel.app` | Production (solo) |
| `NEXTAUTH_SECRET` | [Copia desde tu .env.local] | Production, Preview, Development |
| `STRIPE_PUBLIC_KEY` | [Copia desde tu .env.local] | Production, Preview, Development |
| `STRIPE_SECRET_KEY` | [Copia desde tu .env.local] | Production, Preview, Development |
| `STRIPE_SIGNING_SECRET` | [Copia desde tu .env.local] | Production, Preview, Development |
| `HOST` | `https://tu-proyecto.vercel.app` | Production (solo) |

---

## ⚠️ Importante

1. **Copia los valores EXACTOS** desde tu `.env.local`
2. **No agregues espacios** al inicio o final de los valores
3. **Para `NEXTAUTH_URL` y `HOST`**: Reemplaza `tu-proyecto.vercel.app` con la URL real de tu proyecto en Vercel
4. **Después de agregar todas las variables**: Haz un redeploy sin caché

---

## 🔍 Cómo Verificar tus Variables

Si quieres ver qué variables tienes en tu `.env.local`, puedes ejecutar:

```powershell
# En PowerShell
Get-Content .env.local
```

O simplemente abre el archivo `.env.local` en tu editor de texto.

---

## ✅ Checklist Rápido

Antes de desplegar, verifica que tengas estas variables en Vercel:

- [ ] `VAPID_PUBLIC_KEY`
- [ ] `VAPID_PRIVATE_KEY`
- [ ] `MONGODB_URI`
- [ ] `MONGODB_DB` = `timeTunnel`
- [ ] `NEXTAUTH_URL` = `https://tu-proyecto.vercel.app`
- [ ] `NEXTAUTH_SECRET`
- [ ] `STRIPE_PUBLIC_KEY` (si usas Stripe)
- [ ] `STRIPE_SECRET_KEY` (si usas Stripe)
- [ ] `STRIPE_SIGNING_SECRET` (si usas Stripe)
- [ ] `HOST` = `https://tu-proyecto.vercel.app` (si usas Stripe)

---

## 📌 Nota sobre NEXTAUTH_URL y HOST

Cuando despliegues en Vercel, estas URLs deben ser:
- `NEXTAUTH_URL` = `https://tu-proyecto.vercel.app`
- `HOST` = `https://tu-proyecto.vercel.app`

Reemplaza `tu-proyecto.vercel.app` con la URL real que Vercel te asigne (ej: `tuneldeltiempo.vercel.app` o `aalienfoodwebb.vercel.app`).

