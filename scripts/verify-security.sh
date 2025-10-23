#!/bin/bash

# Script de Verificación de Seguridad para Kolink
# Verifica que no haya redirects maliciosos activos

DOMAIN="https://kolink-gamma.vercel.app"
PASS=0
FAIL=0

echo "🔍 Verificando seguridad de Kolink..."
echo "=================================="
echo ""

# Función para verificar redirect
check_redirect() {
  local path=$1
  local expected_code=$2

  echo -n "Checking $path... "

  response=$(curl -s -o /dev/null -w "%{http_code}" -L "$DOMAIN$path")

  if [ "$response" = "308" ] || [ "$response" = "301" ] || [ "$response" = "404" ]; then
    echo "✅ PASS ($response)"
    ((PASS++))
  else
    echo "❌ FAIL ($response - esperado 308/301/404)"
    ((FAIL++))
  fi
}

# Verificar rutas maliciosas están bloqueadas
echo "1. Verificando rutas de wallet bloqueadas:"
check_redirect "/wallet" 308
check_redirect "/wallet/test" 308
check_redirect "/_wallet" 308
check_redirect "/connect" 308
check_redirect "/_connect" 308
check_redirect "/blocknative.svg" 308
check_redirect "/blocknative/test" 308

echo ""
echo "2. Verificando headers de seguridad:"

# Verificar CSP
echo -n "Content-Security-Policy... "
csp=$(curl -s -I "$DOMAIN/" | grep -i "content-security-policy")
if [[ $csp == *"script-src"* ]]; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "❌ FAIL"
  ((FAIL++))
fi

# Verificar X-Frame-Options
echo -n "X-Frame-Options... "
xframe=$(curl -s -I "$DOMAIN/" | grep -i "x-frame-options")
if [[ $xframe == *"DENY"* ]]; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "❌ FAIL"
  ((FAIL++))
fi

echo ""
echo "3. Verificando no hay referencias a wallets en HTML:"
echo -n "Descargando dashboard... "
html=$(curl -s "$DOMAIN/dashboard")
if [[ $html == *"blocknative"* ]] || [[ $html == *"hm.baidu"* ]] || [[ $html == *"wallet"*"modal"* ]]; then
  echo "❌ FAIL - Se encontraron referencias sospechosas"
  ((FAIL++))
  echo ""
  echo "Referencias encontradas:"
  echo "$html" | grep -i "blocknative\|baidu\|wallet" | head -5
else
  echo "✅ PASS"
  ((PASS++))
fi

echo ""
echo "=================================="
echo "Resultados:"
echo "✅ PASS: $PASS"
echo "❌ FAIL: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "🎉 ¡Todas las verificaciones de seguridad pasaron!"
  exit 0
else
  echo "⚠️  Algunas verificaciones fallaron. Revisar arriba."
  exit 1
fi
