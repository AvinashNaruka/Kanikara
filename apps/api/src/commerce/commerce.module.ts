import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { CommerceController } from './commerce.controller.js';
import { CommerceService } from './commerce.service.js';

@Module({
  imports: [SettingsModule, AuthModule],
  controllers: [CommerceController],
  providers: [CommerceService],
})
export class CommerceModule {}
