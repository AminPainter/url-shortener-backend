import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, type AuthenticatedUser } from './auth.service';
import { CredentialsDto } from './credentials.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() { email, password }: CredentialsDto) {
    const user = await this.authService.signup(email, password);
    return { id: user.id.toString(), email: user.email };
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
