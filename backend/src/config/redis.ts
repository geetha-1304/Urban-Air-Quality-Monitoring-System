import { createClient } from 'redis';

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: { reconnectStrategy: (retries) => Math.min(retries * 250, 3000) },
});

let warned = false;
redisClient.on('error', () => {
  if (!warned) {
    console.warn('Redis is unavailable; API responses will bypass the cache until it reconnects.');
    warned = true;
  }
});
redisClient.on('ready', () => {
  warned = false;
  console.log('Connected to Redis response cache');
});

export const connectRedis = () => {
  if (!redisClient.isOpen) void redisClient.connect().catch(() => undefined);
};

const revisionKey = 'airwatch:cache:revision';
const cachePrefix = 'airwatch:api';

export const invalidateAirQualityCache = async () => {
  if (!redisClient.isReady) return;
  try {
    await redisClient.incr(revisionKey);
  } catch {
    // A cache failure must not fail a successful database write.
  }
};

export const cacheResponse = (ttlSeconds: number) => (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
  if (req.method !== 'GET' || !redisClient.isReady) {
    res.setHeader('X-Cache', 'BYPASS');
    next();
    return;
  }

  void (async () => {
    try {
      const revision = await redisClient.get(revisionKey) ?? '0';
      const key = `${cachePrefix}:${revision}:${req.originalUrl}`;
      const cached = await redisClient.get(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.status(200).type('application/json').send(cached);
        return;
      }

      const sendJson = res.json.bind(res);
      res.json = ((body: unknown) => {
        if (res.statusCode < 400 && redisClient.isReady) {
          void redisClient.set(key, JSON.stringify(body), { EX: ttlSeconds }).catch(() => undefined);
        }
        res.setHeader('X-Cache', 'MISS');
        return sendJson(body as never);
      }) as typeof res.json;
      next();
    } catch {
      res.setHeader('X-Cache', 'BYPASS');
      next();
    }
  })();
};
