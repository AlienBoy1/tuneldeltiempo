# 🔑 Variables de Entorno para Vercel - ACTUALIZADO

## ⚠️ IMPORTANTE: Base de Datos Cambiada

**El nombre de la base de datos ahora es: `timeTunnel` (no `zinger`)**

---

## 📋 Variables REQUERIDAS en Vercel

Copia estas variables EXACTAS desde tu `.env.local` y agrégalas en Vercel:

### 1. MongoDB (REQUERIDO - CRÍTICO)

```
MONGODB_URI=[tu-uri-completa-de-mongodb]
MONGODB_DB=timeTunnel
```

**⚠️ CRÍTICO:**
- `MONGODB_URI` debe ser la URI COMPLETA de tu MongoDB Atlas
- `MONGODB_DB` DEBE ser exactamente `timeTunnel` (con mayúscula T y minúscula u)
- Sin estas variables, el registro NO funcionará

**Entornos:** ☑️ Production ☑️ Preview ☑️ Development

---

### 2. NextAuth (REQUERIDO - CRÍTICO)

```
NEXTAUTH_URL=https://tuneldeltiempoo.vercel.app
NEXTAUTH_SECRET=[tu-secret-key-completa]
```

**⚠️ CRÍTICO:**
- `NEXTAUTH_URL` debe ser exactamente: `https://tuneldeltiempoo.vercel.app`
- `NEXTAUTH_SECRET` debe ser la misma que tienes en tu `.env.local`
- Sin estas variables, la autenticación NO funcionará

**Entornos:**
- `NEXTAUTH_URL`: ☑️ Production (solo)
- `NEXTAUTH_SECRET`: ☑️ Production ☑️ Preview ☑️ Development

---

### 3. VAPID Keys (REQUERIDO para notificaciones)

```
VAPID_PUBLIC_KEY=[tu-clave-publica-completa]
VAPID_PRIVATE_KEY=[tu-clave-privada-completa]
```

**Entornos:** ☑️ Production ☑️ Preview ☑️ Development

---

### 4. Stripe (OPCIONAL - Solo si usas pagos)

```
STRIPE_PUBLIC_KEY=[tu-stripe-public-key]
STRIPE_SECRET_KEY=[tu-stripe-secret-key]
STRIPE_SIGNING_SECRET=[tu-stripe-signing-secret]
HOST=https://tuneldeltiempoo.vercel.app
```

**Entornos:** ☑️ Production ☑️ Preview ☑️ Development

**Nota:** Si NO usas Stripe, puedes omitir estas variables.

---

## ✅ Checklist para Vercel

Verifica que tengas EXACTAMENTE estas variables:

- [ ] `MONGODB_URI` = [Tu URI completa de MongoDB Atlas]
- [ ] `MONGODB_DB` = `timeTunnel` (EXACTO, con mayúscula T)
- [ ] `NEXTAUTH_URL` = `https://tuneldeltiempoo.vercel.app`
- [ ] `NEXTAUTH_SECRET` = [Tu secret key completa]
- [ ] `VAPID_PUBLIC_KEY` = [Tu clave pública completa]
- [ ] `VAPID_PRIVATE_KEY` = [Tu clave privada completa]
- [ ] `STRIPE_PUBLIC_KEY` = [Solo si usas Stripe]
- [ ] `STRIPE_SECRET_KEY` = [Solo si usas Stripe]
- [ ] `STRIPE_SIGNING_SECRET` = [Solo si usas Stripe]
- [ ] `HOST` = `https://tuneldeltiempoo.vercel.app` [Solo si usas Stripe]

---

## 🔍 Cómo Verificar que Funciona

1. **Después de agregar las variables en Vercel:**
   - Ve a tu proyecto en Vercel
   - Haz clic en "Redeploy" → "Redeploy without cache"
   - Espera a que termine el deploy

2. **Prueba el registro:**
   - Ve a `https://tuneldeltiempoo.vercel.app/register`
   - Intenta registrar un usuario
   - Si funciona, verás "Registro exitoso"
   - Si da error 500, revisa los logs en Vercel

3. **Revisar logs en Vercel:**
   - Ve a tu proyecto en Vercel
   - Haz clic en "Deployments"
   - Haz clic en el último deployment
   - Haz clic en "Functions" → Busca `/api/auth/register`
   - Revisa los logs que empiezan con `[REGISTER]`

---

## ⚠️ Errores Comunes

### Error 500 en Registro

**Causa:** Faltan variables de entorno o están mal configuradas

**Solución:**
1. Verifica que `MONGODB_URI` esté configurada correctamente
2. Verifica que `MONGODB_DB` sea exactamente `timeTunnel`
3. Verifica que `NEXTAUTH_SECRET` esté configurada
4. Haz un redeploy sin caché después de agregar las variables

### Error 401 en Login

**Causa:** `NEXTAUTH_URL` o `NEXTAUTH_SECRET` mal configuradas

**Solución:**
1. Verifica que `NEXTAUTH_URL` sea exactamente `https://tuneldeltiempoo.vercel.app`
2. Verifica que `NEXTAUTH_SECRET` sea la misma que en tu `.env.local`
3. Haz un redeploy sin caché

---

## 📝 Notas Finales

- **NO agregues espacios** al inicio o final de los valores
- **Copia los valores EXACTOS** desde tu `.env.local`
- **Después de agregar variables:** Siempre haz un redeploy sin caché
- **Si algo no funciona:** Revisa los logs en Vercel para ver el error exacto

