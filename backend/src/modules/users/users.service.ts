import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async createDefaultRoles() {
    const roles = [
      { name: 'ADMIN', description: 'Administrateur du système' },
      { name: 'DECIDEUR', description: 'Décideur' },
      { name: 'ANALYSTE', description: 'Analyste' },
      { name: 'AGENT_TERRAIN', description: 'Agent de terrain' },
    ];

    for (const role of roles) {
      const exists = await this.rolesRepository.findOne({
        where: { name: role.name },
      });

      if (!exists) {
        await this.rolesRepository.save(this.rolesRepository.create(role));
      }
    }
  }

  async createRole(dto: CreateRoleDto) {
    const exists = await this.rolesRepository.findOne({
      where: { name: dto.name },
    });

    if (exists) {
      throw new ConflictException('Ce rôle existe déjà');
    }

    return this.rolesRepository.save(this.rolesRepository.create(dto));
  }

  findAllRoles() {
    return this.rolesRepository.find({
      order: { name: 'ASC' },
    });
  }

  async create(dto: CreateUserDto) {
    const exists = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (exists) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    let role: Role | null = null;

    if (dto.roleId) {
      role = await this.rolesRepository.findOne({
        where: { id: dto.roleId },
      });

      if (!role) {
        throw new NotFoundException('Rôle introuvable');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      isActive: dto.isActive ?? true,
      passwordHash,
      role: role ?? undefined,
    });

    return this.usersRepository.save(user);
  }

  findAll() {
    return this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return user;
  }

  async findByEmail(email: string, withPassword = false) {
    if (withPassword) {
      return this.usersRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .addSelect('user.passwordHash')
        .addSelect('user.refreshTokenHash')
        .where('user.email = :email', { email })
        .getOne();
    }

    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.roleId) {
      const role = await this.rolesRepository.findOne({
        where: { id: dto.roleId },
      });

      if (!role) {
        throw new NotFoundException('Rôle introuvable');
      }

      user.role = role;
    }

    Object.assign(user, {
      firstName: dto.firstName ?? user.firstName,
      lastName: dto.lastName ?? user.lastName,
      email: dto.email ?? user.email,
      phone: dto.phone ?? user.phone,
      isActive: dto.isActive ?? user.isActive,
    });

    return this.usersRepository.save(user);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);

    return { deleted: true };
  }

  async updateRefreshToken(userId: string, refreshToken?: string) {
    const user = await this.findOne(userId);

    user.refreshTokenHash = refreshToken
      ? await bcrypt.hash(refreshToken, 10)
      : undefined;

    return this.usersRepository.save(user);
  }
}
