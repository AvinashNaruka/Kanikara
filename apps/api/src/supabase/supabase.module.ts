import { Global, Module } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service.js';
import { SUPABASE, SUPABASE_ADMIN } from './supabase.tokens.js';

export { SUPABASE, SUPABASE_ADMIN };

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
};

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE,
      useFactory: () =>
        createClient(
          requiredEnvironment('SUPABASE_URL'),
          requiredEnvironment('SUPABASE_ANON_KEY'),
          clientOptions,
        ),
    },
    {
      provide: SUPABASE_ADMIN,
      useFactory: () => {
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!key) return null;
        return createClient(
          requiredEnvironment('SUPABASE_URL'),
          key,
          clientOptions,
        );
      },
    },
    SupabaseService,
  ],
  exports: [SUPABASE, SUPABASE_ADMIN, SupabaseService],
})
export class SupabaseModule {}
