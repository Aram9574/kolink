import Head from "next/head";
import { Navbar } from "@/components/landing/layout/Navbar";
import { Hero } from "@/components/landing/sections/Hero";
import { BenefitsSection } from "@/components/landing/sections/Benefits";
import { GrowthComparison } from "@/components/landing/sections/GrowthComparison";
import { Features } from "@/components/landing/sections/Features";
import { Pricing } from "@/components/landing/sections/Pricing";
import { TestimonialsCarousel } from "@/components/landing/sections/Testimonials";
import { AboutSection } from "@/components/landing/sections/About";
import { FaqSection } from "@/components/landing/sections/FAQ";
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
          <BenefitsSection />
          <GrowthComparison />
          <Features />
          <Pricing />
          <TestimonialsCarousel />
          <AboutSection />
          <FaqSection />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </>
  );
}
