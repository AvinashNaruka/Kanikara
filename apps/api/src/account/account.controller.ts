import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { profileSchema } from '@kanikara/contracts';
import { AccessToken, CurrentUser } from '../auth/auth.decorators.js';
import { AuthGuard } from '../auth/auth.guards.js';
import { AccountService } from './account.service.js';

@Controller('account')
@UseGuards(AuthGuard)
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get('me')
  me(@AccessToken() token: string, @CurrentUser() user: { id: string }) {
    return this.account.me(token, user.id);
  }

  @Patch('me')
  update(
    @AccessToken() token: string,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    return this.account.updateProfile(token, user.id, profileSchema.parse(body));
  }

  @Get('referrals')
  referrals(@AccessToken() token: string, @CurrentUser() user: { id: string }) {
    return this.account.referrals(token, user.id);
  }

  @Post('referrals')
  record(
    @AccessToken() token: string,
    @CurrentUser() user: { id: string; email?: string },
    @Body() body: { code: string },
  ) {
    return this.account.recordReferral(token, user.id, user.email, body.code);
  }
}
