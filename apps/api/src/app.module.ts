import { Module } from '@nestjs/common';
import { AccountModule } from './account/account.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { AppController } from './app.controller.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { CommerceModule } from './commerce/commerce.module.js';
import { ProgramsModule } from './programs/programs.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';

@Module({
  imports: [
    SupabaseModule,
    CatalogModule,
    SettingsModule,
    CommerceModule,
    AccountModule,
    ProgramsModule,
    AdminModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
