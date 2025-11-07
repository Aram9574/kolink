#!/bin/bash

# Test Payment Flow - Kolink
# Este script prueba el flujo completo de pagos:
# 1. Crear usuario de prueba
# 2. Crear sesión de checkout
# 3. Verificar webhook
# 4. Verificar créditos

set -e  # Exit on error

echo "🧪 Test de flujo de pagos - Kolink"
echo "=================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://kolink.es}"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
TEST_USER_ID="00000000-0000-0000-0000-000000000999"
TEST_EMAIL="test-payment-$(date +%s)@kolink.test"
TEST_PLAN="basic"

# Funciones de utilidad
print_step() {
  echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Verificar requisitos
print_step "Verificando requisitos..."

if [ -z "$SUPABASE_URL" ]; then
  print_error "NEXT_PUBLIC_SUPABASE_URL no está configurado"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  print_error "SUPABASE_SERVICE_ROLE_KEY no está configurado"
  exit 1
fi

print_success "Variables de entorno configuradas"

# Paso 1: Verificar variables de Stripe
print_step "Paso 1: Verificando variables de Stripe en Vercel..."

STRIPE_VARS=$(vercel env ls 2>/dev/null | grep -E "STRIPE|SITE_URL" | wc -l)

if [ "$STRIPE_VARS" -ge 6 ]; then
  print_success "Todas las variables de Stripe configuradas ($STRIPE_VARS encontradas)"
else
  print_warning "Faltan algunas variables de Stripe ($STRIPE_VARS/6 encontradas)"
  echo "   Ejecuta: vercel env ls | grep STRIPE"
fi

# Paso 2: Verificar webhook en Stripe
print_step "Paso 2: Verificando webhook en Stripe..."

echo ""
print_warning "ACCIÓN MANUAL REQUERIDA:"
echo "   1. Ir a: https://dashboard.stripe.com/webhooks"
echo "   2. Verificar que existe endpoint: $SITE_URL/api/webhook"
echo "   3. Verificar que evento 'checkout.session.completed' está habilitado"
echo "   4. Verificar que Status: Enabled"
echo ""
read -p "¿El webhook está configurado correctamente? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  print_error "Por favor, configura el webhook antes de continuar"
  echo "   Ver: docs/procedures/WEBHOOK_SETUP.md"
  exit 1
fi

print_success "Webhook verificado"

# Paso 3: Verificar conectividad
print_step "Paso 3: Verificando conectividad..."

# Test Supabase
SUPABASE_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  "$SUPABASE_URL/rest/v1/profiles?select=id&limit=1")

if [ "$SUPABASE_TEST" == "200" ]; then
  print_success "Supabase accesible"
else
  print_error "Supabase no accesible (HTTP $SUPABASE_TEST)"
  exit 1
fi

# Test API
API_TEST=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/api/checkout")

if [ "$API_TEST" == "405" ] || [ "$API_TEST" == "400" ]; then
  print_success "API accesible (esperado 405/400 sin POST)"
else
  print_warning "API responde con código inesperado: $API_TEST"
fi

# Paso 4: Crear usuario de prueba
print_step "Paso 4: Creando usuario de prueba..."

CREATE_USER_RESPONSE=$(curl -s -X POST \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  "$SUPABASE_URL/rest/v1/profiles" \
  -d "{
    \"id\": \"$TEST_USER_ID\",
    \"email\": \"$TEST_EMAIL\",
    \"plan\": \"free\",
    \"credits\": 0
  }")

if echo "$CREATE_USER_RESPONSE" | grep -q "id"; then
  print_success "Usuario de prueba creado: $TEST_EMAIL"
