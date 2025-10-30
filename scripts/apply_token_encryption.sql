-- Sprint 3 Task 5: Token Encryption Migration
-- Copy this entire script and run in Supabase Dashboard SQL Editor

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encryption function
CREATE OR REPLACE FUNCTION encrypt_token(token TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  IF token IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN encode(pgp_sym_encrypt(token, encryption_key), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create decryption function
CREATE OR REPLACE FUNCTION decrypt_token(encrypted_token TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  IF encrypted_token IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(decode(encrypted_token, 'base64'), encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add encrypted columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_access_token_encrypted TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_refresh_token_encrypted TEXT;

-- Create index
CREATE INDEX IF NOT EXISTS idx_profiles_linkedin_encrypted
ON profiles(linkedin_access_token_encrypted)
WHERE linkedin_access_token_encrypted IS NOT NULL;

-- Add comments
COMMENT ON COLUMN profiles.linkedin_access_token_encrypted IS 'Encrypted LinkedIn OAuth access token';
COMMENT ON COLUMN profiles.linkedin_refresh_token_encrypted IS 'Encrypted LinkedIn OAuth refresh token';
COMMENT ON FUNCTION encrypt_token(TEXT, TEXT) IS 'Encrypts a token using AES-256';
COMMENT ON FUNCTION decrypt_token(TEXT, TEXT) IS 'Decrypts a token using AES-256';

SELECT 'Token encryption setup completed!' AS status;
