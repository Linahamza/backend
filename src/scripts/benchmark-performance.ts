//src\scripts\benchmark-performance.ts
import { Client as PGClient } from 'pg';
import Redis from 'ioredis';
import { Client as ESClient } from '@elastic/elasticsearch';
import * as dotenv from 'dotenv';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Config PostgreSQL
const pgClient = new PGClient({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Config Redis
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
});

// Config Elasticsearch
const elasticsearchClient = new ESClient({
  node: 'http://localhost:9200',
});

// 🔧 Paramètres
const TEST_SIZE = 100;
const SEARCH_KEYWORDS = ['chocolat', 'café', 'fromage', 'thé', 'huile'];
const ES_INDEX = 'vendure-variants';
const CHANNEL_ID = 1;
const LANG = 'fr';
const LOG_PATH = path.join(__dirname, 'benchmark_report.log');

function log(line: string) {
  fs.appendFileSync(LOG_PATH, line + '\n');
  console.log(line);
}

// === REDIS vs POSTGRESQL benchmark ===
async function benchmarkReadLatency() {
  log(`\n📦 [Benchmark Lecture Redis vs PostgreSQL]`);

  const variantRes = await pgClient.query(
    `SELECT id FROM product_variant ORDER BY "createdAt" DESC LIMIT $1`,
    [TEST_SIZE]
  );

  let totalRedis = 0;
  let totalPostgres = 0;

  for (const row of variantRes.rows) {
    const variantId = row.id;
    const redisKey = `vendure:variant:${variantId}`;

    const t1 = performance.now();
    await redisClient.get(redisKey);
    totalRedis += performance.now() - t1;

    const t2 = performance.now();
    await pgClient.query(`SELECT * FROM product_variant WHERE id = $1 LIMIT 1`, [variantId]);
    totalPostgres += performance.now() - t2;
  }

  log(`➡️ Moyenne Redis: ${(totalRedis / TEST_SIZE).toFixed(2)} ms`);
  log(`➡️ Moyenne PostgreSQL: ${(totalPostgres / TEST_SIZE).toFixed(2)} ms`);
}

// === ELASTICSEARCH recherche benchmark ===
async function benchmarkSearchLatency() {
  log(`\n🔍 [Benchmark Recherche Elasticsearch]`);
  const stats = [];

  for (const keyword of SEARCH_KEYWORDS) {
    const start = performance.now();
    const res = await elasticsearchClient.search({
      index: ES_INDEX,
      query: {
        match: {
          productName: keyword,
        },
      },
    });
    const duration = performance.now() - start;

    stats.push({
      keyword,
      time: duration.toFixed(2),
      hits: res.hits.hits.length,
    });

    log(`🔎 "${keyword}" → ${res.hits.hits.length} résultats en ${duration.toFixed(2)} ms`);
  }

  const totalTime = stats.reduce((sum, s) => sum + parseFloat(s.time), 0);
  log(`➡️ Moyenne globale ES: ${(totalTime / SEARCH_KEYWORDS.length).toFixed(2)} ms`);
}

async function runBenchmarks() {
  fs.writeFileSync(LOG_PATH, `📊 Rapport benchmark - ${new Date().toISOString()}\n\n`);
  await pgClient.connect();

  try {
    await benchmarkReadLatency();
    await benchmarkSearchLatency();
  } catch (e) {
    console.error('❌ Erreur de benchmark :', e);
  } finally {
    await pgClient.end();
    await redisClient.quit();
    log(`\n✅ Fin du benchmark. Résultats dans ${LOG_PATH}`);
  }
}

runBenchmarks();
