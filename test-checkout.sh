#!/bin/bash

echo "🧪 TEST DE CHECKOUT - KOLINK"
echo "=============================="
echo ""

# Solicitar credenciales
read -p "Ingresa tu email de Kolink: " USER_EMAIL
echo ""
read -sp "Ingresa tu contraseña: " USER_PASSWORD
echo ""
echo ""

echo "1️⃣ Autenticando usuario..."

# Autenticar y obtener token
AUTH_RESPONSE=$(curl -s -X POST "https://crdtxyfvbosjiddirtzc.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZHR4eWZ2Ym9zamlkZGlydHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTM2NzEsImV4cCI6MjA3NzgxMzY3MX0.MDyXRhimjW0zN3Doz_8_ZIFqAXNkSeME9EhlU9LB5F0" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}")

# Extraer user ID y access token
USER_ID=$(echo $AUTH_RESPONSE | grep -o '"user":{"id":"[^"]*"' | grep -o '[a-f0-9-]\{36\}')
ACCESS_TOKEN=$(echo $AUTH_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "❌ Error de autenticación. Verifica tu email y contraseña."
  echo "Respuesta: $AUTH_RESPONSE"
  exit 1
fi

echo "✅ Autenticado exitosamente"
echo "   User ID: $USER_ID"
echo ""

echo "2️⃣ Obteniendo créditos actuales..."
PROFILE_RESPONSE=$(curl -s "https://crdtxyfvbosjiddirtzc.supabase.co/rest/v1/profiles?id=eq.$USER_ID&select=credits,plan" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZHR4eWZ2Ym9zamlkZGlydHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTM2NzEsImV4cCI6MjA3NzgxMzY3MX0.MDyXRhimjW0zN3Doz_8_ZIFqAXNkSeME9EhlU9LB5F0" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

CURRENT_CREDITS=$(echo $PROFILE_RESPONSE | grep -o '"credits":[0-9]*' | grep -o '[0-9]*')
CURRENT_PLAN=$(echo $PROFILE_RESPONSE | grep -o '"plan":"[^"]*"' | cut -d'"' -f4)

echo "✅ Créditos actuales: $CURRENT_CREDITS"
echo "   Plan actual: $CURRENT_PLAN"
echo ""

echo "3️⃣ Creando sesión de checkout para plan Basic..."
CHECKOUT_RESPONSE=$(curl -s -X POST "https://kolink.es/api/checkout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"userId\":\"$USER_ID\",\"plan\":\"basic\"}")

CHECKOUT_URL=$(echo $CHECKOUT_RESPONSE | grep -o '"url":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CHECKOUT_URL" ]; then
  echo "❌ Error creando sesión de checkout"
  echo "Respuesta: $CHECKOUT_RESPONSE"
  exit 1
fi

echo "✅ Sesión de checkout creada"
echo ""
echo "🔗 URL de pago:"
echo "$CHECKOUT_URL"
echo ""
echo "=============================="
echo "📝 INSTRUCCIONES:"
echo "=============================="
echo ""
echo "1. Abre la URL de arriba en tu navegador"
echo "2. Usa estos datos de prueba de Stripe:"
echo "   - Tarjeta: 4242 4242 4242 4242"
echo "   - Fecha: 12/25"
echo "   - CVC: 123"
echo "   - ZIP: 12345"
echo "3. Completa el pago"
echo "4. Serás redirigido a /dashboard?status=success"
echo ""
echo "Después del pago, ejecuta este comando para verificar:"
echo ""
echo "curl -s \"https://crdtxyfvbosjiddirtzc.supabase.co/rest/v1/profiles?id=eq.$USER_ID&select=credits,plan\" \\"
echo "  -H \"apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZHR4eWZ2Ym9zamlkZGlydHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTM2NzEsImV4cCI6MjA3NzgxMzY3MX0.MDyXRhimjW0zN3Doz_8_ZIFqAXNkSeME9EhlU9LB5F0\" \\"
echo "  -H \"Authorization: Bearer $ACCESS_TOKEN\" | jq"
echo ""
echo "Los créditos deberían aumentar de $CURRENT_CREDITS a $((CURRENT_CREDITS + 50))"
