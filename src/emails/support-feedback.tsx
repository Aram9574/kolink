import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import React from "react";

const fontFamily = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const primaryColor = "#0070f3";
const textColor = "#1f2933";

interface SupportFeedbackEmailProps {
  reporterEmail: string;
  category: "bug" | "suggestion" | "idea";
  title: string;
  description: string;
  includeScreenshot?: boolean;
  includeCopy?: boolean;
  isAcknowledgement?: boolean;
}

const categoryLabels: Record<SupportFeedbackEmailProps["category"], string> = {
  bug: "Bug",
  suggestion: "Sugerencia",
  idea: "Idea",
};

export function SupportFeedbackEmail({
  reporterEmail,
  category,
  title,
  description,
  includeScreenshot = false,
  includeCopy = false,
  isAcknowledgement = false,
}: SupportFeedbackEmailProps) {
  const previewText = isAcknowledgement
    ? "Hemos recibido tu feedback en Kolink"
    : `Nuevo ${categoryLabels[category]} reportado por ${reporterEmail}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Heading style={headingStyle}>
              {isAcknowledgement ? "¡Gracias por tu feedback!" : "Nuevo aporte desde Kolink"}
            </Heading>
            <Text style={taglineStyle}>
              {isAcknowledgement
                ? "Tu comentario ya está en la bandeja del equipo de producto."
                : "Un usuario necesita nuestra atención para seguir disfrutando de la plataforma."}
            </Text>
          </Section>

          <Section style={bodySectionStyle}>
            <Text style={metaLabelStyle}>Tipo</Text>
            <Text style={metaValueStyle}>{categoryLabels[category]}</Text>

            <Text style={metaLabelStyle}>Usuario</Text>
            <Text style={metaValueStyle}>{reporterEmail}</Text>

            <Text style={metaLabelStyle}>Asunto</Text>
            <Text style={titleStyle}>{title}</Text>

            <Text style={metaLabelStyle}>Descripción</Text>
            <Text style={descriptionStyle}>{description}</Text>

            <div style={metaItemsStyle}>
              <span style={metaTagStyle}>
                Capturas pendientes: {includeScreenshot ? "Sí" : "No"}
              </span>
              {!isAcknowledgement && (
                <span style={metaTagStyle}>
                  Copia para el usuario: {includeCopy ? "Sí" : "No"}
                </span>
              )}
            </div>
          </Section>

          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              {isAcknowledgement
                ? "Nuestro equipo revisará tu mensaje y te contactará si necesitamos más información."
                : "Responde directamente a este correo si precisas más detalles del usuario."}
            </Text>
            <Text style={footerSignatureStyle}>Equipo de producto · Kolink</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#f3f4f6",
  fontFamily,
  margin: 0,
  padding: "48px 0",
};

const containerStyle = {
  margin: "0 auto",
  width: "100%",
  maxWidth: "640px",
  backgroundColor: "#ffffff",
  padding: "40px",
  borderRadius: "16px",
  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
};

const headerStyle = {
  marginBottom: "24px",
};

const headingStyle = {
  fontSize: "26px",
  fontWeight: 700,
  color: primaryColor,
  margin: 0,
};

const taglineStyle = {
  fontSize: "15px",
  color: "#6b7280",
  marginTop: "8px",
};

const bodySectionStyle = {
  marginTop: "16px",
};

const metaLabelStyle = {
  marginTop: "18px",
  fontSize: "12px",
  letterSpacing: "0.2em",
  fontWeight: 600,
  color: "#94a3b8",
  textTransform: "uppercase" as const,
};

const metaValueStyle = {
  marginTop: "4px",
  fontSize: "15px",
  color: textColor,
  fontWeight: 600,
};

const titleStyle = {
  marginTop: "6px",
  fontSize: "16px",
  color: textColor,
  fontWeight: 600,
};

const descriptionStyle = {
  marginTop: "6px",
  fontSize: "15px",
  lineHeight: "24px",
  color: textColor,
  whiteSpace: "pre-wrap" as const,
};

const metaItemsStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "8px",
  marginTop: "18px",
};

const metaTagStyle = {
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: "999px",
  border: `1px solid ${primaryColor}`,
  color: primaryColor,
  fontSize: "12px",
  fontWeight: 600,
};

const footerStyle = {
  marginTop: "32px",
  paddingTop: "16px",
  borderTop: "1px solid #e5e7eb",
};

const footerTextStyle = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#64748b",
  marginBottom: "12px",
};

const footerSignatureStyle = {
  fontSize: "13px",
  color: "#94a3b8",
  fontWeight: 600,
};

export default SupportFeedbackEmail;
