//product-variant.resolver.ts
import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { Ctx, RequestContext, ProductVariant } from '@vendure/core';
import { CachedProductVariantService } from './cached-product-variant.service';

@Resolver()
export class ProductVariantResolver {
  constructor(private cachedProductVariantService: CachedProductVariantService) {}

  @Query(() => ProductVariant)
  async cachedProductVariant(
    @Ctx() ctx: RequestContext,
    @Args('id', { type: () => ID }) id: number
  ): Promise<ProductVariant> {
    const productVariant = await this.cachedProductVariantService.getProductVariant(ctx, id);

    if (!productVariant) {
      throw new Error(`Product variant with ID ${id} not found`);
    }

    return productVariant;
  }
}
