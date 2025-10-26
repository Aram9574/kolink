// testRedis.mjs
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

// Cargar variables desde .env.local
dotenv.config({ path: ".env.local" });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const pong = await redis.ping();
console.log("✅ Conexión exitosa a Redis:", pong);

