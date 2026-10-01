import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { corporateEnquirySchema, customOrderSchema, newsletterSchema } from '@kanikara/contracts';
import { AccessToken, CurrentUser } from '../auth/auth.decorators.js';
import { AuthGuard } from '../auth/auth.guards.js';
import { ProgramsService } from './programs.service.js';

@Controller('programs')
export class ProgramsController {
  constructor(private readonly programs: ProgramsService) {}

  @Get('custom-orders')
  @UseGuards(AuthGuard)
  customOrders(@AccessToken() token: string, @CurrentUser() user: { id: string }) {
    return this.programs.customOrders(token, user.id);
  }

  @Post('custom-orders')
  @UseGuards(AuthGuard)
  createCustom(
    @AccessToken() token: string,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    return this.programs.createCustomOrder(token, user.id, customOrderSchema.parse(body));
  }

  @Get('gift-cards')
  @UseGuards(AuthGuard)
  giftCards(@AccessToken() token: string, @CurrentUser() user: { id: string }) {
    return this.programs.giftCards(token, user.id);
  }

  @Get('savings/plans')
  plans() {
    return this.programs.savingsPlans();
  }

  @Get('savings/subscriptions')
  @UseGuards(AuthGuard)
  subscriptions(@AccessToken() token: string, @CurrentUser() user: { id: string }) {
    return this.programs.subscriptions(token, user.id);
  }

  @Post('savings/subscriptions')
  @UseGuards(AuthGuard)
  subscribe(
    @AccessToken() token: string,
    @CurrentUser() user: { id: string },
    @Body() body: { planId: string },
  ) {
    return this.programs.subscribe(token, user.id, body.planId);
  }

  @Post('savings/subscriptions/:id/cancel')
  @UseGuards(AuthGuard)
  cancel(@AccessToken() token: string, @Param('id') id: string) {
    return this.programs.cancelSubscription(token, id);
  }

  @Post('savings/subscriptions/:id/payments')
  @UseGuards(AuthGuard)
  pay(
    @AccessToken() token: string,
    @Param('id') id: string,
    @Body() body: { amount: number; paymentId: string },
  ) {
    return this.programs.recordSavingsPayment(token, id, Number(body.amount), body.paymentId);
  }

  @Post('corporate')
  corporate(@Body() body: unknown) {
    return this.programs.corporate(corporateEnquirySchema.parse(body));
  }

  @Post('newsletter')
  newsletter(@Body() body: unknown) {
    return this.programs.newsletter(newsletterSchema.parse(body));
  }

  @Get('stores')
  stores() {
    return this.programs.stores();
  }

  @Get('press')
  press() {
    return this.programs.press();
  }
}
