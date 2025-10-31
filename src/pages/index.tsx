import Head from "next/head";
import { Navbar } from "@/components/landing/layout/Navbar";
import { Hero } from "@/components/landing/sections/Hero";
import { TrustBadges } from "@/components/landing/sections/TrustBadges";
import { BenefitsSection } from "@/components/landing/sections/Benefits";
import { VideoDemo } from "@/components/landing/sections/VideoDemo";
import { GrowthComparison } from "@/components/landing/sections/GrowthComparison";
import { Features } from "@/components/landing/sections/Features";
import { CompanyLogos } from "@/components/landing/sections/CompanyLogos";
import { Pricing } from "@/components/landing/sections/Pricing";
import { PlanComparison } from "@/components/landing/sections/PlanComparison";
import { TestimonialsCarousel } from "@/components/landing/sections/Testimonials";
import { AboutSection } from "@/components/landing/sections/About";
import { FaqSection } from "@/components/landing/sections/FAQ";
import { ContactForm } from "@/components/landing/sections/ContactForm";
import { FinalCTA } from "@/components/landing/sections/FinalCTA";
import { Footer } from "@/components/landing/sections/Footer";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>KOLINK | IA para tu crecimiento profesional en LinkedIn</title>
        <meta
          name="description"
          content="Crea, analiza y escala tu presencia en LinkedIn con la ayuda de Kolink y su suite de herramientas impulsadas por IA"
        />
      </Head>
      <div className="bg-white text-secondary">
        <Navbar />
        <main>
          <Hero />
          <TrustBadges />
          <BenefitsSection />
          <VideoDemo />
          <GrowthComparison />
          <Features />
          <CompanyLogos />
          <Pricing />
          <PlanComparison />
          <TestimonialsCarousel />
          <AboutSection />
          <FaqSection />
          <ContactForm />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </>
  );
}
