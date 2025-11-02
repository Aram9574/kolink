/**
 * KOLINK PERSONALIZATION - OPENAI EMBEDDINGS UTILITIES
 *
 * Funciones para generar embeddings vectoriales usando la API de OpenAI.
 * Usa el modelo text-embedding-3-small (1536 dimensiones) - límite de HNSW es 2000.
 */

import OpenAI from 'openai';
import type { EmbeddingConfig } from '@/types/personalization';

// Inicializar cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Genera un embedding vectorial para un texto usando OpenAI
 *
 * @param text - Texto para generar embedding
 * @param config - Configuración del modelo (opcional)
 * @returns Vector de embeddings (1536 dimensiones por defecto)
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig = {
    model: 'text-embedding-3-small',
    dimensions: 1536,
  }
): Promise<number[]> {
  try {
    // Validar que el texto no esté vacío
    if (!text || text.trim().length === 0) {
      throw new Error('El texto no puede estar vacío');
    }

    // Limitar el texto a un máximo de tokens razonable
    // text-embedding-3-large soporta hasta 8192 tokens
    const maxChars = 30000; // Aproximadamente 8000 tokens
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;

    // Generar embedding
    const response = await openai.embeddings.create({
      model: config.model,
      input: truncatedText,
      dimensions: config.dimensions,
    });

    // Extraer el vector de embeddings
    const embedding = response.data[0].embedding;

    // Validar dimensiones
    if (embedding.length !== config.dimensions) {
      throw new Error(
        `Dimensiones inesperadas: esperadas ${config.dimensions}, recibidas ${embedding.length}`
      );
    }

    return embedding;
  } catch (error) {
    console.error('Error al generar embedding:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Error en OpenAI Embeddings: ${errorMessage}`);
  }
}

/**
 * Genera embeddings para múltiples textos en batch
 * Usa esta función para optimizar el rendimiento cuando necesitas
 * generar embeddings para muchos textos a la vez.
 *
 * @param texts - Array de textos
 * @param config - Configuración del modelo
 * @returns Array de vectores de embeddings
 */
export async function generateBatchEmbeddings(
  texts: string[],
  config: EmbeddingConfig = {
    model: 'text-embedding-3-small',
    dimensions: 1536,
  }
): Promise<number[][]> {
  try {
    // Validar que haya textos
    if (!texts || texts.length === 0) {
      throw new Error('El array de textos no puede estar vacío');
    }

    // Filtrar textos vacíos
    const validTexts = texts.filter((t) => t && t.trim().length > 0);

    if (validTexts.length === 0) {
      throw new Error('No hay textos válidos para procesar');
    }

    // Truncar textos si es necesario
    const maxChars = 30000;
    const truncatedTexts = validTexts.map((text) =>
      text.length > maxChars ? text.substring(0, maxChars) : text
    );

    // OpenAI permite hasta 2048 inputs en un solo request
    // Para seguridad, limitamos a 100 por batch
    const batchSize = 100;
    const allEmbeddings: number[][] = [];

    // Procesar en lotes
    for (let i = 0; i < truncatedTexts.length; i += batchSize) {
      const batch = truncatedTexts.slice(i, i + batchSize);

      const response = await openai.embeddings.create({
        model: config.model,
        input: batch,
        dimensions: config.dimensions,
      });

      // Extraer embeddings en orden
      const batchEmbeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);

      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  } catch (error) {
    console.error('Error al generar embeddings en batch:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Error en OpenAI Batch Embeddings: ${errorMessage}`);
  }
}

/**
 * Calcula la similitud coseno entre dos vectores de embeddings
 * Rango de resultados: 0 (no similar) a 1 (idéntico)
 *
 * @param embedding1 - Primer vector
 * @param embedding2 - Segundo vector
 * @returns Similitud coseno (0-1)
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Los embeddings deben tener la misma dimensión');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);

  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Normaliza un vector de embeddings
 * Útil para operaciones que requieren vectores unitarios
 *
 * @param embedding - Vector a normalizar
 * @returns Vector normalizado
 */
export function normalizeEmbedding(embedding: number[]): number[] {
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));

  if (magnitude === 0) {
    return embedding;
  }

  return embedding.map((val) => val / magnitude);
}

/**
 * Valida que un embedding tenga el formato correcto
 *
 * @param embedding - Vector a validar
 * @param expectedDimensions - Dimensiones esperadas
 * @returns true si es válido
 */
export function validateEmbedding(embedding: unknown, expectedDimensions: number = 1536): boolean {
  if (!Array.isArray(embedding)) {
    return false;
  }

  if (embedding.length !== expectedDimensions) {
    return false;
  }

  // Verificar que todos los valores sean números finitos
  return embedding.every((val) => typeof val === 'number' && Number.isFinite(val));
}

/**
 * Calcula la distancia euclidiana entre dos embeddings
 * Útil para algunas operaciones de clustering
 *
 * @param embedding1 - Primer vector
 * @param embedding2 - Segundo vector
 * @returns Distancia euclidiana
 */
export function euclideanDistance(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Los embeddings deben tener la misma dimensión');
  }

  let sum = 0;
  for (let i = 0; i < embedding1.length; i++) {
    const diff = embedding1[i] - embedding2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}
