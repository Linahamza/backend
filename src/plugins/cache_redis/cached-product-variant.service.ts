//src\plugins\cache_redis\cached-product-variant.service.ts
import { Injectable } from '@nestjs/common';
import { 
  ProductVariantService,
  RequestContext,
  TransactionalConnection,
  ConfigService,
  TaxCategoryService,
  FacetValueService,
  AssetService,
  TranslatableSaver,
  EventBus,
  ListQueryBuilder,
  GlobalSettingsService,
  StockMovementService,
  StockLevelService,
  ChannelService,
  RoleService,
  CustomFieldRelationService,
  RequestContextCacheService,
  ProductPriceApplicator,
  TranslatorService,
} from '@vendure/core';
import { RedisCacheService } from './cache_redis.service';

@Injectable()
export class CachedProductVariantService extends ProductVariantService {
  constructor(
    connection: TransactionalConnection,
    configService: ConfigService,
    taxCategoryService: TaxCategoryService,
    facetValueService: FacetValueService,
    assetService: AssetService,
    translatableSaver: TranslatableSaver,
    eventBus: EventBus,
    listQueryBuilder: ListQueryBuilder,
    globalSettingsService: GlobalSettingsService,
    stockMovementService: StockMovementService,
    stockLevelService: StockLevelService,
    channelService: ChannelService,
    roleService: RoleService,
    customFieldRelationService: CustomFieldRelationService,
    requestCache: RequestContextCacheService,
    productPriceApplicator: ProductPriceApplicator,
    translator: TranslatorService,
    private cacheService: RedisCacheService
  ) {
    super(
      connection,
      configService,
      taxCategoryService,
      facetValueService,
      assetService,
      translatableSaver,
      eventBus,
      listQueryBuilder,
      globalSettingsService,
      stockMovementService,
      stockLevelService,
      channelService,
      roleService,
      customFieldRelationService,
      requestCache,
      productPriceApplicator,
      translator
    );
  }

  // 🔁 Mise à jour du préfixe des clés pour correspondre à celles dans Redis
  private getCacheKey(variantId: number): string {
    return `vendure:variant:${variantId}`;
  }

  // ✅ Récupération avec cache
  async findOne(ctx: RequestContext, variantId: number) {
    console.log('🔄 Interception - Variante Produit - via Redis');
    const key = this.getCacheKey(variantId);

    try {
      // 1. Vérifie si c'est déjà dans le cache Redis
      const cached = await this.cacheService.get(key);
      if (cached) {
        console.log('✅ Product Variant from cache');
        return cached;
      }
    } catch (error) {
      // Si Redis est down ou il y a une erreur de communication avec Redis
      console.error('Erreur lors de la récupération de la variante de produit depuis Redis:', error);
    }

    //2. Si non, récupère depuis PostgreSQL
    const productVariant = await super.findOne(ctx, variantId);
    if (productVariant) {
      try {
        // 3. Met en cache
        console.log('Mise en cache de la variante de produit dans Redis', key);
        await this.cacheService.set(key, productVariant, 3600); // TTL = 1 heure
      } catch (error) {
        // Si une erreur survient lors de la mise en cache
        console.error('Erreur lors de la mise en cache de la variante de produit dans Redis:', error);
      }
    }

    return productVariant;   
  }

  // ✅ Invalidation du cache de la variante de produit
  async invalidateVariant(variantId: number) {
    try {
      await this.cacheService.delete(this.getCacheKey(variantId));
    } catch (error) {
      console.error("Erreur lors de l'invalidation du cache de la variante de produit:", error);
    }
  }
    //recacher les variantes qui ont été modifiés via cache-invalidation-listener.ts
  async setVariantInCache(ctx: RequestContext, variantId: number) {
    const key = this.getCacheKey(variantId);
    const variant = await super.findOne(ctx, variantId);
    if (variant) {
      try {
        await this.cacheService.set(key, variant, 3600);
      } catch (error) {
        console.error('Erreur lors de la mise en cache de la variante de produit:', error);
      }
    }
  }

        // ➕ À ajouter dans ta classe CachedProductVariantService

      async getProductVariant(ctx: RequestContext, id: number) {
        console.log('🧪 Appel de getProductVariant() depuis resolver');
        return this.findOne(ctx, id);
      }

  
}
