import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import { ProvisionUserDto } from './dto/provision-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-student')
  registerStudent(
    @Body() dto: RegisterStudentDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.registerStudent(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto): Promise<{ accessToken: string }> {
    return this.authService.login(dto);
  }

  @Post('admin/provision')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  provisionUser(
    @Body() dto: ProvisionUserDto,
  ): Promise<{ id: string; schoolId: string }> {
    return this.authService.provisionUser(dto);
  }
}
