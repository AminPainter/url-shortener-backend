import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UsersService } from '../services/users.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  get(@Req() request: { userId: bigint }) {
    return this.usersService.getProfile(request.userId);
  }

  @Patch()
  update(
    @Body() updateProfileDto: UpdateProfileDto,
    @Req() request: { userId: bigint },
  ) {
    return this.usersService.updateProfile(request.userId, updateProfileDto);
  }
}
