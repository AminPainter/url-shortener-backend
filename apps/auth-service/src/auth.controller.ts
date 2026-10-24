import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, type AuthenticatedUser } from './auth.service';
import { CredentialsDto } from './credentials.dto';
import { EmailTakenError } from './email-taken.error';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() { email, password }: CredentialsDto) {
    try {
      const user = await this.authService.signup(email, password);
      return { id: user.id.toString(), email: user.email };
    } catch (error) {
      if (error instanceof EmailTakenError) throw new ConflictException();
      throw error;
    }
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(AuthGuard('local'))
  async login(@Req() request: { user: AuthenticatedUser }) {
    return {
      accessToken: await this.authService.issueAccessToken(request.user),
    };
  }
}
