import { Resend } from 'resend'

const resend      = new Resend(process.env.RESEND_API_KEY)
const FROM        = process.env.EMAIL_FROM ?? 'Retro Reeves <onboarding@resend.dev>'
const DEV_OVERRIDE = process.env.EMAIL_DEV_OVERRIDE  // si está, todos los emails van aquí
const SITE   = 'https://retroreeves.com'

interface OrderItem {
  productName: string
  size:        string
  color?:      string | null
  qty:         number
  unitPrice:   string
}

interface OrderConfirmParams {
  to:           string
  orderNumber:  string
  items:        OrderItem[]
  subtotal:     string
  discount:     string
  shipping:     string
  total:        string
  name?:        string | null
}

export async function sendOrderConfirmation(p: OrderConfirmParams) {
  const itemRows = p.items.map(i => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;">${i.productName}</td>
      <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;text-align:center;">${i.size}${i.color ? ` / ${i.color}` : ''}</td>
      <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;text-align:center;">${i.qty}</td>
      <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;text-align:right;">$${i.unitPrice}</td>
    </tr>`).join('')

  const discountRow = parseFloat(p.discount) > 0
    ? `<tr><td colspan="3" style="padding:4px 0;color:#888;">Descuento</td><td style="padding:4px 0;text-align:right;color:#888;">-$${p.discount}</td></tr>`
    : ''
  const shippingLabel = parseFloat(p.shipping) === 0 ? 'GRATIS' : `$${p.shipping}`
  const shippingRow = `<tr><td colspan="3" style="padding:4px 0;color:#888;">Envío</td><td style="padding:4px 0;text-align:right;color:${parseFloat(p.shipping) === 0 ? '#4ade80' : '#888'};">${shippingLabel}</td></tr>`

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#f0f0f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo / Header -->
        <tr><td style="padding:0 0 32px 0;text-align:center;">
          <span style="font-size:28px;font-weight:900;letter-spacing:4px;color:#fff;">RETRO REEVES</span>
        </td></tr>

        <!-- Hero -->
        <tr><td style="background:#111;border-radius:12px;padding:32px;margin-bottom:24px;">
          <p style="margin:0 0 8px 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#888;">Pedido confirmado</p>
          <h1 style="margin:0 0 4px 0;font-size:24px;font-weight:800;color:#fff;">${p.orderNumber}</h1>
          <p style="margin:0 0 24px 0;font-size:14px;color:#888;">
            ${p.name ? `Hola ${p.name}, t` : 'T'}u pedido fue recibido y está siendo procesado.
          </p>

          <!-- Items table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
            <thead>
              <tr style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">
                <th style="padding:0 0 8px 0;text-align:left;">Producto</th>
                <th style="padding:0 0 8px 0;text-align:center;">Talla/Color</th>
                <th style="padding:0 0 8px 0;text-align:center;">Cant</th>
                <th style="padding:0 0 8px 0;text-align:right;">Precio</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              ${discountRow}
              ${shippingRow}
              <tr>
                <td colspan="3" style="padding:12px 0 0 0;font-weight:700;font-size:16px;">Total</td>
                <td style="padding:12px 0 0 0;text-align:right;font-weight:700;font-size:16px;color:#fff;">$${p.total} MXN</td>
              </tr>
            </tfoot>
          </table>
        </td></tr>

        <!-- CTA tracking -->
        <tr><td style="padding:24px 0;text-align:center;">
          <a href="${SITE}/seguimiento?order=${p.orderNumber}"
             style="display:inline-block;background:#fff;color:#000;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:6px;">
            Rastrear pedido
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:0;text-align:center;font-size:12px;color:#444;">
          ¿Dudas? Escríbenos por
          <a href="https://wa.me/5217773019146" style="color:#666;">WhatsApp</a>
          &nbsp;·&nbsp; © ${new Date().getFullYear()} Retro Reeves
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  return resend.emails.send({
    from:    FROM,
    to:      [DEV_OVERRIDE ?? p.to],
    subject: `Pedido recibido ${p.orderNumber} — Retro Reeves`,
    html,
  })
}

interface ShippedParams {
  to:          string
  orderNumber: string
  carrier?:    string | null
  trackingNum?: string | null
  name?:       string | null
}

interface PasswordResetParams {
  to:   string
  url:  string
  name?: string | null
}

export async function sendPasswordReset(p: PasswordResetParams) {
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#f0f0f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 0 32px 0;text-align:center;">
          <span style="font-size:28px;font-weight:900;letter-spacing:4px;color:#fff;">RETRO REEVES</span>
        </td></tr>
        <tr><td style="background:#111;border-radius:12px;padding:32px;">
          <p style="margin:0 0 8px 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#888;">Recuperar contraseña</p>
          <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:800;color:#fff;">¿Olvidaste tu contraseña?</h1>
          <p style="margin:0 0 24px 0;font-size:14px;color:#888;line-height:1.6;">
            ${p.name ? `Hola ${p.name}, r` : 'R'}ecibimos una solicitud para restablecer la contraseña de tu cuenta. El enlace expira en 1 hora.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${p.url}"
                 style="display:inline-block;background:#fff;color:#000;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:6px;">
                Restablecer contraseña
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0 0;font-size:12px;color:#555;">Si no solicitaste este cambio, ignora este correo. Tu contraseña no cambiará.</p>
        </td></tr>
        <tr><td style="padding:24px 0;text-align:center;font-size:12px;color:#444;">
          ¿Dudas? Escríbenos por
          <a href="https://wa.me/5217773019146" style="color:#666;">WhatsApp</a>
          &nbsp;·&nbsp; © ${new Date().getFullYear()} Retro Reeves
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return resend.emails.send({
    from:    FROM,
    to:      [DEV_OVERRIDE ?? p.to],
    subject: 'Restablece tu contraseña — Retro Reeves',
    html,
  })
}

export async function sendOrderShipped(p: ShippedParams) {
  const trackingLine = p.trackingNum
    ? `<p style="margin:8px 0 0 0;font-size:14px;color:#888;">Guía: <strong style="color:#fff;">${p.carrier ? p.carrier + ' ' : ''}${p.trackingNum}</strong></p>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#f0f0f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <tr><td style="padding:0 0 32px 0;text-align:center;">
          <span style="font-size:28px;font-weight:900;letter-spacing:4px;color:#fff;">RETRO REEVES</span>
        </td></tr>

        <tr><td style="background:#111;border-radius:12px;padding:32px;">
          <p style="margin:0 0 8px 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#888;">Tu pedido va en camino 🚚</p>
          <h1 style="margin:0 0 4px 0;font-size:24px;font-weight:800;color:#fff;">${p.orderNumber}</h1>
          <p style="margin:0 0 0 0;font-size:14px;color:#888;">
            ${p.name ? `${p.name}, t` : 'T'}u pedido fue enviado y llegará pronto.
          </p>
          ${trackingLine}
        </td></tr>

        <tr><td style="padding:24px 0;text-align:center;">
          <a href="${SITE}/seguimiento?order=${p.orderNumber}"
             style="display:inline-block;background:#fff;color:#000;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:6px;">
            Rastrear pedido
          </a>
        </td></tr>

        <tr><td style="padding:0;text-align:center;font-size:12px;color:#444;">
          ¿Dudas? Escríbenos por
          <a href="https://wa.me/5217773019146" style="color:#666;">WhatsApp</a>
          &nbsp;·&nbsp; © ${new Date().getFullYear()} Retro Reeves
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  return resend.emails.send({
    from:    FROM,
    to:      [DEV_OVERRIDE ?? p.to],
    subject: `Tu pedido ${p.orderNumber} está en camino — Retro Reeves`,
    html,
  })
}
