import { Module } from '@nestjs/common';
import { AdminGuard, AuthGuard } from './auth.guards.js';

@Module({
  providers: [AuthGuard, AdminGuard],
  exports: [AuthGuard, AdminGuard],
})
export class AuthModule {}
