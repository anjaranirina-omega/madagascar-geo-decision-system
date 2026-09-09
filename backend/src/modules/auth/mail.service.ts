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

  async sendCriticalAlertEmail(params: {
    to: string;
    recipientName?: string;
    alert: {
      id: string;
      titre: string;
      message: string;
      type: string;
      niveau: string;
      zoneNom?: string;
      zoneType?: string;
      riskValue?: number;
      riskMean?: number;
      populationExposed?: number;
      createdAt?: Date | string;
    };
  }) {
    const from = process.env.SMTP_FROM ?? 'RISKCLIM-MG <noreply@riskclim.mg>';
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

    try {
      await this.transporter.sendMail({
        from,
        to: params.to,
        subject: `[ALERTE CRITIQUE] ${params.alert.titre}`,
        text: this.buildCriticalAlertText(params, appUrl),
        html: this.buildCriticalAlertHtml(params, appUrl),
      });
    } catch (error: any) {
      console.warn(
        `[MailService] Impossible d’envoyer l’email d’alerte critique à ${params.to}: ${error?.message}`,
      );
    }
  }

  private buildCriticalAlertText(
    params: {
      to: string;
      recipientName?: string;
      alert: {
        id: string;
        titre: string;
        message: string;
        type: string;
        niveau: string;
        zoneNom?: string;
        zoneType?: string;
        riskValue?: number;
        riskMean?: number;
        populationExposed?: number;
        createdAt?: Date | string;
      };
    },
    appUrl: string,
  ) {
    const alertUrl = `${appUrl}/alertes`;
    return `
ALERTE CLIMATIQUE CRITIQUE — RISKCLIM-MG

Bonjour ${params.recipientName ?? ''},

Une alerte de niveau CRITIQUE a été détectée sur la plateforme :

Titre : ${params.alert.titre}
Zone géographique : ${params.alert.zoneNom ?? 'Madagascar'} (${params.alert.zoneType ?? 'Région'})
Type de risque : ${params.alert.type}
Niveau : ${params.alert.niveau}
Score de risque : ${typeof params.alert.riskValue === 'number' ? params.alert.riskValue.toFixed(1) : '—'} / 100
${params.alert.populationExposed ? `Population exposée : ${Math.round(params.alert.populationExposed).toLocaleString('fr-FR')} habitants` : ''}

Détails :
${params.alert.message}

Consulter l'alerte sur la plateforme :
${alertUrl}

--
RISKCLIM-MG — Système d'aide à la décision climatique géospatialisé
`.trim();
  }

  private buildCriticalAlertHtml(
    params: {
      to: string;
      recipientName?: string;
      alert: {
        id: string;
        titre: string;
        message: string;
        type: string;
        niveau: string;
        zoneNom?: string;
        zoneType?: string;
        riskValue?: number;
        riskMean?: number;
        populationExposed?: number;
        createdAt?: Date | string;
      };
    },
    appUrl: string,
  ) {
    const alertUrl = `${appUrl}/alertes`;
    const scoreText =
      typeof params.alert.riskValue === 'number'
        ? `${params.alert.riskValue.toFixed(1)} / 100`
        : '—';

    return `
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Alerte Critique RISKCLIM-MG</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 10px 25px rgba(0,0,0,0.05);">
          <!-- Header Danger -->
          <tr>
            <td style="background:#dc2626;padding:26px 32px;color:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:22px;font-weight:900;letter-spacing:0.5px;">
                      ⚠️ ALERTE CLIMATIQUE CRITIQUE
                    </div>
                    <div style="font-size:13px;color:#fee2e2;margin-top:4px;">
                      RISKCLIM-MG — Plateforme géodécisionnelle
                    </div>
                  </td>
                  <td align="right">
                    <span style="background:#ffffff;color:#dc2626;padding:6px 12px;border-radius:8px;font-weight:800;font-size:12px;text-transform:uppercase;">
                      Niveau Critique
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 16px;">
                Bonjour <strong>${params.recipientName ?? ''}</strong>,
              </p>

              <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 20px;">
                Le système automatisé d’aide à la décision a identifié une situation à <strong>haut risque nécessitant une attention immédiate</strong>.
              </p>

              <!-- Card info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:14px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <div style="font-size:18px;font-weight:800;color:#991b1b;margin-bottom:12px;">
                      ${params.alert.titre}
                    </div>

                    <table width="100%" cellpadding="4" cellspacing="0" style="font-size:14px;color:#475569;">
                      <tr>
                        <td width="160" style="font-weight:bold;color:#64748b;">Zone géographique :</td>
                        <td style="font-weight:bold;color:#0f172a;">${params.alert.zoneNom ?? 'Madagascar'} (${params.alert.zoneType ?? 'Région'})</td>
                      </tr>
                      <tr>
                        <td style="font-weight:bold;color:#64748b;">Type de risque :</td>
                        <td>${params.alert.type}</td>
                      </tr>
                      <tr>
                        <td style="font-weight:bold;color:#64748b;">Score maximal :</td>
                        <td style="font-weight:bold;color:#dc2626;font-size:16px;">${scoreText}</td>
                      </tr>
                      ${params.alert.populationExposed ? `
                      <tr>
                        <td style="font-weight:bold;color:#64748b;">Population exposée :</td>
                        <td>${Math.round(params.alert.populationExposed).toLocaleString('fr-FR')} habitants</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Message -->
              <div style="background:#f8fafc;border-left:4px solid #dc2626;padding:16px;border-radius:6px;font-size:14px;line-height:1.6;color:#334155;margin-bottom:28px;">
                <strong>Message d'alerte :</strong><br />
                ${params.alert.message}
              </div>

              <!-- Action button -->
              <p style="text-align:center;margin:32px 0 16px;">
                <a href="${alertUrl}"
                   style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:800;font-size:15px;box-shadow:0 4px 12px rgba(220,38,38,0.25);">
                  Consulter l'alerte sur la plateforme
                </a>
              </p>

              <p style="text-align:center;font-size:12px;color:#94a3b8;margin:0;">
                Accès direct : <a href="${alertUrl}" style="color:#2563eb;">${alertUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="font-size:12px;color:#64748b;margin:0 0 4px;">
                Notification automatique générée par le système <strong>RISKCLIM-MG</strong>.
              </p>
              <p style="font-size:11px;color:#94a3b8;margin:0;">
                © 2026 RISKCLIM-MG — Système géodécisionnel d'aide à la décision climatique
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
  }
}
