import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CreateAccountRequestDto } from './dto/create-account-request.dto';
import { RejectAccountRequestDto } from './dto/reject-account-request.dto';
import {
  AccountRequest,
  AccountRequestStatus,
} from './entities/account-request.entity';

@Injectable()
export class AccountRequestsService {
  private getEnvValue(name: string) {
    const value = process.env[name]?.trim();
    return value && value.length > 0 ? value : undefined;
  }

  constructor(
    @InjectRepository(AccountRequest)
    private readonly accountRequestsRepository: Repository<AccountRequest>,

    private readonly usersService: UsersService,
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

    await this.sendAccountRequestEmailToAdmin(savedRequest);

    return {
      message: 'Votre demande de compte a été envoyée à l’administrateur.',
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

  async findOne(id: string) {
    const request = await this.accountRequestsRepository.findOne({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Demande de compte introuvable');
    }

    return request;
  }

  async approve(id: string) {
    const request = await this.findOne(id);

    if (request.status !== AccountRequestStatus.PENDING) {
      throw new BadRequestException(
        'Cette demande a déjà été traitée.',
      );
    }

    const existingUser = await this.usersService.findByEmail(request.email);

    if (existingUser) {
      throw new ConflictException(
        'Un utilisateur avec cet email existe déjà.',
      );
    }

    const role = await this.usersService.findRoleByName(
      request.requestedRole,
    );

    const { firstName, lastName } = this.splitFullName(request.fullName);
    const temporaryPassword = this.generateTemporaryPassword();

    const user = await this.usersService.create({
      firstName,
      lastName,
      email: request.email,
      password: temporaryPassword,
      phone: request.phone,
      roleId: role.id,
      isActive: true,
    });

    request.status = AccountRequestStatus.APPROVED;
    await this.accountRequestsRepository.save(request);

    await this.sendApprovedEmailToRequester({
      to: request.email,
      fullName: request.fullName,
      email: request.email,
      temporaryPassword,
      role: request.requestedRole,
    });

    return {
      message: 'Demande approuvée. Le compte utilisateur a été créé.',
      requestId: request.id,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async reject(id: string, dto: RejectAccountRequestDto) {
    const request = await this.findOne(id);

    if (request.status !== AccountRequestStatus.PENDING) {
      throw new BadRequestException(
        'Cette demande a déjà été traitée.',
      );
    }

    request.status = AccountRequestStatus.REJECTED;
    await this.accountRequestsRepository.save(request);

    await this.sendRejectedEmailToRequester({
      to: request.email,
      fullName: request.fullName,
      reason: dto.reason,
    });

    return {
      message: 'Demande rejetée.',
      requestId: request.id,
    };
  }

  private splitFullName(fullName: string) {
    const parts = fullName.trim().split(/\s+/);

    if (parts.length === 1) {
      return {
        firstName: parts[0],
        lastName: '-',
      };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }

  private generateTemporaryPassword() {
    return `Risk-${randomBytes(4).toString('hex')}-MG`;
  }

  private createTransporter() {
    const smtpHost = this.getEnvValue('SMTP_HOST');
    const smtpPort = Number(this.getEnvValue('SMTP_PORT') ?? 587);
    const smtpSecure = this.getEnvValue('SMTP_SECURE') === 'true';
    const smtpUser = this.getEnvValue('SMTP_USER');
    const smtpPass = this.getEnvValue('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new InternalServerErrorException(
        'Configuration SMTP incomplète. Vérifiez SMTP_HOST, SMTP_USER et SMTP_PASS.',
      );
    }

    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  private getMailConfig() {
    const smtpUser = this.getEnvValue('SMTP_USER');

    const adminEmail =
      this.getEnvValue('ADMIN_CONTACT_EMAIL') ||
      smtpUser;

    const from =
      this.getEnvValue('SMTP_FROM') ||
      (smtpUser ? `RISKCLIM-MG <${smtpUser}>` : undefined);

    if (!adminEmail) {
      throw new InternalServerErrorException(
        'Email administrateur non configuré. Ajoutez ADMIN_CONTACT_EMAIL ou SMTP_USER dans backend/.env.',
      );
    }

    if (!from) {
      throw new InternalServerErrorException(
        'Expéditeur email non configuré. Ajoutez SMTP_FROM ou SMTP_USER dans backend/.env.',
      );
    }

    console.log('[AccountRequests] Configuration email:', {
      adminEmail,
      from,
    });

    return {
      from,
      adminEmail,
    };
  }

  private async sendAccountRequestEmailToAdmin(request: AccountRequest) {
    const transporter = this.createTransporter();
    const { from, adminEmail } = this.getMailConfig();

    try {
      await transporter.sendMail({
        from,
        to: adminEmail,
        replyTo: request.email,
        subject: `Nouvelle demande de compte RISKCLIM-MG - ${request.fullName}`,
        text: this.buildAdminTextEmail(request),
        html: this.buildAdminHtmlEmail(request),
      });
    } catch (error) {
      console.error('[AccountRequests] Erreur envoi email admin:', error);

      throw new InternalServerErrorException(
        'La demande a été créée, mais l’email administrateur n’a pas pu être envoyé.',
      );
    }
  }

  private async sendApprovedEmailToRequester(params: {
    to: string;
    fullName: string;
    email: string;
    temporaryPassword: string;
    role: string;
  }) {
    const transporter = this.createTransporter();
    const { from } = this.getMailConfig();
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    try {
      await transporter.sendMail({
        from,
        to: params.to,
        subject: 'Votre compte RISKCLIM-MG a été approuvé',
        text: `
Bonjour ${params.fullName},

Votre demande de compte RISKCLIM-MG a été approuvée.

Identifiants :
Email : ${params.email}
Mot de passe temporaire : ${params.temporaryPassword}
Rôle : ${params.role}

Connectez-vous ici :
${frontendUrl}/login

Pour des raisons de sécurité, changez votre mot de passe après votre première connexion.

RISKCLIM-MG
`.trim(),
        html: `
<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#102033;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="background:white;border-radius:18px;overflow:hidden;border:1px solid #d8e0e7;">
          <tr>
            <td style="background:#061624;color:white;padding:26px 32px;">
              <div style="font-size:24px;font-weight:800;">RISKCLIM-MG</div>
              <div style="font-size:13px;color:#cbd5e1;margin-top:6px;">Compte approuvé</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:24px;">Votre compte a été créé</h1>
              <p style="line-height:1.7;color:#475569;">Bonjour ${this.escapeHtml(params.fullName)},</p>
              <p style="line-height:1.7;color:#475569;">Votre demande d’accès à RISKCLIM-MG a été approuvée.</p>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin:24px 0;">
                <p><strong>Email :</strong> ${this.escapeHtml(params.email)}</p>
                <p><strong>Mot de passe temporaire :</strong> ${this.escapeHtml(params.temporaryPassword)}</p>
                <p><strong>Rôle :</strong> ${this.escapeHtml(params.role)}</p>
              </div>

              <p style="text-align:center;margin:30px 0;">
                <a href="${frontendUrl}/login" style="display:inline-block;background:#16a34a;color:white;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;">
                  Se connecter
                </a>
              </p>

              <p style="font-size:13px;color:#64748b;">
                Pour des raisons de sécurité, changez votre mot de passe après votre première connexion.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim(),
      });
    } catch (error) {
      console.error('[AccountRequests] Erreur email approbation:', error);
      throw new InternalServerErrorException(
        'Le compte a été créé, mais l’email au demandeur n’a pas pu être envoyé.',
      );
    }
  }

  private async sendRejectedEmailToRequester(params: {
    to: string;
    fullName: string;
    reason?: string;
  }) {
    const transporter = this.createTransporter();
    const { from } = this.getMailConfig();

    try {
      await transporter.sendMail({
        from,
        to: params.to,
        subject: 'Votre demande de compte RISKCLIM-MG',
        text: `
Bonjour ${params.fullName},

Votre demande de compte RISKCLIM-MG n’a pas été approuvée.

${params.reason ? `Motif : ${params.reason}` : ''}

Pour plus d'informations, veuillez contacter l’administrateur.

RISKCLIM-MG
`.trim(),
        html: `
<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#102033;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="background:white;border-radius:18px;overflow:hidden;border:1px solid #d8e0e7;">
          <tr>
            <td style="background:#061624;color:white;padding:26px 32px;">
              <div style="font-size:24px;font-weight:800;">RISKCLIM-MG</div>
              <div style="font-size:13px;color:#cbd5e1;margin-top:6px;">Demande de compte</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:24px;">Demande non approuvée</h1>
              <p style="line-height:1.7;color:#475569;">Bonjour ${this.escapeHtml(params.fullName)},</p>
              <p style="line-height:1.7;color:#475569;">Votre demande de compte RISKCLIM-MG n’a pas été approuvée.</p>
              ${
                params.reason
                  ? `<p style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;color:#9a3412;"><strong>Motif :</strong> ${this.escapeHtml(params.reason)}</p>`
                  : ''
              }
              <p style="font-size:13px;color:#64748b;">Pour plus d'informations, veuillez contacter l’administrateur.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim(),
      });
    } catch (error) {
      console.error('[AccountRequests] Erreur email rejet:', error);
      throw new InternalServerErrorException(
        'La demande a été rejetée, mais l’email au demandeur n’a pas pu être envoyé.',
      );
    }
  }

  private buildAdminTextEmail(request: AccountRequest) {
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

  private buildAdminHtmlEmail(request: AccountRequest) {
    return `
<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#102033;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #d8e0e7;">
          <tr>
            <td style="background:#061624;padding:28px 32px;color:#ffffff;">
              <div style="font-size:24px;font-weight:800;">RISKCLIM-MG</div>
              <div style="font-size:13px;color:#cbd5e1;margin-top:6px;">Nouvelle demande de création de compte</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 20px;font-size:22px;color:#102033;">Demande d’accès utilisateur</h1>
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
              <h2 style="font-size:16px;margin:28px 0 10px;color:#102033;">Justification</h2>
              <p style="font-size:14px;line-height:1.7;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
                ${this.escapeHtml(request.justification)}
              </p>
              <p style="font-size:13px;line-height:1.6;color:#64748b;margin-top:24px;">
                Vous pouvez répondre directement à cet email pour contacter le demandeur.
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
