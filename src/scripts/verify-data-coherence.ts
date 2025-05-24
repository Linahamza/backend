//src\scripts\verify-data-coherence.ts
import { Client as PGClient } from 'pg';
import Redis from 'ioredis';
import { Client as ESClient } from '@elastic/elasticsearch';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pgClient = new PGClient({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
});

const elasticsearchClient = new ESClient({
  node: 'http://localhost:9200',
});

const BULK_SIZE = 1000; // 🔁 Change here to adjust bulk size
const LOG_PATH = path.join(__dirname, 'coherence_check.log');
const DEFAULT_ES_INDEX = 'vendure-variants';

function logToFile(line: string) {
  fs.appendFileSync(LOG_PATH, line + '\n');
  console.log(line);
}

function formatStatus(ok: boolean, label: string, emoji = { ok: '✅', warn: '⚠️', error: '❌' }): string {
  return ok ? `${emoji.ok} ${label}` : `${emoji.error} ${label}`;
}

async function getActualIndexName(): Promise<string> {
  const indices = await elasticsearchClient.cat.indices({ format: 'json' }) as any[];
  const match = indices.find((idx) => idx.index.startsWith('vendure-variants'));
  return match ? match.index : DEFAULT_ES_INDEX;
}

const stats = {
  total: 0,
  pgFound: 0,
  redisFound: 0,
  esFound: 0,
  pgMissing: 0,
  redisMissing: 0,
  esMissing: 0,
};

async function verifyProductVariantCoherence(variantId: string) {
  stats.total++;

  const pgVariantRes = await pgClient.query(
    `
    SELECT pv.id, pv.sku, pt.name, pt.slug
    FROM product_variant pv
    JOIN product p ON pv."productId" = p.id
    LEFT JOIN product_translation pt ON pt."baseId" = p.id AND pt."languageCode" = 'fr'
    WHERE pv.id = $1
    LIMIT 1;
    `,
    [variantId]
  );

  const postgresExists = (pgVariantRes.rowCount ?? 0) > 0;
  postgresExists ? stats.pgFound++ : stats.pgMissing++;

  const pgRow = postgresExists ? pgVariantRes.rows[0] : null;

  const redisKey = `vendure:variant:${variantId}`;
  const redisValue = await redisClient.get(redisKey);
  const redisExists = !!redisValue;
  redisExists ? stats.redisFound++ : stats.redisMissing++;

  const channelId = 1;
  const languageCode = 'fr';
  const esId = `${channelId}_${variantId}_${languageCode}`;
  let elasticsearchExists = false;

  try {
    const actualIndex = await getActualIndexName();
    const esResult = await elasticsearchClient.get({ index: actualIndex, id: esId }, { ignore: [404] });
    elasticsearchExists = esResult.found === true;
  } catch (err) {
    elasticsearchExists = false;
  }
  elasticsearchExists ? stats.esFound++ : stats.esMissing++;

  const status = [
    formatStatus(postgresExists, 'PostgreSQL'),
    formatStatus(redisExists, 'Redis'),
    formatStatus(elasticsearchExists, 'Elasticsearch'),
  ].join(' | ');

  const info = postgresExists
    ? `🔎 SKU: ${pgRow.sku} | Slug: ${pgRow.slug} | Name: ${pgRow.name}`
    : `❌ Variant ${variantId} NOT FOUND in PostgreSQL`;

  logToFile(`[${variantId}] ${status} → ${info}`);
}

async function runCoherenceCheck(limit: number) {
  fs.writeFileSync(
    LOG_PATH,
    `🗂️ Rapport de cohérence - ${new Date().toISOString()}\n\n`
  );
  await pgClient.connect();

  try {
    const res = await pgClient.query(
      `SELECT id FROM product_variant ORDER BY "createdAt" DESC LIMIT $1`,
      [limit]
    );

    for (const row of res.rows) {
      await verifyProductVariantCoherence(row.id);
    }

    // Résumé à la fin
    logToFile(`\n📊 Résumé du batch de ${stats.total} variantes :`);
    logToFile(`   ✅ PostgreSQL trouvés : ${stats.pgFound}`);
    logToFile(`   ✅ Redis trouvés :      ${stats.redisFound}`);
    logToFile(`   ✅ Elasticsearch trouvés : ${stats.esFound}`);
    logToFile(`   ❌ PostgreSQL manquants : ${stats.pgMissing}`);
    logToFile(`   ❌ Redis manquants :      ${stats.redisMissing}`);
    logToFile(`   ❌ Elasticsearch manquants : ${stats.esMissing}`);
  } catch (error) {
    console.error('❌ Erreur de vérification :', error);
  } finally {
    await pgClient.end();
    await redisClient.quit();
    logToFile(`\n✅ Fin du rapport. Résultats enregistrés dans ${LOG_PATH}`);
  }
}

runCoherenceCheck(BULK_SIZE);
