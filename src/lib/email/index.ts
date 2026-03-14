// src/lib/email/index.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM = `${process.env.RESEND_FROM_NAME ?? "Torx Survey"} <${process.env.RESEND_FROM_EMAIL ?? "noreply@torx.com"}>`;

interface SendSurveyEmailParams {
  to: string;
  recipientName: string;
  senderName: string;
  subject: string;
  surveyTitle: string;
  token: string;
}

export async function sendSurveyEmail(params: SendSurveyEmailParams) {
  const { to, recipientName, senderName, subject, surveyTitle, token } = params;
  const surveyLink = `${APP_URL}/r/${token}`;
  const firstName = recipientName.split(" ")[0];

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          
          <!-- HEADER -->
          <tr>
            <td style="background:#0B1220;border-radius:12px 12px 0 0;padding:28px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-flex;align-items:center;gap:8px;">
                      <span style="width:8px;height:8px;border-radius:50%;background:#C84B31;display:inline-block;"></span>
                      <span style="font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#fff;">TORX SURVEY</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- BODY -->
          <tr>
            <td style="background:#ffffff;padding:36px 36px 28px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#C84B31;">Encuesta para vos</p>
              <h1 style="margin:0 0 20px;font-size:24px;font-weight:600;color:#0B1220;line-height:1.3;">${surveyTitle}</h1>
              
              <p style="margin:0 0 24px;font-size:16px;color:#444;line-height:1.7;">
                Hola <strong>${firstName}</strong>,<br>
                <strong>${senderName}</strong> te invita a participar de esta encuesta rápida.
                Solo te tomará 2 minutos y tu opinión es muy valiosa para nosotros.
              </p>
              
              <!-- IMPORTANTE: botón con link único -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center">
                    <a href="${surveyLink}" 
                       style="display:inline-block;background:#C84B31;color:#ffffff;font-size:14px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;padding:14px 36px;border-radius:8px;text-decoration:none;">
                      Responder ahora →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
                Este link es exclusivo para <strong>${recipientName}</strong> y solo puede usarse una vez.
                Si no esperabas este mail, podés ignorarlo.
              </p>
            </td>
          </tr>
          
          <!-- LINK TEXTO (fallback) -->
          <tr>
            <td style="background:#f8f7f4;padding:16px 36px;border-top:1px solid #e8e5e0;">
              <p style="margin:0;font-size:11px;color:#999;">
                Si el botón no funciona, copiá este link:
                <br>
                <a href="${surveyLink}" style="color:#C84B31;word-break:break-all;">${surveyLink}</a>
              </p>
            </td>
          </tr>
          
          <!-- FOOTER -->
          <tr>
            <td style="background:#0B1220;border-radius:0 0 12px 12px;padding:16px 36px;">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3);text-align:center;letter-spacing:0.08em;">
                TORX SURVEY · Plataforma de encuestas
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();

  // Modo desarrollo: solo loguear si no hay API key real
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith("re_xxx")) {
    console.log(`[Email DEV] To: ${to} | Link: ${surveyLink}`);
    return { id: "dev-" + Date.now() };
  }

  const result = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }

  return result.data;
}
