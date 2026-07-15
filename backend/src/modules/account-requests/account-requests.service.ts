import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as nodemailer from 'nodemailer';
import { Repository } from 'typeorm';
import { CreateAccountRequestDto } from './dto/create-account-request.dto';
import {
  AccountRequest,
  AccountRequestStatus,
} from './entities/account-request.entity';

@Injectable()
export class AccountRequestsService {
  constructor(
    @InjectRepository(AccountRequest)
    private readonly accountRequestsRepository: Repository<AccountRequest>,
  ) {}

  async create(dto: CreateAccountRequestDto) {
    const request = this.accountRequestsRepository.create({
      fullName: dto.fullName.trim(),
      organization: dto.organization.trim(),
      position: dto.position.trim(),
      requestedRole: dto.requestedRole,
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone?.trim(),
      justification: dto.justification.trim(),
      status: AccountRequestStatus.PENDING,
    });

    const savedRequest = await this.accountRequestsRepository.save(request);

    await this.sendAccountRequestEmail(savedRequest);

    return {
      message:
        'Votre demande de compte a été envoyée à l’administrateur.',
      requestId: savedRequest.id,
    };
  }

  findAll() {
    return this.accountRequestsRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  private async sendAccountRequestEmail(request: AccountRequest) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT ?? 587);
    const smtpSecure = process.env.SMTP_SECURE === 'true';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    const adminEmail =
      process.env.ADMIN_CONTACT_EMAIL ??
      process.env.SMTP_USER;

    const from =
      process.env.SMTP_FROM ??
      `RISKCLIM-MG <${smtpUser}>`;

    if (!smtpHost || !smtpUser || !smtpPass || !adminEmail) {
      throw new InternalServerErrorException(
        'Configuration SMTP ou email administrateur incomplète.',
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    try {
      await transporter.sendMail({
        from,
        to: adminEmail,
        replyTo: request.email,
        subject: `Nouvelle demande de compte RISKCLIM-MG - ${request.fullName}`,
        text: this.buildTextEmail(request),
        html: this.buildHtmlEmail(request),
      });
    } catch (error) {
      console.error('[AccountRequests] Erreur envoi email:', error);

      throw new InternalServerErrorException(
        'La demande a été créée, mais l’email n’a pas pu être envoyé.',
      );
    }
  }

  private buildTextEmail(request: AccountRequest) {
    return `
Nouvelle demande de création de compte RISKCLIM-MG

Nom complet : ${request.fullName}
Organisation : ${request.organization}
Fonction : ${request.position}
Rôle souhaité : ${request.requestedRole}
Email : ${request.email}
Téléphone : ${request.phone ?? 'Non renseigné'}

Justification :
${request.justification}

Statut : ${request.status}
ID demande : ${request.id}
Date : ${request.createdAt.toISOString()}
`.trim();
  }

  private buildHtmlEmail(request: AccountRequest) {
    return `
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Nouvelle demande de compte</title>
</head>
<body style="margin:0;padding:0;background:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#102033;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #d8e0e7;">
          <tr>
            <td style="background:#061624;padding:28px 32px;color:#ffffff;">
              <div style="font-size:24px;font-weight:800;">RISKCLIM-MG</div>
              <div style="font-size:13px;color:#cbd5e1;margin-top:6px;">
                Nouvelle demande de création de compte
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 20px;font-size:22px;color:#102033;">
                Demande d’accès utilisateur
              </h1>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                ${this.row('Nom complet', request.fullName)}
                ${this.row('Organisation', request.organization)}
                ${this.row('Fonction', request.position)}
                ${this.row('Rôle souhaité', request.requestedRole)}
                ${this.row('Email', request.email)}
                ${this.row('Téléphone', request.phone ?? 'Non renseigné')}
                ${this.row('Statut', request.status)}
                ${this.row('ID demande', request.id)}
              </table>

              <h2 style="font-size:16px;margin:28px 0 10px;color:#102033;">
                Justification
              </h2>

              <p style="font-size:14px;line-height:1.7;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
                ${this.escapeHtml(request.justification)}
              </p>

              <p style="font-size:13px;line-height:1.6;color:#64748b;margin-top:24px;">
                Vous pouvez répondre directement à cet email pour contacter le demandeur.
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

  private row(label: string, value: string) {
    return `
<tr>
  <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#64748b;width:180px;">
    ${this.escapeHtml(label)}
  </td>
  <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;color:#102033;">
    ${this.escapeHtml(value)}
  </td>
</tr>
`;
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
