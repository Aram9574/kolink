-- Token Encryption Functions
-- Uses pgcrypto extension for symmetric encryption of OAuth tokens

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt text
CREATE OR REPLACE FUNCTION encrypt_token(token_text TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  IF token_text IS NULL OR token_text = '' THEN
    RETURN NULL;
  END IF;

  RETURN encode(
    pgp_sym_encrypt(token_text, encryption_key),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt text
CREATE OR REPLACE FUNCTION decrypt_token(encrypted_token TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  IF encrypted_token IS NULL OR encrypted_token = '' THEN
    RETURN NULL;
  END IF;

  RETURN pgp_sym_decrypt(
    decode(encrypted_token, 'base64'),
    encryption_key
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if decryption fails (e.g., wrong key)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION encrypt_token TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_token TO authenticated;
GRANT EXECUTE ON FUNCTION encrypt_token TO service_role;
GRANT EXECUTE ON FUNCTION decrypt_token TO service_role;

-- One-time migration: Encrypt existing tokens
-- WARNING: This will encrypt all existing plaintext tokens
-- Run this ONCE after deploying the encryption functions

-- Uncomment and run manually after verification:
/*
DO $$
DECLARE
  encryption_key TEXT := 'YOUR_32_CHARACTER_ENCRYPTION_KEY_HERE';
  row_count INT;
BEGIN
  -- Update linkedin_access_token
  UPDATE profiles
  SET linkedin_access_token = encrypt_token(linkedin_access_token, encryption_key)
  WHERE linkedin_access_token IS NOT NULL
    AND length(linkedin_access_token) < 500; -- Only encrypt if not already encrypted (plaintext is shorter)

  GET DIAGNOSTICS row_count = ROW_COUNT;
  RAISE NOTICE 'Encrypted % access tokens', row_count;

  -- Update linkedin_refresh_token
  UPDATE profiles
  SET linkedin_refresh_token = encrypt_token(linkedin_refresh_token, encryption_key)
  WHERE linkedin_refresh_token IS NOT NULL
    AND length(linkedin_refresh_token) < 500;

  GET DIAGNOSTICS row_count = ROW_COUNT;
  RAISE NOTICE 'Encrypted % refresh tokens', row_count;
END $$;
*/

COMMENT ON FUNCTION encrypt_token IS 'Encrypts OAuth tokens using pgcrypto symmetric encryption';
COMMENT ON FUNCTION decrypt_token IS 'Decrypts OAuth tokens using pgcrypto symmetric decryption';
