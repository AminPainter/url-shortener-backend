import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UsersService } from '../services/users.service';

@Controller('me')
@UseGuards(AuthGuard('jwt'))
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  get(@Req() request: { user: { userId: bigint } }) {
    return this.usersService.getProfile(request.user.userId);
  }

  @Patch()
  update(
    @Body() updateProfileDto: UpdateProfileDto,
    @Req() request: { user: { userId: bigint } },
  ) {
    return this.usersService.updateProfile(
      request.user.userId,
      updateProfileDto,
    );
  }
}
