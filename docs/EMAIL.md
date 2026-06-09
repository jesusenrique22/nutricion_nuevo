# Email en Anttova — SMTP propio (sin SaaS de pago)

Anttova envía correos de **verificación de cuenta** y **recuperación de contraseña** únicamente por **SMTP**. No usa Resend, SendGrid ni APIs de pago por email.

---

## Opciones recomendadas (de mejor a peor para producción)

### 1. Postfix en tu VPS (recomendado)

**Costo extra:** $0 (solo el VPS que ya vas a usar para la app).

El servidor Next.js envía mail al Postfix local (`127.0.0.1:25`), y Postfix entrega a Gmail/Outlook/etc.

**`.env` en el VPS:**

```env
NEXTAUTH_URL="https://tudominio.com"
EMAIL_FROM="Anttova <consultas@tudominio.com>"
EMAIL_REPLY_TO="consultasreales@gmail.com"

SMTP_HOST="127.0.0.1"
SMTP_PORT="25"
SMTP_SECURE="false"
SMTP_REQUIRE_TLS="false"
```

**En el VPS (Ubuntu/Debian), resumen:**

```bash
sudo apt update && sudo apt install -y postfix mailutils
# Elegí "Internet Site" y tu dominio (ej. anttova.com)
```

**DNS obligatorio para que no caiga en spam:**

| Registro | Ejemplo |
|----------|---------|
| **SPF** (TXT en `@`) | `v=spf1 mx a ip4:TU_IP_VPS ~all` |
| **DKIM** | `opendkim` en el VPS + TXT `default._domainkey` |
| **DMARC** (TXT en `_dmarc`) | `v=DMARC1; p=none; rua=mailto:admin@tudominio.com` |
| **MX** | apunta a `mail.tudominio.com` o al hostname del VPS |
| **PTR** (reverse DNS) | Que tu proveedor VPS configure el hostname del IP |

Sin SPF/DKIM muchos correos van a spam; con DNS bien configurado es **confiable**.

**Probar:**

```bash
pnpm run email:check
```

---

### 2. Buzón del dominio en tu hosting

Si comprás dominio + hosting (DonWeb, Hostinger, etc.), suele incluir **correo `@tudominio.com`** sin costo mensual extra.

Pedí en el panel: servidor SMTP, usuario y contraseña del buzón.

```env
EMAIL_FROM="Anttova <consultas@tudominio.com>"
SMTP_HOST="mail.tudominio.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="consultas@tudominio.com"
SMTP_PASS="contraseña_del_buzón"
```

---

### 3. Gmail gratuito (desarrollo o pocas cuentas)

No es un servicio de email transaccional de pago; sirve para probar o volumen muy bajo (&lt; ~100/día).

1. Verificación en 2 pasos en Google  
2. Contraseña de aplicación  
3. `.env`:

```env
EMAIL_FROM="Anttova <tu@gmail.com>"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu@gmail.com"
SMTP_PASS="contraseña_de_aplicación"
```

---

## Desarrollo local (sin SMTP)

Si **no** configurás `SMTP_HOST`:

- Registro → cuenta verificada automáticamente  
- Reset / verify → enlace en consola y en pantalla (modo Dev)

---

## Comandos

```bash
pnpm run email:check    # Verifica conexión SMTP
pnpm run dev            # Reiniciar tras cambiar .env
```

---

## Volumen esperado

Para un consultorio (decenas de registros y resets por mes), Postfix local o un buzón del dominio es **más que suficiente** y más confiable que APIs gratuitas con límites estrictos.

---

## Checklist antes de producción

- [ ] `NEXTAUTH_URL` = URL real con HTTPS  
- [ ] `EMAIL_FROM` usa dominio propio (no `@gmail.com` en prod si podés evitarlo)  
- [ ] SPF + DKIM (+ DMARC) configurados  
- [ ] `pnpm run email:check` OK en el VPS  
- [ ] Probar registro + olvidé contraseña con un email real  
