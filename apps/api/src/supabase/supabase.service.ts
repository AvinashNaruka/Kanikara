import { Inject, Injectable } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE, SUPABASE_ADMIN } from './supabase.tokens.js';

@Injectable()
export class SupabaseService {
  constructor(
    @Inject(SUPABASE) readonly anon: SupabaseClient,
    @Inject(SUPABASE_ADMIN) readonly admin: SupabaseClient | null,
  ) {}

  asUser(accessToken: string): SupabaseClient {
    return createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_ANON_KEY ?? '',
      {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  }

  privileged(accessToken: string): SupabaseClient {
    return this.admin ?? this.asUser(accessToken);
  }
}
