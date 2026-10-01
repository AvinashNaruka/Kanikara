import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { analyticsEventSchema, visitorIdentitySchema } from '@kanikara/contracts';
import type { FastifyRequest } from 'fastify';
import { AccessToken } from '../auth/auth.decorators.js';
import { AdminGuard } from '../auth/auth.guards.js';
import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('events')
  record(@Body() body: unknown, @Headers('authorization') authorization?: string) {
    return this.analytics.record(analyticsEventSchema.parse(body), authorization);
  }

  @Get('geo')
  geo(@Req() request: FastifyRequest) {
    return this.analytics.geo(request.headers, request.ip);
  }

  @Post('identify')
  identify(@Body() body: unknown, @Headers('authorization') authorization?: string) {
    return this.analytics.identify(visitorIdentitySchema.parse(body), authorization);
  }

  @Get('summary')
  @UseGuards(AdminGuard)
  summary(@AccessToken() token: string) {
    return this.analytics.summary(token);
  }

  @Get('dashboard')
  @UseGuards(AdminGuard)
  dashboard(@AccessToken() token: string) {
    return this.analytics.dashboard(token);
  }

  @Get('export')
  @UseGuards(AdminGuard)
  async export(@AccessToken() token: string) {
    return { csv: await this.analytics.csv(token) };
  }
}
