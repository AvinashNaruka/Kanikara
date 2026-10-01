import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

export interface AuthenticatedRequest {
  user: { id: string; email?: string };
  accessToken: string;
  role?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & { headers: { authorization?: string } }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Sign in required');

    const { data, error } = await this.supabase.anon.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException('Invalid session');
    request.user = { id: data.user.id, email: data.user.email };
    request.accessToken = token;
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly authGuard: AuthGuard,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.authGuard.canActivate(context);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { data, error } = await this.supabase
      .asUser(request.accessToken)
      .from('profiles')
      .select('role')
      .eq('id', request.user.id)
      .maybeSingle();
    if (error) throw new ForbiddenException(error.message);
    if (!data || !['admin', 'superadmin'].includes(data.role)) {
      throw new ForbiddenException('Admin access only');
    }
    request.role = data.role;
    return true;
  }
}
