import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSearchPlugin,
    VendureConfig,
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import 'dotenv/config';
import path from 'path';
import { ExternalAssetStorageStrategy } from './plugins/external-asset-storage';


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
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
          secret: process.env.COOKIE_SECRET,
        },
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
        
      

    },
    
  
    assetOptions: {
        assetStorageStrategy: new ExternalAssetStorageStrategy(), // ✅ Placement correct ici
    },
    plugins: [
       
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
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
