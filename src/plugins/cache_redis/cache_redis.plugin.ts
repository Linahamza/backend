// cache_redis.plugin.ts
//Intègre Redis dans Vendure en tant que plugin en utilisant le service déjà définit
import { PluginCommonModule, VendurePlugin,ProductService,ProductVariantService  } from '@vendure/core';
import { Module } from '@nestjs/common';
import { RedisCacheWarmupService } from './redis-cache-warmup.service';
import { RedisCacheService } from './cache_redis.service';
import { CachedProductService } from './cached-product.service';
import { ProductResolver } from './product.resolver';
import { CachedProductVariantService } from './cached-product-variant.service';
import { ProductVariantResolver } from './product-variant.resolver'; 
//import { CacheInvalidationListener } from './cache-invalidation-listener';


import gql from 'graphql-tag'; 

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        RedisCacheService,
        RedisCacheWarmupService, // ⬅️ ICI Déclaration du service de préchargement des produits/variants 
        CachedProductService, // Déclaration du service pour les produits
        ProductResolver,      // Déclaration du resolver pour les produits
        ProductVariantResolver , // Déclaration du resolver pour les variantes
        CachedProductVariantService,// Déclaration du service pour les variantes
        //CacheInvalidationListener,

        {
            provide: ProductService,
            useClass: CachedProductService,
        },
        {
            provide: ProductVariantService,
            useClass: CachedProductVariantService,
        },
    ],
    exports: [RedisCacheService, CachedProductService, CachedProductVariantService ],
    adminApiExtensions: {
        resolvers: [ProductResolver],
        schema: gql`
            extend type Query {
                cachedProduct(id: ID!): Product!
                cachedProductVariant(id: ID!): ProductVariant! 

            }
        `
    },
    compatibility: '^3.2.2',
})
export class RedisCachePlugin {}
