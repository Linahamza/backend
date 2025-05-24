//cache_redis.service.ts
// 🔌 Connexion à Redis + Méthodes principales :set, get,delete et la Gestion propre de la déconnexion 🔌
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnApplicationShutdown {
    private readonly redis: Redis;

    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD,
            keyPrefix: 'vendure:',
            enableAutoPipelining: true,
            maxRetriesPerRequest: 1
        });
    }

    async set(key: string, value: any, ttl?: number) {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttl || 300);
    }

    async get<T = any>(key: string): Promise<T | undefined> {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : undefined;
    }

    async delete(key: string) {
        await this.redis.del(key);
    }

    async clearByPattern(pattern: string) {
        const keys = await this.redis.keys(pattern);
        if (keys.length) await this.redis.del(...keys);
    } 

    onApplicationShutdown() {
        this.redis.disconnect();
    }
}