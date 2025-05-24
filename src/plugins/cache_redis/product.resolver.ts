/* product.resolver.ts
Gère la résolution des requêtes GraphQL pour récupérer 
les produits en cache ou depuis la base de données.
ici avec cachedProduct() */

import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { Ctx, RequestContext, Product } from '@vendure/core';
import { CachedProductService } from './cached-product.service';

@Resolver()
export class ProductResolver {
  constructor(private cachedProductService: CachedProductService) {}

  @Query(() => Product)
  async cachedProduct(
    @Ctx() ctx: RequestContext,
    @Args('id', { type: () => ID }) id: number
  ): Promise<Product> {
    const product = await this.cachedProductService.getProduct(ctx, id);

    if (!product) {
      throw new Error(`Product with ID ${id} not found`);
    }

    return product;
  }
}
