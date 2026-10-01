import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AccessToken } from '../auth/auth.decorators.js';
import { AdminGuard } from '../auth/auth.guards.js';
import { AdminService } from './admin.service.js';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats(@AccessToken() token: string) {
    return this.admin.stats(token);
  }

  @Get('products')
  products(@AccessToken() token: string) {
    return this.admin.products(token);
  }

  @Post('products')
  saveProduct(@AccessToken() token: string, @Body() body: Record<string, unknown>) {
    return this.admin.save(token, 'products', body);
  }

  @Delete('products/:id')
  deleteProduct(@AccessToken() token: string, @Param('id') id: string) {
    return this.admin.remove(token, 'products', id);
  }

  @Get('categories')
  categories(@AccessToken() token: string) {
    return this.admin.list(token, 'categories', 'sort_order');
  }

  @Post('categories')
  saveCategory(@AccessToken() token: string, @Body() body: Record<string, unknown>) {
    return this.admin.save(token, 'categories', body);
  }

  @Delete('categories/:id')
  deleteCategory(@AccessToken() token: string, @Param('id') id: string) {
    return this.admin.remove(token, 'categories', id);
  }

  @Get('banners')
  banners(@AccessToken() token: string) {
    return this.admin.list(token, 'banners', 'sort_order');
  }

  @Post('banners')
  saveBanner(@AccessToken() token: string, @Body() body: Record<string, unknown>) {
    return this.admin.save(token, 'banners', body);
  }

  @Delete('banners/:id')
  deleteBanner(@AccessToken() token: string, @Param('id') id: string) {
    return this.admin.remove(token, 'banners', id);
  }

  @Get('materials')
  materials(@AccessToken() token: string) {
    return this.admin.list(token, 'materials', 'name');
  }

  @Post('materials')
  saveMaterial(@AccessToken() token: string, @Body() body: { name: string }) {
    return this.admin.save(token, 'materials', { name: body.name.trim() });
  }

  @Delete('materials/:id')
  deleteMaterial(@AccessToken() token: string, @Param('id') id: string) {
    return this.admin.remove(token, 'materials', id);
  }

  @Get('orders')
  orders(@AccessToken() token: string) {
    return this.admin.orders(token);
  }

  @Patch('orders/:id')
  updateOrder(@AccessToken() token: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.admin.updateOrder(token, id, body);
  }

  @Get('coupons')
  coupons(@AccessToken() token: string) {
    return this.admin.list(token, 'coupons');
  }

  @Post('coupons')
  saveCoupon(@AccessToken() token: string, @Body() body: Record<string, unknown>) {
    return this.admin.save(token, 'coupons', body);
  }

  @Get('custom-orders')
  customOrders(@AccessToken() token: string) {
    return this.admin.list(token, 'custom_order_requests');
  }

  @Patch('custom-orders/:id')
  updateCustom(@AccessToken() token: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.admin.save(token, 'custom_order_requests', { ...body, id, updated_at: new Date().toISOString() });
  }

  @Get('reviews')
  reviews(@AccessToken() token: string) {
    return this.admin.reviews(token);
  }

  @Patch('reviews/:id')
  moderate(@AccessToken() token: string, @Param('id') id: string, @Body() body: { approve: boolean }) {
    return this.admin.moderateReview(token, id, Boolean(body.approve));
  }

  @Get('customers')
  customers(@AccessToken() token: string) {
    return this.admin.customers(token);
  }

  @Post('customers/action')
  customerAction(@AccessToken() token: string, @Body() body: Record<string, unknown>) {
    return this.admin.customerAction(token, body);
  }

  @Get('gift-cards')
  giftCards(@AccessToken() token: string) {
    return this.admin.giftCards(token);
  }

  @Post('gift-cards')
  saveGiftCard(@AccessToken() token: string, @Body() body: Record<string, unknown>) {
    return this.admin.save(token, 'gift_cards', body);
  }

  @Get('corporate')
  corporate(@AccessToken() token: string) {
    return this.admin.list(token, 'corporate_enquiries');
  }

  @Patch('corporate/:id')
  updateCorporate(@AccessToken() token: string, @Param('id') id: string, @Body() body: { status: string }) {
    return this.admin.save(token, 'corporate_enquiries', { id, status: body.status });
  }

  @Get('savings/plans')
  plans(@AccessToken() token: string) {
    return this.admin.list(token, 'savings_plans', 'monthly_amount');
  }

  @Post('savings/plans')
  savePlan(@AccessToken() token: string, @Body() body: Record<string, unknown>) {
    return this.admin.save(token, 'savings_plans', body);
  }

  @Get('savings/subscriptions')
  subscriptions(@AccessToken() token: string) {
    return this.admin.subscriptions(token);
  }

  @Post('savings/assign')
  assignPlan(@AccessToken() token: string, @Body() body: { userId: string; planId: string }) {
    return this.admin.assignPlan(token, body.userId, body.planId);
  }

  @Get('stores')
  stores(@AccessToken() token: string) {
    return this.admin.list(token, 'store_locations', 'sort_order');
  }

  @Post('stores')
  saveStore(@AccessToken() token: string, @Body() body: Record<string, unknown>) {
    return this.admin.save(token, 'store_locations', body);
  }

  @Delete('stores/:id')
  deleteStore(@AccessToken() token: string, @Param('id') id: string) {
    return this.admin.remove(token, 'store_locations', id);
  }

  @Get('press')
  press(@AccessToken() token: string) {
    return this.admin.list(token, 'press_mentions', 'sort_order');
  }

  @Post('press')
  savePress(@AccessToken() token: string, @Body() body: Record<string, unknown>) {
    return this.admin.save(token, 'press_mentions', body);
  }

  @Delete('press/:id')
  deletePress(@AccessToken() token: string, @Param('id') id: string) {
    return this.admin.remove(token, 'press_mentions', id);
  }

  @Get('settings')
  settings(@AccessToken() token: string) {
    return this.admin.settings(token);
  }

  @Patch('settings/:key')
  updateSetting(@AccessToken() token: string, @Param('key') key: string, @Body() body: { value: string }) {
    return this.admin.updateSetting(token, key, body.value);
  }

  @Post('uploads/sign')
  signUpload(@Body() body: { filename: string }) {
    return this.admin.signUpload(body.filename);
  }
}
