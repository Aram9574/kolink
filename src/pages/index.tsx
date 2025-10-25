import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Zap, Shield, TrendingUp, Check, ArrowRight } from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import type { Session } from "@supabase/supabase-js";

type HomeProps = {
  session: Session | null | undefined;
};

export default function Home({ session: _session }: HomeProps) {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pt-20 pb-32 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 -z-10" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-muted border border-primary/20 mb-8">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Potencia tu creatividad con IA</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Genera contenido{" "}
            <span className="text-primary">brillante</span>{" "}
            en segundos
          </h1>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            KOLINK combina inteligencia artificial avanzada con simplicidad para ayudarte a crear,
            guardar y gestionar tus mejores ideas de contenido.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button className="text-base px-8 py-4">
                Comienza Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#planes">
              <Button variant="outline" className="text-base px-8 py-4">
                Ver Planes
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-surface-light dark:bg-surface-dark">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Todo lo que necesitas para crear mejor contenido
            </h2>
            <p className="text-lg text-muted-foreground">
              Herramientas profesionales diseñadas para creadores de contenido
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full text-center p-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Generación Rápida</h3>
                <p className="text-muted-foreground">
                  Genera contenido optimizado en segundos con GPT-4.
                  Ideas ilimitadas al alcance de un clic.
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full text-center p-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Almacenamiento Seguro</h3>
                <p className="text-muted-foreground">
                  Todas tus ideas guardadas y sincronizadas de forma segura.
                  Accede desde cualquier dispositivo.
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Card className="h-full text-center p-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Escalable</h3>
                <p className="text-muted-foreground">
                  Empieza gratis y escala según tus necesidades.
                  Planes flexibles para todo tipo de creadores.
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planes" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Elige el plan perfecto para ti
            </h2>
            <p className="text-lg text-muted-foreground">
              Comienza gratis y mejora cuando lo necesites
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Basic Plan */}
            <Card className="p-8">
              <h3 className="text-2xl font-bold mb-2">Basic</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">€1</span>
                <span className="text-muted-foreground"> / mes</span>
              </div>
              <p className="text-muted-foreground mb-6">
                Perfecto para comenzar a experimentar
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>50 créditos mensuales</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Historial básico</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Soporte por email</span>
                </li>
              </ul>
              <Link href="/signup">
                <Button variant="outline" className="w-full">
                  Comenzar
                </Button>
              </Link>
            </Card>

            {/* Standard Plan - Highlighted */}
            <Card className="p-8 border-2 border-primary relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-secondary px-4 py-1 rounded-full text-sm font-semibold">
                Más Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Standard</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">€8</span>
                <span className="text-muted-foreground"> / mes</span>
              </div>
              <p className="text-muted-foreground mb-6">
                Ideal para creadores activos
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>200 créditos mensuales</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Historial completo</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Soporte prioritario</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Exportación avanzada</span>
                </li>
              </ul>
              <Link href="/signup">
                <Button className="w-full">
                  Comenzar
                </Button>
              </Link>
            </Card>

            {/* Premium Plan */}
            <Card className="p-8">
              <h3 className="text-2xl font-bold mb-2">Premium</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">€12</span>
                <span className="text-muted-foreground"> / mes</span>
              </div>
              <p className="text-muted-foreground mb-6">
                Para profesionales y equipos
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>500 créditos mensuales</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Historial ilimitado</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Soporte 24/7</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Análisis avanzado</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>API Access</span>
                </li>
              </ul>
              <Link href="/signup">
                <Button variant="outline" className="w-full">
                  Comenzar
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 to-accent/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            ¿Listo para potenciar tu creatividad?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Únete a miles de creadores que ya confían en KOLINK para generar contenido excepcional.
          </p>
          <Link href="/signup">
            <Button className="text-base px-8 py-4">
              Comienza Gratis Ahora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-light dark:border-border-dark px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-bold">KOLINK</span>
              <span className="text-xs text-muted-foreground">v0.4</span>
            </div>

            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-primary transition-colors">
                Términos
              </Link>
              <Link href="#" className="hover:text-primary transition-colors">
                Privacidad
              </Link>
              <Link href="#" className="hover:text-primary transition-colors">
                Contacto
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            © 2024 KOLINK. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
