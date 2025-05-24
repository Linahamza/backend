import { Client } from 'pg'; 
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// PostgreSQL client setup
const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const DEFAULT_LANGUAGE = 'fr'; // Langue par défaut pour les traductions

const OFFER_PATTERNS = [
  {
    regex: /^(\d+) acheté = (\d+)% de remise$/i,
    handler: (match: RegExpMatchArray, productVariantId: number) => ({
      conditions: [
        { code: "contains_products", args: [{ name: "minimum", value: match[1] }, { name: "productVariantIds", value: `[${productVariantId}]` }] }
      ],
      actions: [
        { code: "products_percentage_discount", args: [{ name: "discount", value: match[2] }, { name: "productVariantIds", value: `[${productVariantId}]` }] }
      ]
    }),
  },
  {
    regex: /^le 2ème à -(\d+)%$/i,
    handler: (match: RegExpMatchArray, productVariantId: number) => ({
      conditions: [
        { code: "contains_products", args: [{ name: "minimum", value: "2" }, { name: "productVariantIds", value: `[${productVariantId}]` }] }
      ],
      actions: [
        { code: "order_percentage_discount", args: [{ name: "discount", value: match[1] }] }
      ]
    }),
  },
  {
    regex: /^prenez en (\d+) = payez en (\d+)$/i,
    handler: (match: RegExpMatchArray, productVariantId: number) => {
      const discount = (1 - parseInt(match[2]) / parseInt(match[1])) * 100;
      return {
        conditions: [
          { code: "contains_products", args: [{ name: "minimum", value: match[1] }, { name: "productVariantIds", value: `[${productVariantId}]` }] }
        ],
        actions: [
          { code: "order_percentage_discount", args: [{ name: "discount", value: discount.toFixed(2) }] }
        ]
      };
    },
  },
  {
    regex: /^(\d+) achetés = ([\d,.]+)€$/i,
    handler: (match: RegExpMatchArray, productVariantId: number) => ({
      conditions: [
        { code: "contains_products", args: [{ name: "minimum", value: match[1] }, { name: "productVariantIds", value: `[${productVariantId}]` }] }
      ],
      actions: [
        { code: "fixed_price_per_unit", args: [{ name: "price", value: match[2] }, { name: "productVariantIds", value: `[${productVariantId}]` }] }
      ]
    }),
  }
];

async function migrateOffersToPromotions() {
  try {
    await client.connect();
    const offers = await client.query('SELECT id, evolution_id, description_fr FROM offers');
    
    for (const offer of offers.rows) {
      const { id, evolution_id, description_fr } = offer;
      
      // Récupérer le productVariantId + customFieldsEvolution_parsing_date
      const productRes = await client.query(
        `SELECT id, "customFieldsEvolution_parsing_date" 
         FROM product_variant 
         WHERE "productId" = (SELECT product_id FROM evolutions WHERE id = $1)`,
        [evolution_id]
      );
      
      if (productRes.rowCount === 0) {
        console.warn(`⚠️ Aucun productVariant trouvé pour l'offre ID ${id}`);
        continue;
      }
      
      const { id: productVariantId, customFieldsEvolution_parsing_date } = productRes.rows[0];

      // Vérifier et appliquer un pattern de promotion
      for (const pattern of OFFER_PATTERNS) {
        const match = description_fr.match(pattern.regex);
        if (match) {
          const promotionData = pattern.handler(match, productVariantId);

          let startsAt: Date | null = null;
          let endsAt: Date | null = null;

          if (customFieldsEvolution_parsing_date) {
            const parsingDate = new Date(customFieldsEvolution_parsing_date);
            if (!isNaN(parsingDate.getTime())) {
              startsAt = new Date(parsingDate);
              startsAt.setDate(startsAt.getDate() + 3);
              
              endsAt = new Date(startsAt);
              endsAt.setDate(endsAt.getDate() + 7);
            } else {
              console.warn(`⚠️ Date invalide pour productVariantId ${productVariantId}, pas de dates insérées.`);
            }
          }

          // Insérer dans la table promotion et récupérer l'ID
          const promoRes = await client.query(
            `INSERT INTO promotion ("createdAt", "updatedAt", "enabled", "conditions", "actions", "priorityScore", "startsAt", "endsAt") 
             VALUES (NOW(), NOW(), true, $1, $2, $3, $4, $5) RETURNING id`,
             [
               JSON.stringify(promotionData.conditions),
               JSON.stringify(promotionData.actions),
               0,
               startsAt ? startsAt.toISOString() : null,
               endsAt ? endsAt.toISOString() : null
             ]
          );
          
          const promotionId = promoRes.rows[0].id;
          console.log(`✅ Promotion ajoutée : ${description_fr} (ID: ${promotionId})`);

          // Insérer dans la table promotion_translation
          await client.query(
            `INSERT INTO promotion_translation ("createdAt", "updatedAt", "languageCode", "name", "description", "baseId") 
             VALUES (NOW(), NOW(), $1, $2, $3, $4)`,
            [DEFAULT_LANGUAGE, `Promo ${description_fr}`, description_fr, promotionId]
          );

          // Insérer dans promotion_channels_channel
          await client.query(
            `INSERT INTO promotion_channels_channel ("promotionId", "channelId") VALUES ($1, 1)`,
            [promotionId]
          );

          console.log(`📌 Traduction et canal ajoutés pour Promotion ID ${promotionId}`);
          break; // Stopper après avoir trouvé un match
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Erreur lors de la migration des offres :", error);
  } finally {
    await client.end();
  }
}

migrateOffersToPromotions();
