import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { reviewSchema } from '@kanikara/contracts';
import { AccessToken, CurrentUser } from '../auth/auth.decorators.js';
import { AuthGuard } from '../auth/auth.guards.js';
import { CatalogQueryDto } from './catalog-query.dto.js';
import { CatalogService } from './catalog.service.js';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  categories() {
    return this.catalog.categories();
  }

  @Get('banners')
  banners() {
    return this.catalog.banners();
  }

  @Get('tags')
  tags() {
    return this.catalog.tagGroups();
  }

  @Get('reviews')
  reviews() {
    return this.catalog.latestReviews();
  }

  @Get('products')
  products(@Query() query: CatalogQueryDto) {
    return this.catalog.products(query);
  }

  @Get('products/:slug')
  product(@Param('slug') slug: string) {
    return this.catalog.product(slug);
  }

  @Post('products/:id/reviews')
  @UseGuards(AuthGuard)
  review(
    @Param('id') productId: string,
    @CurrentUser() user: { id: string },
    @AccessToken() token: string,
    @Body() body: unknown,
  ) {
    return this.catalog.submitReview(token, user.id, productId, reviewSchema.parse(body));
  }
}
