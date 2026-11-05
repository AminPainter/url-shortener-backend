import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, UserId } from '@app/jwt-auth';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UsersService } from '../services/users.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  get(@UserId() userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch()
  update(@Body() updateProfileDto: UpdateProfileDto, @UserId() userId: string) {
    return this.usersService.updateProfile(userId, updateProfileDto);
  }
}
