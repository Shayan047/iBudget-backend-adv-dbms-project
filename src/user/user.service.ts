import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register';
import { LoginDto } from './dto/login';
import { ChangePasswordDto } from './dto/change.password';

@Injectable()
export class UserService {
  private readonly saltRounds = 10;

  constructor(private prismaService: PrismaService) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);

    return this.prismaService.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
      },
      select: { id: true, email: true, name: true },
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Current password does not match');
    }

    const newHashedPassword = await bcrypt.hash(dto.newPassword, this.saltRounds);

    return this.prismaService.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
      select: { id: true, email: true },
    });
  }
}