else
  # Puede que ya exista, verificar
  EXISTING_USER=$(curl -s \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    "$SUPABASE_URL/rest/v1/profiles?id=eq.$TEST_USER_ID&select=id")

  if echo "$EXISTING_USER" | grep -q "id"; then
    print_warning "Usuario ya existe, limpiando créditos..."
    curl -s -X PATCH \
      -H "apikey: $SUPABASE_SERVICE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
      -H "Content-Type: application/json" \
      "$SUPABASE_URL/rest/v1/profiles?id=eq.$TEST_USER_ID" \
      -d '{"plan": "free", "credits": 0}' > /dev/null
    print_success "Usuario limpiado"
  else
    print_error "No se pudo crear usuario: $CREATE_USER_RESPONSE"
    exit 1
  fi
fi

# Paso 5: Crear sesión de checkout
print_step "Paso 5: Creando sesión de checkout..."

# Nota: Este paso requiere autenticación real
print_warning "LIMITACIÓN: No podemos crear checkout sin JWT válido"
echo ""
echo "   Para prueba completa, seguir estos pasos manualmente:"
echo "   1. Ir a: $SITE_URL/dashboard"
echo "   2. Iniciar sesión con cuenta de prueba"
echo "   3. Seleccionar plan: $TEST_PLAN"
echo "   4. Completar checkout con tarjeta de prueba:"
echo "      - Número: 4242 4242 4242 4242"
echo "      - Fecha: 12/34"
echo "      - CVC: 123"
echo "      - ZIP: 12345"
echo ""

read -p "¿Deseas continuar con prueba manual de checkout? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  print_step "Esperando completar pago..."
  echo "   Una vez completado el pago, presiona ENTER para verificar"
  read -r

  # Paso 6: Verificar créditos
  print_step "Paso 6: Verificando créditos asignados..."

  USER_DATA=$(curl -s \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    "$SUPABASE_URL/rest/v1/profiles?id=eq.$TEST_USER_ID&select=plan,credits")

  PLAN=$(echo "$USER_DATA" | grep -o '"plan":"[^"]*"' | cut -d'"' -f4)
  CREDITS=$(echo "$USER_DATA" | grep -o '"credits":[0-9]*' | cut -d':' -f2)

  echo "   Plan: $PLAN"
  echo "   Créditos: $CREDITS"

  if [ "$PLAN" == "basic" ] && [ "$CREDITS" -gt 0 ]; then
    print_success "¡Pago procesado correctamente!"
    echo "   Plan actualizado: free → basic"
    echo "   Créditos asignados: 0 → $CREDITS"
  else
    print_error "Pago no procesado correctamente"
    echo "   Plan actual: $PLAN (esperado: basic)"
    echo "   Créditos: $CREDITS (esperado: 50)"
    exit 1
  fi
else
  print_warning "Prueba manual omitida"
fi

# Paso 7: Verificar logs
print_step "Paso 7: Verificando logs en Vercel..."

echo ""
print_warning "Verificar logs manualmente:"
echo "   vercel logs --follow | grep -E '(webhook|checkout)'"
echo ""
echo "   Buscar líneas como:"
echo "   - 📦 Evento recibido: checkout.session.completed"
echo "   - ✅ Plan actualizado a Basic"
echo "   - 📧 Payment confirmation email sent"
echo ""

# Paso 8: Limpiar usuario de prueba
print_step "Paso 8: ¿Limpiar usuario de prueba?"

read -p "¿Eliminar usuario de prueba? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  DELETE_RESPONSE=$(curl -s -X DELETE \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    "$SUPABASE_URL/rest/v1/profiles?id=eq.$TEST_USER_ID")

  print_success "Usuario de prueba eliminado"
else
  print_warning "Usuario de prueba conservado: $TEST_USER_ID"
fi

echo ""
echo "=================================="
print_success "Test completado"
echo ""
echo "📊 Próximos pasos:"
echo "   1. Revisar logs en Vercel: vercel logs"
echo "   2. Revisar webhooks en Stripe: https://dashboard.stripe.com/webhooks"
echo "   3. Configurar alertas en Sentry (ver Sprint 2)"
echo "   4. Documentar casos de refund (ver REFUND_PROCEDURE.md)"
echo ""
