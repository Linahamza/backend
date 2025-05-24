//src\plugins\cache_redis\redis-cache-warmup.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  RequestContext,
  ProductService,
  ProductVariantService,
  ChannelService,
  EventBus,
  ProductEvent,
  ProductVariantEvent,
  TransactionalConnection,
} from '@vendure/core';
import { RedisCacheService } from './cache_redis.service';

@Injectable()
export class RedisCacheWarmupService implements OnModuleInit {
  constructor(
    private readonly productVariantService: ProductVariantService,
    private readonly productService: ProductService,
    private readonly redisCacheService: RedisCacheService,
    private readonly channelService: ChannelService,
    private readonly eventBus: EventBus,
    private readonly connection: TransactionalConnection,
  ) {}

  async onModuleInit() {
    // Warmup initial
    this.warmupRedisCache().catch((err) =>
      console.error('❌ Erreur lors du warmup Redis initial :', err),
    );
  
    // Cron job toutes les 60 minutes
    setInterval(() => {
      this.warmupRedisCache().catch((err) =>
        console.error('❌ Erreur lors du warmup Redis :', err),
      );
    }, 60 * 60 * 1000);
  
    // Listener d'invalidation + recache
    this.eventBus.ofType(ProductEvent).subscribe(async (event) => {
      const products = Array.isArray(event.entity) ? event.entity : [event.entity];
      for (const product of products) {
        console.log(`📦 EventBus: ProductEvent (${event.type}) pour id: ${product.id}`);
        await this.handleProductOrVariantChange(event.ctx, 'product', product.id, event.type);
      }
    });
    
    this.eventBus.ofType(ProductVariantEvent).subscribe(async (event) => {
      const variants = Array.isArray(event.entity) ? event.entity : [event.entity];
      for (const variant of variants) {
        console.log(`🎯 EventBus: ProductVariantEvent (${event.type}) pour id: ${variant.id}`);
        await this.handleProductOrVariantChange(event.ctx, 'variant', variant.id, event.type);
      }
    });
  }
  
  private async handleProductOrVariantChange(
    ctx: RequestContext,
    type: 'product' | 'variant',
    id: string | number,
    eventType: 'created' | 'updated' | 'deleted',
  ) {
    const key = `vendure:${type}:${id}`;
    
    // Toujours invalider
    await this.redisCacheService.delete(key);
    console.log(`🗑️ Cache invalidé pour ${key}`);
  
    if (eventType === 'deleted') {
      // Pas de recache pour les suppressions
      return;
    }
  
    // Re-cache uniquement pour creation/modification
    const channel = await this.channelService.getDefaultChannel();
    const refreshedCtx = new RequestContext({
      apiType: 'admin',
      channel,
      isAuthorized: true,
      authorizedAsOwnerOnly: false,
    });
  
    try {
      if (type === 'product') {
        const product = await this.productService.findOne(refreshedCtx, id);
        if (product) {
          await this.redisCacheService.set(key, product, 60 * 60);
          console.log(`♻️ Cache mis à jour pour ${key}`);
        }
      } else if (type === 'variant') {
        const variant = await this.productVariantService.findOne(refreshedCtx, id);
        if (variant) {
          await this.redisCacheService.set(key, variant, 60 * 60);
          console.log(`♻️ Cache mis à jour pour ${key}`);
        }
      }
    } catch (error) {
      console.error(`❌ Erreur lors du recache de ${key}`, error);
    }
  }
  
  private async warmupRedisCache() {
    console.log('\n🚀 Démarrage du warmup Redis cache des produits & variantes...');
  
    const channel = await this.channelService.getDefaultChannel();
    const take = 1000;
  
    // Préchargement des produits
    let skip = 0;
    let hasMoreProducts = true;
    while (hasMoreProducts) {
      const ctx = new RequestContext({
        apiType: 'admin',
        channel,
        isAuthorized: true,
        authorizedAsOwnerOnly: false,
      });
  
      const products = await this.productService.findAll(ctx, { take, skip });
      if (products.items.length === 0) {
        hasMoreProducts = false;
      } else {
        for (const product of products.items) {
          const key = `product:${product.id}`;
          await this.redisCacheService.set(key, product, 60 * 60); // TTL: 1h
        }
        skip += take;
      }
    }
    console.log(`✅ Produits en cache`);
  
    // Préchargement des variantes
    skip = 0;
    let hasMoreVariants = true;
    while (hasMoreVariants) {
      const ctx = new RequestContext({
        apiType: 'admin',
        channel,
        isAuthorized: true,
        authorizedAsOwnerOnly: false,
      });
  
      const variants = await this.productVariantService.findAll(ctx, { take, skip });
      if (variants.items.length === 0) {
        hasMoreVariants = false;
      } else {
        for (const variant of variants.items) {
          const key = `variant:${variant.id}`;
          await this.redisCacheService.set(key, variant, 60 * 60); // TTL: 1h
        }
        skip += take;
      }
    }
    console.log(`✅ Variantes en cache`);
  
    console.log('🎉 Warmup Redis terminé avec succès.');
  }
}
