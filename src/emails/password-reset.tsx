import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import React from "react";

const fontFamily = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const primaryColor = "#0070f3";
const textColor = "#1f2933";

export interface PasswordResetEmailProps {
  userName?: string;
  resetUrl: string;
  expiresIn?: string;
  supportEmail?: string;
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  userName = "Usuario",
  resetUrl,
  expiresIn = "1 hora",
  supportEmail = "soporte@kolink.es",
}) => (
  <Html>
    <Head />
    <Preview>Recupera el acceso a tu cuenta de Kolink</Preview>
    <Body style={mainStyle}>
      <Container style={cardStyle}>
        <Section style={headerStyle}>
          <Heading style={headingStyle}>Kolink</Heading>
          <Text style={taglineStyle}>Gestiona tus contenidos con confianza</Text>
        </Section>

        <Section>
          <Text style={greetingStyle}>Hola {userName},</Text>
          <Text style={paragraphStyle}>
            Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente
            botón para continuar con el proceso.
          </Text>
          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button style={buttonStyle} href={resetUrl}>
              Restablecer contraseña
            </Button>
          </Section>
          <Text style={paragraphStyle}>
            Por seguridad, este enlace estará disponible durante {expiresIn}. Si no solicitaste este
            cambio, ignora este correo o ponte en contacto con nuestro equipo de soporte.
          </Text>

          <Hr style={dividerStyle} />

          <Text style={paragraphStyle}>
            ¿Necesitas ayuda? Escríbenos a{" "}
            <a href={`mailto:${supportEmail}`} style={linkStyle}>
              {supportEmail}
            </a>{" "}
            y estaremos encantados de asistirte.
          </Text>
          <Text style={footerTextStyle}>
            Gracias por confiar en Kolink, tu plataforma SaaS para la gestión de contenidos.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const mainStyle = {
  margin: 0,
  padding: "48px 0",
  backgroundColor: "#f3f4f6",
  fontFamily,
};

const cardStyle = {
  margin: "0 auto",
  width: "100%",
  maxWidth: "560px",
  backgroundColor: "#ffffff",
  padding: "40px",
  borderRadius: "16px",
  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
};

const headerStyle = {
  marginBottom: "32px",
  textAlign: "center" as const,
};

const headingStyle = {
  fontSize: "28px",
  fontWeight: 700,
  color: primaryColor,
  margin: 0,
};

const taglineStyle = {
  fontSize: "16px",
  color: "#6b7280",
  marginTop: "8px",
};

const greetingStyle = {
  fontSize: "18px",
  fontWeight: 600,
  color: textColor,
  marginBottom: "12px",
};

const paragraphStyle = {
  fontSize: "16px",
  lineHeight: "26px",
  color: textColor,
  margin: "16px 0",
};

const buttonStyle = {
  display: "inline-block",
  padding: "14px 32px",
  borderRadius: "999px",
  backgroundColor: primaryColor,
  color: "#ffffff",
  fontWeight: 600,
  fontSize: "16px",
  textDecoration: "none",
};

const dividerStyle = {
  margin: "32px 0",
  borderColor: "#e5e7eb",
};

const linkStyle = {
  color: primaryColor,
  textDecoration: "none",
  fontWeight: 600,
};

const footerTextStyle = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#6b7280",
  marginTop: "16px",
};

export default PasswordResetEmail;
