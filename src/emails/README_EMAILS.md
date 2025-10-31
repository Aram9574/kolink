# Emails transaccionales de Kolink

Este módulo agrupa los correos automáticos alimentados por **Resend** y **React Email**. Todos los templates residen en `src/emails` y se envían a través de la utilidad `sendEmail.ts`, que convierte el componente React a HTML y texto plano antes de delegarlo a Resend.

## Añadir nuevos templates
- Crea un nuevo archivo `.tsx` dentro de `src/emails` siguiendo el patrón de los componentes existentes (`password-reset.tsx`, `password-changed.tsx`, `twofa-enabled.tsx`).
- Exporta el componente como función (por ejemplo `export const NewEventEmail = ({ ... }) => (...)`) y define los props necesarios con tipado estricto.
- Usa los componentes de `@react-email/components` para mantener estilos consistentes (`Html`, `Body`, `Container`, `Button`, etc.). El color primario de Kolink es `#0070f3` y la tipografía base es sans-serif.
- Desde el backend importa el template y pásalo a `sendEmail({ to, subject, react: TemplateComponent(props) })`.

## Probar los templates localmente
- Ejecuta el servidor de desarrollo con `npm run dev` y haz peticiones `POST` a los endpoints (`/api/auth/reset-password`, `/api/auth/change-password`, `/api/security/enable-2fa`) usando datos de prueba. Si tienes configurado `RESEND_API_KEY`, recibirás el correo real.
- Para previsualizar el HTML sin enviar nada, puedes usar `ts-node` desde la raíz del proyecto:

  ```bash
  npx ts-node --transpile-only <<'EOF'
  import { render } from "@react-email/render";
  import { PasswordResetEmail } from "./src/emails/password-reset";

  const html = render(
    PasswordResetEmail({
      resetUrl: "https://localhost:3000/reset?token=demo",
      expiresIn: "1 hora",
    })
  );

  console.log(html);
  EOF
  ```

  Ajusta el import y las props según el template que quieras revisar.

## Configurar Resend y variables en Vercel
- Define las variables en tu `.env.local` y en el panel de Vercel:
  - `RESEND_API_KEY`: clave de tu proyecto en Resend (formato `re_...`).
  - `FROM_EMAIL`: remitente verificado en Resend que usará la plataforma (por ejemplo `notificaciones@tu-dominio.com`).
  - `NEXT_PUBLIC_APP_URL`: URL pública de la aplicación usada para construir enlaces (por ejemplo `https://tu-dominio.vercel.app`).
- En la sección **Project Settings → Environment Variables** de Vercel añade las claves anteriores para cada entorno (`Production`, `Preview`, `Development`).
- Después de cambiar los env vars, vuelve a desplegar el proyecto para que Next.js y Resend lean la nueva configuración.
