# Revisión de dependencias (Octubre 2025)

Durante la sesión actual no fue posible ejecutar `npm outdated` debido a las restricciones de red del entorno (`ENOTFOUND registry.npmjs.org`). Por ese motivo no se generó una lista automática de paquetes desactualizados.

## Pasos recomendados

1. Ejecutar localmente (o en CI con acceso a Internet):
   ```bash
   npm install
   npm outdated
   ```
   Guarda el resultado como evidencia en este mismo directorio.

2. Repite el proceso para las dependencias de desarrollo si utilizas `pnpm` o `yarn` en otros entornos.

3. Prioriza las actualizaciones con impacto en seguridad:
   - `@sentry/nextjs`
   - `next` y `react`
   - `supabase` SDKs
   - Cualquier paquete relacionado con autenticación o cifrado.

4. Tras actualizar paquetes críticos, ejecuta la suite de pruebas:
   ```bash
   npm run lint
   npm run test
   ```

5. Documenta los cambios en el changelog y valida el build de producción (`npm run build`).

> Nota: Este repositorio ya incluye un workflow de auditoría de vulnerabilidades que lanzará `npm audit --audit-level=high` en cada push. Asegúrate de revisar los resultados cuando el CI tenga conectividad externa.
