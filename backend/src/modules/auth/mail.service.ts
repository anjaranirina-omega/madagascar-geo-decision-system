import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT ?? 587);
    const smtpSecure = process.env.SMTP_SECURE === 'true';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn(
        '[MailService] Configuration SMTP incomplète. Les emails ne pourront pas être envoyés.',
      );
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth:
        smtpUser && smtpPass
          ? {
              user: smtpUser,
              pass: smtpPass,
            }
          : undefined,
    });
  }

  async sendPasswordResetEmail(params: {
    to: string;
    firstName?: string;
    resetLink: string;
    expiresInMinutes: number;
  }) {
    const from = process.env.SMTP_FROM ?? 'RISKCLIM-MG <noreply@riskclim.mg>';

    try {
      await this.transporter.sendMail({
        from,
        to: params.to,
        subject: 'Réinitialisation de votre mot de passe RISKCLIM-MG',
        text: this.buildResetPasswordText(params),
        html: this.buildResetPasswordHtml(params),
      });
    } catch (error) {
      console.error('[MailService] Erreur envoi email reset password:', error);

      throw new InternalServerErrorException(
        'Impossible d’envoyer l’email de réinitialisation.',
      );
    }
  }

  private buildResetPasswordText(params: {
    firstName?: string;
    resetLink: string;
    expiresInMinutes: number;
  }) {
    return `
Bonjour ${params.firstName ?? ''},

Vous avez demandé la réinitialisation de votre mot de passe RISKCLIM-MG.

Cliquez sur le lien suivant pour définir un nouveau mot de passe :
${params.resetLink}

Ce lien expire dans ${params.expiresInMinutes} minutes.

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.

RISKCLIM-MG
Système d'aide à la décision climatique géospatialisé
`.trim();
  }

  private buildResetPasswordHtml(params: {
    firstName?: string;
    resetLink: string;
    expiresInMinutes: number;
  }) {
    return `
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Réinitialisation mot de passe</title>
</head>
<body style="margin:0;padding:0;background:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#102033;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #d8e0e7;">
          <tr>
            <td style="background:#061624;padding:28px 32px;color:#ffffff;">
              <div style="font-size:24px;font-weight:800;letter-spacing:0.3px;">
                RISKCLIM-MG
              </div>
              <div style="font-size:13px;color:#cbd5e1;margin-top:6px;">
                Système d'aide à la décision climatique géospatialisé
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:34px 32px;">
              <h1 style="margin:0 0 16px;font-size:24px;color:#102033;">
                Réinitialisation de votre mot de passe
              </h1>

              <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 18px;">
                Bonjour ${params.firstName ?? ''},
              </p>

              <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 24px;">
                Vous avez demandé la réinitialisation de votre mot de passe pour accéder à la plateforme RISKCLIM-MG.
              </p>

              <p style="text-align:center;margin:32px 0;">
                <a href="${params.resetLink}"
                   style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;">
                  Réinitialiser mon mot de passe
                </a>
              </p>

              <p style="font-size:14px;line-height:1.7;color:#64748b;margin:0 0 14px;">
                Ce lien expire dans <strong>${params.expiresInMinutes} minutes</strong>.
              </p>

              <p style="font-size:14px;line-height:1.7;color:#64748b;margin:0;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
              </p>

              <p style="word-break:break-all;font-size:13px;color:#2563eb;margin-top:10px;">
                ${params.resetLink}
              </p>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />

              <p style="font-size:13px;line-height:1.6;color:#94a3b8;margin:0;">
                Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.
              </p>
            </td>
          </tr>
        </table>

        <p style="font-size:12px;color:#94a3b8;margin-top:18px;">
          © 2026 RISKCLIM-MG — Plateforme sécurisée
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
  }
}
