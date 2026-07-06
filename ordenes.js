const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Configuración de transporter usando variables de entorno
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined,
  secure: (process.env.SMTP_SECURE === 'true') || (process.env.SMTP_PORT == 465),
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  tls: {
    rejectUnauthorized: false, // Permite certificados autofirmados en entornos locales/corporativos
  },
});

// Verificar transporte SMTP al inicio para detectar problemas temprano
transporter.verify()
  .then(() => console.log('✅ SMTP transporter verificado'))
  .catch(err => console.error('❌ Error verificando SMTP transporter:', err));

function formatPrecio(n) {
  return '$' + Number(n).toLocaleString('es-CL');
}

// ── Plantilla HTML del correo de confirmación ─────────────────────────────────
function buildEmailHtml({ folio, fecha, hora, metodo, datosEnvio, items, subtotal, totalProductos, adminEmail }) {
  const itemsHtml = (items || []).map(i => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #EDE9F6;font-size:14px;color:#3D3057">${i.nombre}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #EDE9F6;font-size:14px;color:#3D3057;text-align:center">${i.cantidad}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #EDE9F6;font-size:14px;color:#3D3057;text-align:right">${formatPrecio(i.precio)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #EDE9F6;font-size:14px;color:#7B5EA7;text-align:right;font-weight:600">${formatPrecio(i.precio * i.cantidad)}</td>
    </tr>
  `).join('');

  const metodoPretty = metodo === 'tarjeta' ? 'Tarjeta de crédito/débito' : 'Transferencia bancaria';

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F7F4FB;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4FB;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(123,94,167,.10)">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#7B5EA7 0%,#9B7EC8 100%);padding:32px 40px;text-align:center">
            <svg width="36" height="36" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="13" stroke="#fff" stroke-width="1.5"/>
              <path d="M14 6c0 4.418-3.582 8-8 8 4.418 0 8 3.582 8 8 0-4.418 3.582-8 8-8-4.418 0-8-3.582-8-8z" fill="#fff"/>
            </svg>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;letter-spacing:.5px">Aromatizarte</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,.80);font-size:13px">Aceites esenciales y brumas artesanales</p>
          </td>
        </tr>

        <!-- SALUDO Y ESTADO -->
        <tr>
          <td style="padding:36px 40px 0;text-align:center">
            <h2 style="margin:0 0 6px;font-size:20px;color:#3D3057">¡Compra confirmada!</h2>
            <p style="margin:0;color:#6B6080;font-size:14px">Hola <strong>${datosEnvio.nombre || ''} ${datosEnvio.apellido || ''}</strong>, gracias por tu pedido.</p>

            <!-- FOLIO DESTACADO -->
            <div style="background:#F7F4FB;border-left:4px solid #7B5EA7;border-radius:6px;padding:14px 18px;margin:24px 0 0;text-align:left">
              <p style="margin:0;font-size:13px;color:#6B6080">Número de identificación del pedido</p>
              <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#7B5EA7;letter-spacing:1px">${folio}</p>
            </div>
          </td>
        </tr>

        <!-- DETALLE DE PRODUCTOS -->
        <tr>
          <td style="padding:28px 40px 0">
            <h3 style="margin:0 0 12px;font-size:15px;color:#3D3057;font-weight:700">Detalle de productos</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EDE9F6;border-radius:8px;border-collapse:collapse">
              <thead>
                <tr style="background:#F7F4FB">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6B6080;font-weight:600;text-transform:uppercase">Producto</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6B6080;font-weight:600;text-transform:uppercase">Cant.</th>
                  <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6B6080;font-weight:600;text-transform:uppercase">Precio unit.</th>
                  <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6B6080;font-weight:600;text-transform:uppercase">Total</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>

            <!-- RESUMEN FINANCIERO -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6B6080">Cantidad total de productos</td>
                <td style="padding:6px 0;font-size:13px;color:#3D3057;text-align:right;font-weight:600">${totalProductos} unidad${totalProductos !== 1 ? 'es' : ''}</td>
              </tr>
              <tr>
                <td style="padding:10px 0 4px;font-size:16px;color:#3D3057;font-weight:700;border-top:2px solid #EDE9F6">Monto total pagado</td>
                <td style="padding:10px 0 4px;font-size:18px;color:#7B5EA7;font-weight:700;text-align:right;border-top:2px solid #EDE9F6">${formatPrecio(subtotal)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- INFO DEL PEDIDO -->
        <tr>
          <td style="padding:28px 40px">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EDE9F6;border-radius:8px;border-collapse:collapse">
              <tr style="background:#F7F4FB">
                <td colspan="2" style="padding:10px 16px;font-size:13px;font-weight:700;color:#3D3057;text-transform:uppercase;letter-spacing:.5px">Información del pedido</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#6B6080;border-top:1px solid #EDE9F6;width:40%">Fecha de compra</td>
                <td style="padding:10px 16px;font-size:13px;color:#3D3057;border-top:1px solid #EDE9F6;font-weight:600">${fecha} a las ${hora}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#6B6080;border-top:1px solid #EDE9F6">Método de pago</td>
                <td style="padding:10px 16px;font-size:13px;color:#3D3057;border-top:1px solid #EDE9F6;font-weight:600">${metodoPretty}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#6B6080;border-top:1px solid #EDE9F6">Dirección de envío</td>
                <td style="padding:10px 16px;font-size:13px;color:#3D3057;border-top:1px solid #EDE9F6;font-weight:600">${datosEnvio.direccion || ''}, ${datosEnvio.comuna || ''}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#6B6080;border-top:1px solid #EDE9F6">Contacto</td>
                <td style="padding:10px 16px;font-size:13px;color:#3D3057;border-top:1px solid #EDE9F6;font-weight:600">${datosEnvio.correo}<br/>${datosEnvio.celular || ''}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- NOTA CONTACTO -->
        <tr>
          <td style="padding:0 40px 32px">
            <div style="background:#FFF8F0;border:1px solid #FDDCB0;border-radius:8px;padding:14px 18px;font-size:13px;color:#7A5C2E">
              ¿No recibiste este correo o tienes algún problema con tu pedido? Escríbenos a
              <a href="mailto:${adminEmail}" style="color:#7B5EA7;font-weight:600">${adminEmail}</a>
              y la administradora te ayudará a la brevedad.
            </div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#3D3057;padding:20px 40px;text-align:center">
            <p style="margin:0;color:rgba(255,255,255,.60);font-size:12px">© ${new Date().getFullYear()} Aromatizarte — Todos los derechos reservados</p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,.40);font-size:11px">Este correo fue generado automáticamente, por favor no respondas a este mensaje.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Plantilla HTML del correo de ERROR (excepción HU) ────────────────────────
function buildErrorEmailHtml({ folio, clienteCorreo, adminEmail, errorMsg }) {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:32px;background:#F7F4FB;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
      <tr><td style="background:#C0392B;padding:24px 32px;text-align:center">
        <h2 style="margin:0;color:#fff;font-size:18px">Error de notificacion — Aromatizarte</h2>
      </td></tr>
      <tr><td style="padding:28px 32px;font-size:14px;color:#333;line-height:1.6">
        <p>La notificacion de compra para el pedido <strong>${folio}</strong> <strong>no pudo ser enviada</strong> al cliente.</p>
        <div style="background:#FFF3F3;border:1px solid #FBBEBE;border-radius:6px;padding:12px 16px;margin:12px 0">
          <p style="margin:0;font-size:13px;color:#C0392B"><strong>Correo destino:</strong> ${clienteCorreo}</p>
          <p style="margin:8px 0 0;font-size:13px;color:#C0392B"><strong>Error:</strong> ${errorMsg}</p>
        </div>
        <p>Por favor contacta directamente al cliente y enviala manualmente la confirmacion del pedido <strong>${folio}</strong>.</p>
      </td></tr>
      <tr><td style="background:#F7F4FB;padding:14px 32px;text-align:center;font-size:12px;color:#888">
        Aromatizarte — Sistema de notificaciones automaticas
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;
}

// ── POST /api/ordenes ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { folio, fecha, hora, metodo, datosEnvio, items, subtotal } = req.body;

    if (!datosEnvio || !datosEnvio.correo) {
      return res.status(400).json({ error: 'datosEnvio.correo requerido' });
    }
    if (!folio || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Datos de la orden incompletos' });
    }

    const to          = datosEnvio.correo;
    const adminEmail  = process.env.ADMIN_EMAIL || 'admin@localhost';
    const from        = process.env.FROM_EMAIL  || `no-reply@${process.env.SMTP_HOST || 'localhost'}`;
    const totalProductos = (items || []).reduce((sum, i) => sum + (parseInt(i.cantidad) || 0), 0);

    const htmlConfirmacion = buildEmailHtml({
      folio, fecha, hora, metodo, datosEnvio, items, subtotal, totalProductos, adminEmail
    });

    // ── 1. Intentar enviar correo al cliente ──────────────────────────────────
    let clienteSent = false;
    let sendError   = null;

    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject: `Aromatizarte — Confirmacion de pedido ${folio}`,
        html: htmlConfirmacion,
      });
      console.log(`Email enviado al cliente: ${to} | messageId: ${info.messageId}`);
      clienteSent = true;
    } catch (sendErr) {
      sendError = sendErr;
      console.error('Error enviando email al cliente:', sendErr.message);
    }

    // ── 2. Notificar al admin según resultado ─────────────────────────────────
    if (clienteSent) {
      // Flujo normal: copia informativa al admin
      try {
        await transporter.sendMail({
          from,
          to: adminEmail,
          subject: `[Copia] Pedido ${folio} confirmado — ${to}`,
          html: `<p style="font-family:Arial,sans-serif;font-size:14px">Confirmacion enviada al cliente <strong>${to}</strong> para el pedido <strong>${folio}</strong>.</p><hr/>${htmlConfirmacion}`,
        });
        console.log(`Copia enviada al admin: ${adminEmail}`);
      } catch (err) {
        console.error('Error enviando copia al admin:', err.message);
      }

      return res.json({ ok: true, message: 'Correo de confirmacion enviado al cliente' });

    } else {
      // ── Excepción HU: notificar al admin para acción manual ───────────────
      const errorMsg = sendError ? sendError.message : 'Error desconocido';
      try {
        await transporter.sendMail({
          from,
          to: adminEmail,
          subject: `ERROR notificacion — Pedido ${folio} no enviado a ${to}`,
          html: buildErrorEmailHtml({ folio, clienteCorreo: to, adminEmail, errorMsg }),
        });
        console.log(`Notificacion de error enviada al admin: ${adminEmail}`);
      } catch (err) {
        console.error('Error enviando notificacion de error al admin:', err.message);
      }

      return res.status(500).json({
        error: 'No pudimos enviar el correo de confirmacion. La administradora ha sido notificada y te contactara a la brevedad.',
        fallback: true,
      });
    }

  } catch (err) {
    console.error('Error inesperado en /api/ordenes:', err);
    res.status(500).json({ error: 'Error interno al procesar la notificacion' });
  }
});

module.exports = router;