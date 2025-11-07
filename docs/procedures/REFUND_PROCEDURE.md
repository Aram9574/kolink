# Procedimiento de Refund - Kolink

**Última actualización:** 2025-11-07

---

## 📋 Cuándo hacer un refund

Hacer refund en los siguientes casos:

1. **Usuario solicita cancelación dentro de 7 días** desde la fecha de compra
2. **Webhook falló** y no se asignaron créditos al usuario
3. **Error técnico** impidió el servicio prometido
4. **Caso de fraude identificado** por Stripe o detección interna
5. **Usuario reporta doble cargo** (verificar en Stripe)
6. **Compra accidental** dentro de 24 horas

---

## 🔍 Pasos para Refund

### 1. Identificar la transacción

#### Opción A: Buscar por email en Stripe Dashboard

```
1. Ir a: https://dashboard.stripe.com/payments
2. Buscar por email del usuario en la barra de búsqueda
3. Filtrar por fecha si es necesario
4. Identificar el payment intent correcto
```

#### Opción B: Buscar por session ID en logs

```bash
# En Vercel logs
vercel logs --filter="Checkout completed"

# Buscar línea similar a:
# ✅ Sesión de checkout creada para [userId]: sessionId=cs_test_xxxxx
```

#### Opción C: Consultar en Supabase

```sql
-- Conectar a Supabase
psql "postgresql://postgres:[PASSWORD]@db.crdtxyfvbosjiddirtzc.supabase.co:5432/postgres"

-- Buscar pagos del usuario
SELECT
  id,
  user_id,
  plan,
  amount,
  stripe_session_id,
  created_at
FROM payment_logs
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC;
```

---

### 2. Procesar refund en Stripe

#### Refund completo (Full refund)

**Cuándo usar:**
- Usuario cancela dentro de 7 días
- Webhook falló (sin créditos asignados)
- Error técnico crítico

**Pasos:**
1. En Stripe Dashboard, abrir el pago
2. Click en **"Refund payment"**
3. Seleccionar **"Full refund"**
4. **Razón:** Seleccionar de la lista o escribir motivo personalizado:
   - `requested_by_customer` - Solicitud del cliente
   - `fraudulent` - Fraude
   - `duplicate` - Duplicado
   - `other` - Otro (especificar)
5. Click **"Refund"**
6. Confirmar que el estado cambió a "Refunded"

#### Refund parcial (Partial refund)

**Cuándo usar:**
- Usuario ya consumió algunos créditos
- Cancelación fuera del período de 7 días
- Error parcial en el servicio

**Cálculo:**
```
Créditos asignados: X
Créditos consumidos: Y
Créditos no usados: Z = X - Y

Refund = (Z / X) * Precio original
```

**Ejemplo:**
```
Plan: Basic ($9 USD)
Créditos asignados: 50
Créditos consumidos: 30
Créditos no usados: 20

Refund = (20 / 50) * $9 = $3.60
```

**Pasos:**
1. Calcular monto a reembolsar
2. En Stripe Dashboard, click **"Refund payment"**
3. Seleccionar **"Partial refund"**
4. Ingresar monto calculado
5. Agregar nota explicativa
6. Click **"Refund"**

---

### 3. Ajustar créditos en Supabase

**⚠️ IMPORTANTE:** Hacer DESPUÉS de confirmar refund en Stripe

#### Para refund completo:

```sql
-- Restar créditos asignados y revertir plan
UPDATE profiles
SET
  credits = credits - [CREDITOS_ASIGNADOS],
  plan = 'free'
WHERE id = 'USER_ID';

-- Ejemplo para Basic (50 créditos)
UPDATE profiles
SET
  credits = GREATEST(0, credits - 50),
  plan = 'free'
WHERE id = '00000000-0000-0000-0000-000000000001';
```

#### Para refund parcial:

