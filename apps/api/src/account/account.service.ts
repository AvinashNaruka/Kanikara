import { Injectable } from '@nestjs/common';
import type { Profile } from '@kanikara/contracts';
import { assertNoError } from '../common/supabase.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@Injectable()
export class AccountService {
  constructor(private readonly supabase: SupabaseService) {}

  async me(token: string, userId: string): Promise<Profile> {
    const { data, error } = await this.supabase
      .asUser(token)
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    assertNoError(error);
    return {
      id: userId,
      fullName: data?.full_name ?? null,
      phone: data?.phone ?? null,
      role: data?.role ?? 'customer',
      loyaltyPoints: Number(data?.loyalty_points ?? 0),
      referralCode: data?.referral_code ?? null,
    };
  }

  async updateProfile(token: string, userId: string, input: { fullName: string; phone: string }) {
    const { error } = await this.supabase.asUser(token).from('profiles').update({
      full_name: input.fullName,
      phone: input.phone,
    }).eq('id', userId);
    assertNoError(error);
    return this.me(token, userId);
  }

  async referrals(token: string, userId: string) {
    const client = this.supabase.asUser(token);
    const [{ data: profile, error: profileError }, { data: rows, error }] = await Promise.all([
      client.from('profiles').select('referral_code').eq('id', userId).maybeSingle(),
      client.from('referrals').select('*').eq('referrer_id', userId).order('created_at', { ascending: false }),
    ]);
    assertNoError(profileError);
    assertNoError(error);
    return {
      code: profile?.referral_code ?? null,
      referrals: rows ?? [],
    };
  }

  async recordReferral(token: string, userId: string, email: string | undefined, code: string) {
    const { data, error } = await this.supabase.asUser(token).rpc('record_referral_signup', {
      p_referrer_code: code,
      p_referred_id: userId,
      p_referred_email: email ?? null,
    });
    assertNoError(error);
    return data;
  }
}
