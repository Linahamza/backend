//src\plugins\cache_redis\cached-product.service.ts
import { Injectable } from '@nestjs/common';
import { ProductService,
  RequestContext,
  TransactionalConnection,
  ChannelService,
  AssetService,
  ProductVariantService,
  FacetValueService,
  ListQueryBuilder,
  TranslatableSaver,
  EventBus,

  CustomFieldRelationService,
  TranslatorService,
  ProductOptionGroupService,
 } 
from '@vendure/core';
import { RedisCacheService } from './cache_redis.service';
import { SlugValidator } from '@vendure/core/dist/service/helpers/slug-validator/slug-validator';


@Injectable()
export class CachedProductService extends ProductService {
  constructor(
    connection: TransactionalConnection,
    channelService: ChannelService,
    assetService: AssetService,
    productVariantService: ProductVariantService,
    facetValueService: FacetValueService,
    listQueryBuilder: ListQueryBuilder,
    translatableSaver: TranslatableSaver,
    eventBus: EventBus,
    customFieldRelationService: CustomFieldRelationService,
    translator: TranslatorService,
    productOptionGroupService: ProductOptionGroupService,
    private cacheService: RedisCacheService,
  ) {
    const slugValidator = new SlugValidator(connection); // ✅ OK
  
    super(
      connection,
      channelService,
      assetService,
      productVariantService,
      facetValueService,
      listQueryBuilder,
      translatableSaver,
      eventBus,
      slugValidator, // ✅ utilisé ici
      customFieldRelationService,
      translator,
      productOptionGroupService
    );
  }

  // 🔁 Mise à jour du préfixe des clés pour correspondre à celles dans Redis
  private getCacheKey(productId: number): string {
    return `vendure:product:${productId}`;
  }

  // ✅ Récupération avec cache
  async findOne(ctx: RequestContext, productId: number) {
    console.log('🔄 Interception - Produit - via Redis');

    const key = this.getCacheKey(productId);

    try {
      // 1. Vérifie si c'est déjà dans le cache Redis
      const cached = await this.cacheService.get(key);
      if (cached) {
        console.log('✅ Product from cache');
        return cached;
      }
    } catch (error) {
      // Si Redis est down ou il y a une erreur de communication avec Redis
      console.error('Erreur lors de la récupération du produit depuis Redis:', error);
    }

    //2. Si non, récupère depuis PostgreSQL
    const product = await super.findOne(ctx, productId);
    if (product) {
      try {
        // 3. Met en cache
        console.log('Mise en cache du produit dans Redis', key);
        await this.cacheService.set(key, product, 3600); // TTL = 1 heure
      } catch (error) {
        // Si une erreur survient lors de la mise en cache
        console.error('Erreur lors de la mise en cache du produit dans Redis:', error);
      }
    }

    return product; 
  }

  // ✅ Invalidation du cache produit
  async invalidateProduct(productId: number) {
    try {
      await this.cacheService.delete(this.getCacheKey(productId));
    } catch (error) {
      console.error('Erreur lors de l\'invalidations du cache produit:', error);
    }
  }
  //recacher les produits qui ont été modifiés via cache-invalidation-listener.ts
  async setProductInCache(ctx: RequestContext, productId: number) {
    const key = this.getCacheKey(productId);
    const product = await super.findOne(ctx, productId);
    if (product) {
      await this.cacheService.set(key, product, 3600);
    }
  }

  // ➕ À ajouter dans ta classe CachedProductService

async getProduct(ctx: RequestContext, id: number) {
  console.log('🧪 Appel de getProduct() depuis resolver');
  return this.findOne(ctx, id);
}

  
}
