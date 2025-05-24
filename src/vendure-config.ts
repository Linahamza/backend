import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    //DefaultSearchPlugin,
    VendureConfig,
    NativeAuthenticationStrategy,
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import 'dotenv/config';
import path from 'path';
import { ExternalAssetStorageStrategy } from './plugins/external-asset-storage';
import { ElasticsearchPlugin } from '@vendure/elasticsearch-plugin';
import { BullMQJobQueuePlugin } from '@vendure/job-queue-plugin/package/bullmq';
import Redis from 'ioredis';
import { RedisCachePlugin } from './plugins/cache_redis/cache_redis.plugin'; //integration du plugin Redis
import { StockPromotionPlugin } from './plugins/cron-tasks/stock-promotion-plugin';
import { GoogleAuthStrategy } from './config/auth/google-auth.strategy';  //integration SSO admin
import { GoogleCustomerAuthStrategy } from './config/auth/google-customer-auth.strategy'; //integration sso customer

const IS_DEV = process.env.APP_ENV === 'dev';
const serverPort = +process.env.PORT || 3000;

export const config: VendureConfig = {
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        // The following options are useful in development mode,
        // but are best turned off for production for security
        // reasons.
        ...(IS_DEV ? {
            adminApiPlayground: {
                settings: { 'request.credentials': 'include' },
            },
            adminApiDebug: true,
            shopApiPlayground: {
                settings: { 'request.credentials': 'include' },
            },
            shopApiDebug: true,
        } : {}),
         
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        sessionDuration: '7d', // 👈 à ajouter si tu veux que la session dure 7 jours
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
          secret: process.env.COOKIE_SECRET!,
        },
        
          adminAuthenticationStrategy: [    //back-office
            new GoogleAuthStrategy(),  // Authentification pour l'admin (back-office)
            new NativeAuthenticationStrategy(), // Authentification par email/mot de passe
           ], 
           shopAuthenticationStrategy: [   // (shop-api)
            new GoogleCustomerAuthStrategy(),  // Authentification pour les clients (shop-api via Google)
            new NativeAuthenticationStrategy(), // Authentification par email/mot de passe
    
          ],
    },
    dbConnectionOptions: {
        type: 'postgres',
        // See the README.md "Migrations" section for an explanation of
        // the `synchronize` and `migrations` options.
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        synchronize: false,  // Active la création automatique des tables
        logging: false ,      // Affiche toutes les requêtes SQL dans la console
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler],
    },
    // When adding or altering custom field definitions, the database will
    // need to be updated. See the "Migrations" section in README.md.
    customFields: {
        Product: [
            { name: 'source_Id', type: 'int' },          // ID de produit source
            { name: 'measure_Unit_For_Packaging', type: 'string' },
            { name: 'measure_Unit_For_PricePerUnit', type: 'string' },
            { name: 'packaging', type: 'string' },
            { name: 'matter', type: 'string' },
            { name: 'parsing_Duration', type: 'int' },
            { name: 'brand_Id', type: 'int' },           // ID de la marque
            { name: 'brand_Name', type: 'string' },      // Nom de la marque
            { name: 'origin_Id', type: 'int' },          // ID de l'origine
            { name: 'origin_Country', type: 'string' },
            { name: 'market_Id', type: 'int' },          // ID du marché (nouveau champ)
            { name: 'market_Name', type: 'string' },     // Nom du marché (nouveau champ)
            { name: 'market_Address', type: 'string' },  // Adresse du marché (nouveau champ)
            { name: 'ean', type: 'string' },             // Code EAN
        ],
        
          ProductVariant: [
                // Champs de la table Evolutions
                { name: 'availability', type: 'boolean' },
                { name: 'evolution_parsing_date', type: 'string' }, // `text` -> `string` dans Vendure
                { name: 'certification', type: 'string' },
                { name: 'format', type: 'string' },
                { name: 'ingredients', type: 'text' }, // Texte long, préférable en `text`
                { name: 'ingredients_clean', type: 'text' },
                { name: 'on_discount', type: 'boolean' },
                { name: 'price_per_packaging', type: 'float' },
                { name: 'price_per_unit', type: 'float' },
                { name: 'weight_per_packaging', type: 'float' },

                    // champs du nutrition
                { name: 'carbohydrates', type: 'float' },
                { name: 'sugars', type: 'float' },
                { name: 'kcal', type: 'float' },
                { name: 'kj', type: 'float' },
                { name: 'fats', type: 'float' },
                { name: 'saturates', type: 'float' },
                { name: 'proteins', type: 'float' },
                { name: 'calcium', type: 'float' },
                { name: 'iodine', type: 'float' },
                { name: 'iron', type: 'float' },
                { name: 'salt', type: 'float' },
                { name: 'sodium', type: 'float' },
                { name: 'zinc', type: 'float' },
                { name: 'vitamin_a', type: 'float' },
                { name: 'vitamin_b1', type: 'float' },
                { name: 'vitamin_c', type: 'float' },
                { name: 'vitamin_d', type: 'float' },

          ],
          Collection: [
            { name: 'categorie_parent', type: 'string' },
          ],
          Customer: [
            { name: 'externalProvider', type: 'string', nullable: true },
            { name: 'externalId', type: 'string', nullable: true },
          ],      
          
    },
    
    
    assetOptions: {
        assetStorageStrategy: new ExternalAssetStorageStrategy(), 
    },
    plugins: [
        DefaultJobQueuePlugin.init({ 
          useDatabaseForBuffer: false  //au lieu de 'true' Désactive le polling SQL ✅ pour activer Redis via BullMQ
          
        }),
        BullMQJobQueuePlugin.init({
          connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: null, // Évite les erreurs de timeout
          },
        }),
        StockPromotionPlugin, //integration du plugin Cron
        
        RedisCachePlugin,

        //Initialisation de l'Elasticsearch Plugin
        ElasticsearchPlugin.init({
            host: 'http://localhost',
            port: 9200,
            indexPrefix: 'vendure-',
            bufferUpdates: false, //Les MAJ sont envoyées immédiatement au serveur ES sans être mises en tampon
          
            // ⚙️  Configuration des indices (Index Settings)
            indexSettings: {
              number_of_shards: 1, // L'index aura 1 shard. Un shard est une unité de stockage dans Elasticsearch.
              number_of_replicas: 0, //  pas de copies supplémentaires des données dans l'index. 
              refresh_interval: '30s', // L'intervalle de rafraîchissement est de 30 secondes, pour la MAJ de nvlle données
              
              //la configuration des analyzers et des filtres pour le traitement des textes.
              analysis: {
                analyzer: {   //vendure_french et vendure_english sont des analyzers personnalisés utilisent un tokenizer standard (qui découpe les textes en mots) et plusieurs filtres.
                  vendure_french: {
                    type: "custom",
                    tokenizer: "standard",
                    filter: ["lowercase", "french_stemmer", "asciifolding"]
                  }, //french_elision et english_possessive_stemmer : Ces filtres traitent les contractions ou les possessifs pour les langues respectives.
                  vendure_english: {
                    type: "custom",
                    tokenizer: "standard",
                    filter: ["lowercase", "english_stemmer", "asciifolding"]
                  } //lowercase : Convertit le texte en minuscules, asciifolding : Supprime les accents des caractères
                },
                filter: {
                  french_stemmer: {  //french_stemmer : Ce filtre spécifiquement pour le français applique une racine légère en français.
                    type: "stemmer",
                    language: "light_french"
                  },
                  "english_stemmer": {
                    "type": "stemmer",
                    "language": "english"  
                      }
                }
              }
            },
            // 🔍 Configuration de recherche
            searchConfig: {
              boostFields: { //définit des poids pour certains champs lors de la recherche
                productName: 4, // le plus influencer dans le calcul du score de pertinence de la recherche
                description: 2,
                sku: 1.5
              }
            }, 
          
            // 🏗️ Custom Mappings Produits
            customProductMappings: { // indique à Elasticsearch comment indexer les champs de produits.
              productName: {
                graphQlType: 'String!',  // ✅ Correspond à VARCHAR (name)
                valueFn: (product) => product.name,  //Les valeurs sont extraites via la fonction valueFn
            },
            slug: {
                graphQlType: 'String!',  // ✅ Correspond à VARCHAR (slug)
                valueFn: (product) => product.slug,
            },
            description: {
                graphQlType: 'String!',  // ✅ Correspond à TEXT (description)
                valueFn: (product) => product.description,
            },
  
             // Custom Fields - Version correcte
             packaging: {
              graphQlType: 'String',
              valueFn: (product) => product.customFields?.packaging || '',
            },
            matter: {
              graphQlType: 'String',
              valueFn: (product) => product.customFields?.matter || '',
            },
            measureUnitForPackaging: {
              graphQlType: 'String',
              valueFn: (product) => product.customFields?.measure_Unit_For_Packaging || '',
            },
            measureUnitForPricePerUnit: {
              graphQlType: 'String',
              valueFn: (product) => product.customFields?.measure_Unit_For_PricePerUnit || '',
            },
            parsingDuration: {
              graphQlType: 'Int',
              valueFn: (product) => product.customFields?.parsing_Duration || 0,
            },
            brandId: {
              graphQlType: 'Int',
              valueFn: (product) => product.customFields?.brand_Id || 0,
            },
            brandName: {
              graphQlType: 'String',
              valueFn: (product) => product.customFields?.brand_Name || '',
            },
            originId: {
              graphQlType: 'Int',
              valueFn: (product) => product.customFields?.origin_Id || 0,
            },
            originCountry: {
              graphQlType: 'String',
              valueFn: (product) => product.customFields?.origin_Country || '',
            },
            marketId: {
              graphQlType: 'Int',
              valueFn: (product) => product.customFields?.market_Id || 0,
            },
            marketName: {
              graphQlType: 'String',
              valueFn: (product) => product.customFields?.market_Name || '',
            },
            marketAddress: {
              graphQlType: 'String',
              valueFn: (product) => product.customFields?.market_Address || '',
            },
            ean: {
              graphQlType: 'String',
              valueFn: (product) => product.customFields?.ean || '',
            }
          
              },
            // 🏗️ Custom Mappings Variantes
              customProductVariantMappings: {
        
                sku: {
                  graphQlType: 'String!',
                  valueFn: (variant) => variant.sku,
                },
                price: {
                  graphQlType: 'Int!',
                  valueFn: (variant) => variant.price,
                },
                /*stockLevel: {
                  graphQlType: 'Int!',
                  valueFn: (variant) => variant.stockLevels[0]?.stockOnHand || 0, 
                }   */             
                  availability: {
                    graphQlType: 'Boolean',
                    valueFn: (variant) => variant.customFields?.availability ?? false,
                  },
                  evolutionParsingDate: {
                    graphQlType: 'String',
                    valueFn: (variant) => variant.customFields?.evolution_parsing_date || '',
                  },
                  certification: {
                    graphQlType: 'String',
                    valueFn: (variant) => variant.customFields?.certification || '',
                  },
                  format: {
                    graphQlType: 'String',
                    valueFn: (variant) => variant.customFields?.format || '',
                  },
                  ingredients: {
                    graphQlType: 'String',
                    valueFn: (variant) => variant.customFields?.ingredients || '',
                  },
                  ingredientsClean: {
                    graphQlType: 'String',
                    valueFn: (variant) => variant.customFields?.ingredients_clean || '',
                  },
                  onDiscount: {
                    graphQlType: 'Boolean',
                    valueFn: (variant) => variant.customFields?.on_discount ?? false,
                  },
                  pricePerPackaging: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.price_per_packaging ?? 0,
                  },
                  pricePerUnit: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.price_per_unit ?? 0,
                  },
                  weightPerPackaging: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.weight_per_packaging ?? 0,
                  },
                  carbohydrates: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.carbohydrates ?? 0,
                  },
                  sugars: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.sugars ?? 0,
                  },
                  kcal: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.kcal ?? 0,
                  },
                  kj: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.kj ?? 0,
                  },
                  fats: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.fats ?? 0,
                  },
                  saturates: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.saturates ?? 0,
                  },
                  proteins: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.proteins ?? 0,
                  },
                  calcium: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.calcium ?? 0,
                  },
                  iodine: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.iodine ?? 0,
                  },
                  iron: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.iron ?? 0,
                  },
                  salt: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.salt ?? 0,
                  },
                  sodium: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.sodium ?? 0,
                  },
                  zinc: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.zinc ?? 0,
                  },
                  vitaminA: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.vitamin_a ?? 0,
                  },
                  vitaminB1: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.vitamin_b1 ?? 0,
                  },
                  vitaminC: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.vitamin_c ?? 0,
                  },
                  vitaminD: {
                    graphQlType: 'Float',
                    valueFn: (variant) => variant.customFields?.vitamin_d ?? 0,
                  }


                }
            }),
      
       EmailPlugin.init({
            devMode: true,
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            globalTemplateVars: {
                // The following variables will change depending on your storefront implementation.
                // Here we are assuming a storefront running at http://localhost:8080.
                fromAddress: '"example" <noreply@example.com>',
                verifyEmailAddressUrl: 'http://localhost:8080/verify',
                passwordResetUrl: 'http://localhost:8080/password-reset',
                changeEmailAddressUrl: 'http://localhost:8080/verify-email-address-change'
            },
        }),
        AdminUiPlugin.init({
            route: 'admin',
            port: serverPort + 2,
            adminUiConfig: {
                apiPort: serverPort,
            },
        }),
    ],
};
