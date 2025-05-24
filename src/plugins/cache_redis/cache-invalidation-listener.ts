/* src/plugins/cache_redis/cache-invalidation-listener.ts
Dès qu’un produit ou une variante est créé(e) ou modifié(e) → invalidate + set
Dès qu’un produit ou une variante est supprimé(e) → invalidate seulement
Ça fonctionne automatiquement grâce à EventBus de Vendure*/

import { Injectable } from '@nestjs/common';
import {
  EventBus,
  ProductEvent,
  ProductVariantEvent,
  RequestContext,
} from '@vendure/core';
import { CachedProductService } from './cached-product.service';
import { CachedProductVariantService } from './cached-product-variant.service';

@Injectable()
export class CacheInvalidationListener {
  constructor(
    private eventBus: EventBus,
    private cachedProductService: CachedProductService,
    private cachedProductVariantService: CachedProductVariantService
  ) {
    // 🔄 Écoute les événements liés aux Variantes de Produits
    this.eventBus.ofType(ProductVariantEvent).subscribe(async (event) => {
      const ctx = event.ctx as RequestContext;
      const variants = Array.isArray(event.entity) ? event.entity : [event.entity];

      for (const variant of variants) {
        const variantId = +variant.id;

        console.log(`📬 Event capté pour la variante de produit : ${variantId}, type d'événement: ${event.type}`);
        
        // 🗑️ Supprime toujours l'ancien cache
        console.log(`🗑️ Invalidation du cache pour la variante de produit ${variantId}`);
        await this.cachedProductVariantService.invalidateVariant(variantId);

        if (['created', 'updated'].includes(event.type)) {
          // 🔄 Recrée le cache si création ou MAJ
          console.log(`🔄 Mise à jour du cache pour la variante de produit ${variantId}`);
          await this.cachedProductVariantService.setVariantInCache(ctx, variantId);
        } else if (event.type === 'deleted') {
          // 🗑️ Juste l'invalidation du cache si supprimé
          console.log(`🗑️ Cache supprimé pour la variante de produit ${variantId}`);
        }
      }
    });

    // 🔄 Écoute les événements liés aux Produits
    this.eventBus.ofType(ProductEvent).subscribe(async (event) => {
      const ctx = event.ctx as RequestContext;
      const products = Array.isArray(event.entity) ? event.entity : [event.entity];

      for (const product of products) {
        const productId = +product.id;

        console.log(`📬 Event capté pour le produit : ${productId}, type d'événement: ${event.type}`);

        // 🗑️ Supprime toujours l'ancien cache
        console.log(`🗑️ Invalidation du cache pour le produit ${productId}`);
        await this.cachedProductService.invalidateProduct(productId);

        if (['created', 'updated'].includes(event.type)) {
          // 🔄 Recrée le cache si création ou MAJ
          console.log(`🔄 Mise à jour du cache pour le produit ${productId}`);
          await this.cachedProductService.setProductInCache(ctx, productId);
        } else if (event.type === 'deleted') {
          // 🗑️ Juste l'invalidation du cache si supprimé
          console.log(`🗑️ Cache supprimé pour le produit ${productId}`);
        }
      }
    });
  }
}
