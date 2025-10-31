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

export interface TwoFAEnabledEmailProps {
  userName?: string;
  accountEmail: string;
  securityCenterUrl?: string;
  backupCodesReminder?: string;
  supportEmail?: string;
}

export const TwoFAEnabledEmail: React.FC<TwoFAEnabledEmailProps> = ({
  userName = "Usuario",
  accountEmail,
  securityCenterUrl = "https://kolink.es/seguridad",
  backupCodesReminder = "Guarda tus códigos de respaldo en un lugar seguro y no los compartas con nadie.",
  supportEmail = "soporte@kolink.es",
}) => (
  <Html>
    <Head />
    <Preview>La autenticación en dos pasos está activa en tu cuenta Kolink</Preview>
    <Body style={mainStyle}>
      <Container style={cardStyle}>
        <Section style={headerStyle}>
          <Heading style={headingStyle}>Kolink</Heading>
          <Text style={taglineStyle}>Protegiendo tus contenidos en cada paso</Text>
        </Section>

        <Section>
          <Text style={greetingStyle}>Hola {userName},</Text>
          <Text style={paragraphStyle}>
            ¡Excelente noticia! La autenticación en dos pasos (2FA) quedó activada correctamente
            para la cuenta {accountEmail}. Esto añade una capa adicional de protección en cada inicio
            de sesión.
          </Text>

          <Text style={paragraphStyle}>{backupCodesReminder}</Text>

          <Section style={{ margin: "28px 0" }}>
            <Button style={buttonStyle} href={securityCenterUrl}>
              Revisar opciones de seguridad
            </Button>
          </Section>

          <Text style={paragraphStyle}>
            Si en algún momento necesitas desactivar la verificación en dos pasos o regenerar tus
            códigos, podrás hacerlo desde tu panel de seguridad.
          </Text>

          <Hr style={dividerStyle} />

          <Text style={paragraphStyle}>
            ¿Tienes preguntas? Escríbenos a{" "}
            <a href={`mailto:${supportEmail}`} style={linkStyle}>
              {supportEmail}
            </a>{" "}
            y estaremos listos para ayudarte.
          </Text>
          <Text style={footerTextStyle}>
            Gracias por reforzar la seguridad de tu cuenta Kolink.
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

export default TwoFAEnabledEmail;
