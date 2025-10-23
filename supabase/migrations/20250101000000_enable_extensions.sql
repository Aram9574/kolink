-- ============================================================================
-- MIGRACIÓN 1: HABILITAR EXTENSIONES NECESARIAS
-- ============================================================================
-- Fecha: 2025-01-01
-- Descripción: Habilita las extensiones de PostgreSQL necesarias para Kolink
-- ============================================================================

-- Extensión para generar UUIDs aleatorios y funciones de encriptación
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Extensión para UUID v4 (alternativa)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extensión para embeddings de IA (búsqueda semántica)
-- NOTA: Esta extensión podría no estar disponible en el plan gratuito de Supabase
-- Si da error, comenta esta línea y la funcionalidad de búsqueda semántica no estará disponible
CREATE EXTENSION IF NOT EXISTS "vector";

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Extensiones habilitadas correctamente';
END $$;