```sql
-- Restar solo créditos no usados
UPDATE profiles
SET
  credits = credits - [CREDITOS_NO_USADOS],
  plan = 'free'  -- O mantener plan si aplica
WHERE id = 'USER_ID';
```

#### Verificar el ajuste:

```sql
SELECT id, email, plan, credits, stripe_customer_id
FROM profiles
WHERE id = 'USER_ID';
```

---

### 4. Registrar el refund (Auditoría)

```sql
-- Crear entrada en payment_logs (si existe la tabla)
INSERT INTO payment_logs (
  user_id,
  plan,
  amount,
  stripe_session_id,
  status,
  notes
) VALUES (
  'USER_ID',
  'basic',
  -900,  -- Negativo para refund (en centavos)
  'cs_xxxxxxxxxxxxx',
  'refunded',
  'Refund completo: solicitud del usuario dentro de 7 días'
);
```

---

### 5. Notificar al usuario

Enviar email de confirmación con los siguientes detalles:

**Asunto:** "Reembolso procesado - Kolink"

**Contenido:**
```
Hola [Nombre],

Hemos procesado tu reembolso exitosamente.

Detalles del reembolso:
- Plan: [Nombre del plan]
- Monto reembolsado: $[monto] USD
- Fecha: [fecha]
- Método: [Tarjeta terminada en XXXX]

Los fondos aparecerán en tu cuenta en 5-10 días hábiles.

Tu cuenta ha sido ajustada:
- Créditos restados: [cantidad]
- Plan actual: Free

Si tienes preguntas, responde a este email.

Gracias,
Equipo Kolink
```

---

## 🚨 Casos Especiales

### Caso 1: Usuario consumió más créditos que los asignados

**Escenario:**
```
Créditos asignados: 50
Créditos consumidos: 65 (compró más paquetes)
```

**Solución:**
1. Calcular refund solo del plan inicial
2. No afectar créditos comprados por separado
3. Consultar al usuario si desea refund de todos los paquetes

---

### Caso 2: Webhook falló - Usuario pagó pero no recibió créditos

**Pasos críticos:**
1. ✅ Verificar pago exitoso en Stripe
2. ✅ Verificar que webhook retornó error en logs:
   ```bash
   vercel logs --filter="webhook" | grep "ERROR"
   ```
3. ✅ Verificar que perfil NO fue actualizado:
   ```sql
   SELECT credits, plan FROM profiles WHERE id = 'USER_ID';
   ```
4. ❌ **NO hacer refund** si se puede corregir manualmente
5. ✅ Actualizar perfil manualmente:
   ```sql
   UPDATE profiles
   SET plan = 'basic', credits = credits + 50
   WHERE id = 'USER_ID';
   ```
6. ✅ Notificar al usuario que el problema fue resuelto

**Solo hacer refund si:**
- El usuario insiste en cancelar
- Han pasado más de 24 horas sin resolución
- Error no se puede corregir

---

### Caso 3: Doble cargo accidental

**Pasos:**
1. Identificar ambos cargos en Stripe
2. Verificar si ambos webhook se procesaron (revisar logs)
3. Si ambos procesaron:
   - Refund completo del segundo cargo
   - Ajustar créditos:
     ```sql
     UPDATE profiles
     SET credits = credits - [CREDITOS_SEGUNDO_CARGO]
     WHERE id = 'USER_ID';
     ```
4. Si solo uno procesó:
   - Refund completo del cargo que no procesó
   - No ajustar créditos

---

### Caso 4: Usuario fraudulento

**Indicadores de fraude:**
- Múltiples tarjetas declinadas seguidas de una exitosa
- IP de país diferente al de la tarjeta
- Email temporal o sospechoso
- Intento de consumir créditos inmediatamente después de pagar

**Pasos:**
1. Bloquear cuenta en Supabase:
   ```sql
   UPDATE profiles
   SET
     credits = 0,
     plan = 'blocked',
     blocked_reason = 'Fraude detectado'
   WHERE id = 'USER_ID';
   ```
