import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { addressSchema, cartItemSchema, checkoutSchema } from '@kanikara/contracts';
import { AccessToken, CurrentUser } from '../auth/auth.decorators.js';
import { AuthGuard } from '../auth/auth.guards.js';
import { CommerceService } from './commerce.service.js';

@Controller('commerce')
@UseGuards(AuthGuard)
export class CommerceController {
  constructor(private readonly commerce: CommerceService) {}

  @Get('cart')
  cart(@AccessToken() token: string, @CurrentUser() user: { id: string }) {
    return this.commerce.cart(token, user.id);
  }

  @Post('cart')
  add(@AccessToken() token: string, @CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.commerce.addToCart(token, user.id, cartItemSchema.parse(body));
  }

  @Patch('cart/:id')
  update(@AccessToken() token: string, @Param('id') id: string, @Body() body: { quantity: number }) {
    return this.commerce.updateQuantity(token, id, Number(body.quantity));
  }

  @Delete('cart/:id')
  remove(@AccessToken() token: string, @Param('id') id: string) {
    return this.commerce.removeItem(token, id);
  }

  @Get('wishlist')
  wishlist(@AccessToken() token: string, @CurrentUser() user: { id: string }) {
    return this.commerce.wishlist(token, user.id);
  }

  @Post('wishlist/:productId')
  toggle(@AccessToken() token: string, @CurrentUser() user: { id: string }, @Param('productId') productId: string) {
    return this.commerce.toggleWishlist(token, user.id, productId);
  }

  @Get('addresses')
  addresses(@AccessToken() token: string, @CurrentUser() user: { id: string }) {
    return this.commerce.addresses(token, user.id);
  }

  @Post('addresses')
  saveAddress(@AccessToken() token: string, @CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.commerce.saveAddress(token, user.id, addressSchema.parse(body));
  }

  @Delete('addresses/:id')
  deleteAddress(@AccessToken() token: string, @Param('id') id: string) {
    return this.commerce.deleteAddress(token, id);
  }

  @Post('coupons/validate')
  coupon(@AccessToken() token: string, @CurrentUser() user: { id: string }, @Body() body: { code: string; subtotal: number }) {
    return this.commerce.validateCoupon(token, user.id, body.code, Number(body.subtotal));
  }

  @Post('gift-cards/check')
  giftCard(@AccessToken() token: string, @Body() body: { code: string }) {
    return this.commerce.checkGiftCard(token, body.code);
  }

  @Post('checkout')
  checkout(@AccessToken() token: string, @CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.commerce.checkout(token, user.id, checkoutSchema.parse(body));
  }

  @Post('payments/payu')
  payu(@AccessToken() token: string, @Body() body: Record<string, unknown>) {
    return this.commerce.payu(token, body);
  }

  @Get('orders')
  orders(@AccessToken() token: string, @CurrentUser() user: { id: string }) {
    return this.commerce.orders(token, user.id);
  }

  @Get('orders/number/:orderNumber')
  order(@AccessToken() token: string, @Param('orderNumber') orderNumber: string) {
    return this.commerce.orderByNumber(token, orderNumber);
  }

  @Post('orders/:id/cancel')
  cancel(@AccessToken() token: string, @Param('id') id: string) {
    return this.commerce.cancelOrder(token, id);
  }
}
