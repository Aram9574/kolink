/**
 * KOLINK PERSONALIZATION SYSTEM - TYPESCRIPT TYPES
 *
 * Definiciones de tipos para el sistema de personalización basado en RAG.
 * Estos tipos corresponden directamente al schema de Supabase.
 */

// =====================================================
// DATABASE TYPES
// =====================================================

/**
 * Post histórico del usuario importado de LinkedIn
 */
export interface UserPost {
  id: string;
  user_id: string;
  content: string;
  linkedin_post_id?: string;
  published_at?: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  engagement_rate?: number;
  detected_topics?: string[];
  detected_intent?: string;
  word_count?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Embedding vectorial de un post de usuario
 */
export interface UserPostEmbedding {
  id: string;
  post_id: string;
  user_id: string;
  embedding: number[]; // Vector de 3072 dimensiones
  model_version: string;
  created_at: string;
}

/**
 * Post viral del corpus de inspiración
 */
export interface ViralPost {
  id: string;
  content: string;
  author_industry?: string;
  author_follower_range?: string;
  likes: number;
  comments: number;
  shares: number;
  views?: number;
  engagement_rate: number;
  topics: string[];
  intent: string;
  post_format?: string;
  has_hook: boolean;
  has_cta: boolean;
  uses_emojis: boolean;
  uses_hashtags: boolean;
  word_count?: number;
  published_at?: string;
  source_url?: string;
  curated_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Embedding de un post viral
 */
export interface ViralEmbedding {
  id: string;
  viral_post_id: string;
  embedding: number[];
  model_version: string;
  created_at: string;
}

/**
 * Generación de contenido con variantes A/B
 */
export interface Generation {
  id: string;
  user_id: string;
  topic: string;
  intent: string;
  additional_context?: string;
  variant_a: string;
  variant_b: string;
  model_used: string;
  temperature: number;
  user_examples_used?: string[];
  viral_examples_used?: string[];
  variant_selected?: 'A' | 'B';
  was_published: boolean;
  published_at?: string;
  created_at: string;
}

/**
 * Métricas de engagement de un post publicado
 */
export interface PostMetrics {
  id: string;
  generation_id: string;
  user_id: string;
  linkedin_post_id?: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  engagement_rate?: number;
  metrics_snapshots: MetricSnapshot[];
  sentiment_score?: number;
  top_keywords?: string[];
  first_tracked_at: string;
  last_updated_at: string;
}

/**
 * Snapshot de métricas en un momento específico
 */
export interface MetricSnapshot {
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  engagement_rate: number;
}

/**
 * Caché de resultados RAG
 */
export interface RagCache {
  id: string;
  user_id: string;
  query_hash: string;
  query_embedding: number[];
  top_user_posts: string[];
  top_viral_posts: string[];
  hit_count: number;
  expires_at: string;
  created_at: string;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

/**
 * Request para ingestar posts del usuario
 */
export interface IngestUserPostsRequest {
  posts: {
    content: string;
    linkedin_post_id?: string;
    published_at?: string;
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  }[];
}

/**
 * Response de ingesta de posts de usuario
 */
export interface IngestUserPostsResponse {
  success: boolean;
  posts_created: number;
  embeddings_created: number;
  errors?: string[];
  post_ids: string[];
}

/**
 * Request para ingestar posts virales
 */
export interface IngestViralPostsRequest {
  posts: {
    content: string;
    author_industry?: string;
    author_follower_range?: string;
    likes: number;
    comments: number;
    shares: number;
    views?: number;
    topics: string[];
    intent: string;
    post_format?: string;
    has_hook?: boolean;
    has_cta?: boolean;
    uses_emojis?: boolean;
    uses_hashtags?: boolean;
    published_at?: string;
    source_url?: string;
  }[];
}

/**
 * Response de ingesta de posts virales
 */
export interface IngestViralPostsResponse {
  success: boolean;
  posts_created: number;
  embeddings_created: number;
  errors?: string[];
  post_ids: string[];
}

/**
 * Request para recuperar ejemplos similares (RAG)
 */
export interface RagRetrieveRequest {
  topic: string;
  intent?: string;
  top_k_user?: number; // Número de posts de usuario a recuperar (default: 3)
  top_k_viral?: number; // Número de posts virales a recuperar (default: 5)
  use_cache?: boolean; // Usar caché si está disponible (default: true)
}

/**
 * Post similar recuperado por RAG
 */
export interface SimilarPost {
  id: string;
  content: string;
  similarity: number; // Similitud coseno (0-1)
  engagement_rate?: number;
  type: 'user' | 'viral';
}

/**
 * Response de recuperación RAG
 */
export interface RagRetrieveResponse {
  success: boolean;
  user_posts: SimilarPost[];
  viral_posts: SimilarPost[];
  cache_hit: boolean;
  query_hash?: string;
}

/**
 * Request para generar contenido
 */
export interface GenerateContentRequest {
  userId: string;
  topic: string;
  intent: string;
  additional_context?: string;
  temperature?: number; // 0-1, default: 0.7
  top_k_user?: number;
  top_k_viral?: number;
}

/**
 * Response de generación de contenido
 */
export interface GenerateContentResponse {
  success: boolean;
  generation_id: string;
  variantA: string;
  variantB: string;
  user_examples_used: string[];
  viral_examples_used: string[];
  created_at: string;
}

/**
 * Request para actualizar métricas de un post publicado
 */
export interface UpdatePostMetricsRequest {
  generation_id: string;
  linkedin_post_id: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  sentiment_score?: number;
  top_keywords?: string[];
}

/**
 * Response de actualización de métricas
 */
export interface UpdatePostMetricsResponse {
  success: boolean;
  metrics_id: string;
  engagement_rate: number;
  snapshot_created: boolean;
}

// =====================================================
// OPENAI TYPES
// =====================================================

/**
 * Configuración para generación de embeddings
 */
export interface EmbeddingConfig {
  model: 'text-embedding-3-large' | 'text-embedding-3-small';
  dimensions?: number; // Para text-embedding-3-small: 1536 (límite HNSW: 2000)
}

/**
 * Respuesta de OpenAI para embeddings
 */
export interface EmbeddingResponse {
  object: string;
  data: {
    object: string;
    embedding: number[];
    index: number;
  }[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Configuración para generación de texto
 */
export interface GenerationConfig {
  model: 'gpt-4o' | 'gpt-4o-mini';
  temperature: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

/**
 * Mensaje para chat completion
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Tipos de intents válidos para contenido
 */
export type ContentIntent =
  | 'educativo'
  | 'inspiracional'
  | 'personal'
  | 'storytelling'
  | 'promocional'
  | 'thought-leadership';

/**
 * Tipos de formato de post
 */
export type PostFormat =
  | 'short' // < 300 caracteres
  | 'medium' // 300-1000 caracteres
  | 'long' // > 1000 caracteres
  | 'carousel'
  | 'poll';

/**
 * Rangos de seguidores para posts virales
 */
export type FollowerRange =
  | '0-1k'
  | '1k-10k'
  | '10k-50k'
  | '50k-100k'
  | '100k-500k'
  | '500k+';

/**
 * Industrias para clasificación de posts
 */
export type Industry =
  | 'tech'
  | 'marketing'
  | 'leadership'
  | 'finance'
  | 'healthcare'
  | 'education'
  | 'design'
  | 'sales'
  | 'hr'
  | 'entrepreneurship';

/**
 * Errores personalizados del sistema
 */
export class PersonalizationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'PersonalizationError';
  }
}

// =====================================================
// VALIDATION HELPERS
// =====================================================

/**
 * Valida que un intent sea válido
 */
export function isValidIntent(intent: string): intent is ContentIntent {
  const validIntents: ContentIntent[] = [
    'educativo',
    'inspiracional',
    'personal',
    'storytelling',
    'promocional',
    'thought-leadership',
  ];
  return validIntents.includes(intent as ContentIntent);
}

/**
 * Valida que un formato de post sea válido
 */
export function isValidPostFormat(format: string): format is PostFormat {
  const validFormats: PostFormat[] = ['short', 'medium', 'long', 'carousel', 'poll'];
  return validFormats.includes(format as PostFormat);
}

/**
 * Valida un embedding vector
 */
export function isValidEmbedding(embedding: number[], expectedDimensions: number = 1536): boolean {
  return Array.isArray(embedding) && embedding.length === expectedDimensions;
}