2. Reportar en Stripe Dashboard:
   - Marcar pago como fraudulento
   - Stripe automáticamente hace refund
3. Agregar email a lista negra (si aplica)

---

## 📊 Monitoreo de Refunds

### Dashboard de Stripe

Ver refunds procesados:
```
https://dashboard.stripe.com/refunds
```

Filtros útiles:
- Por fecha
- Por monto
- Por razón
- Por estado

### Métricas a monitorear

**Tasa de refund saludable:** < 5%

```sql
-- Query para calcular tasa de refund
SELECT
  COUNT(CASE WHEN status = 'refunded' THEN 1 END) * 100.0 / COUNT(*) as refund_rate
FROM payment_logs
WHERE created_at >= NOW() - INTERVAL '30 days';
```

**Alertas a configurar:**
- Si tasa de refund > 10%
- Si más de 5 refunds en un día
- Si refund por mismo usuario múltiples veces

---

## 🔒 Seguridad y Compliance

### Información sensible

**NUNCA compartir:**
- Números de tarjeta completos
- CVV o códigos de seguridad
- Contraseñas o tokens de API

**Solo compartir:**
- Últimos 4 dígitos de tarjeta
- IDs de transacción (session_id)
- Fechas y montos

### Registro de auditoría

Documentar cada refund en:
1. ✅ Stripe (automático)
2. ✅ Supabase `payment_logs` (manual)
3. ✅ Logs de Vercel (automático)
4. ✅ Email al usuario (manual)

---

## 🆘 Troubleshooting

### Problema: Refund no aparece en Stripe

**Soluciones:**
1. Verificar que el pago fue capturado (no solo autorizado)
2. Refrescar página del Dashboard
3. Verificar que usaste el payment intent correcto
4. Contactar soporte de Stripe si persiste

---

### Problema: Usuario reporta que no recibió refund

**Pasos:**
1. Verificar fecha del refund en Stripe
2. Recordar que tarda 5-10 días hábiles
3. Verificar que la tarjeta usada sigue activa
4. Si > 10 días, pedir al usuario contactar su banco
5. Stripe puede generar "refund receipt" para el usuario

---

### Problema: No puedo ajustar créditos en Supabase

**Soluciones:**
```sql
-- Verificar que el usuario existe
SELECT * FROM profiles WHERE id = 'USER_ID';

-- Verificar permisos (usar service role key)
-- En .env.local:
SUPABASE_SERVICE_ROLE_KEY=[tu_key]

-- Si persiste, usar Supabase Dashboard:
-- https://app.supabase.com/project/[project]/editor
```

---

## 📞 Contactos y Recursos

### Soporte Stripe
- Dashboard: https://dashboard.stripe.com/
- Docs: https://stripe.com/docs/refunds
- Support: https://support.stripe.com/

### Herramientas internas
- Vercel logs: `vercel logs --follow`
- Supabase dashboard: https://app.supabase.com/
- Sentry (errores): https://sentry.io/

### Equipo interno
- **Refunds críticos (> $100):** Escalar a lead
- **Casos de fraude:** Escalar a seguridad
- **Problemas técnicos:** Escalar a desarrollo

---

## 📝 Checklist de Refund

Usar este checklist para cada refund:

- [ ] Identificar transacción en Stripe
- [ ] Verificar motivo válido
- [ ] Calcular monto (completo o parcial)
- [ ] Procesar refund en Stripe
- [ ] Confirmar estado "Refunded"
- [ ] Ajustar créditos en Supabase
- [ ] Verificar ajuste correcto
- [ ] Registrar en payment_logs (si aplica)
- [ ] Enviar email de confirmación al usuario
- [ ] Actualizar ticket de soporte (si aplica)
- [ ] Documentar caso especial (si aplica)

---

**Última revisión:** 2025-11-07
**Versión:** 1.0
**Mantenido por:** Equipo Kolink
