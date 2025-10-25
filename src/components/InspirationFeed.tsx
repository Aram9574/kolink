"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Target, Lightbulb, Zap, Heart } from "lucide-react";
import Card from "./Card";
import Button from "./Button";

type InspirationTemplate = {
  id: string;
  title: string;
  category: string;
  prompt: string;
  icon: React.ReactNode;
  color: string;
};

const inspirationTemplates: InspirationTemplate[] = [
  {
    id: "1",
    title: "Comparte un Logro",
    category: "Profesional",
    prompt:
      "Redacta una publicación en LinkedIn compartiendo un logro profesional reciente, destacando las lecciones aprendidas y el impacto positivo en el equipo o proyecto. Incluye una llamada a la acción motivadora para la audiencia.",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  },
  {
    id: "2",
    title: "Lección Aprendida",
    category: "Reflexión",
    prompt:
      "Crea un post sobre una lección importante que aprendiste en tu carrera. Hazlo personal, auténtico y utiliza storytelling para conectar emocionalmente con tu audiencia. Termina con una pregunta para fomentar la conversación.",
    icon: <Lightbulb className="h-5 w-5" />,
    color: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400",
  },
  {
    id: "3",
    title: "Tendencia de Industria",
    category: "Análisis",
    prompt:
      "Analiza una tendencia actual en tu industria. Proporciona insights únicos, datos relevantes y tu perspectiva profesional. Incluye cómo esta tendencia puede impactar a profesionales en el campo y qué acciones pueden tomar.",
    icon: <Target className="h-5 w-5" />,
    color: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
  },
  {
    id: "4",
    title: "Consejo Práctico",
    category: "Educativo",
    prompt:
      "Comparte un consejo práctico y accionable relacionado con tu área de expertise. Usa un formato de lista o paso a paso para que sea fácil de seguir. Incluye ejemplos concretos y resultados esperados.",
    icon: <Zap className="h-5 w-5" />,
    color: "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400",
  },
  {
    id: "5",
    title: "Reconoce a Alguien",
    category: "Networking",
    prompt:
      "Escribe un post reconociendo públicamente a un colega, mentor o líder que te haya inspirado o ayudado. Sé específico sobre su impacto y por qué merece reconocimiento. Etiquétalos para amplificar el mensaje.",
    icon: <Heart className="h-5 w-5" />,
    color: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
  },
  {
    id: "6",
    title: "Pregunta a la Audiencia",
    category: "Engagement",
    prompt:
      "Formula una pregunta interesante y relevante para tu audiencia profesional. Proporciona contexto sobre por qué la pregunta es importante y comparte brevemente tu propia perspectiva para iniciar la conversación.",
    icon: <Sparkles className="h-5 w-5" />,
    color: "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400",
  },
];

type InspirationFeedProps = {
  onSelectTemplate: (prompt: string) => void;
};

export default function InspirationFeed({ onSelectTemplate }: InspirationFeedProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(
    new Set(inspirationTemplates.map((t) => t.category))
  );

  const filteredTemplates = selectedCategory
    ? inspirationTemplates.filter((t) => t.category === selectedCategory)
    : inspirationTemplates;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-muted dark:bg-surface-dark border border-primary/20 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Plantillas de Inspiración</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">
          Encuentra Inspiración para tu Próximo Post
        </h2>
        <p className="text-muted-foreground">
          Selecciona una plantilla y genera contenido optimizado con IA
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedCategory === null
              ? "bg-primary text-white"
              : "bg-surface-light dark:bg-surface-dark hover:bg-surface-light/80 dark:hover:bg-surface-dark/80"
          }`}
        >
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category
                ? "bg-primary text-white"
                : "bg-surface-light dark:bg-surface-dark hover:bg-surface-light/80 dark:hover:bg-surface-dark/80"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg ${template.color}`}>
                  {template.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{template.title}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-surface-light dark:bg-surface-dark">
                    {template.category}
                  </span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4 flex-1">
                {template.prompt.substring(0, 120)}...
              </p>

              <Button
                variant="outline"
                onClick={() => onSelectTemplate(template.prompt)}
                className="w-full flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Usar Plantilla
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tips Section */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-blue-500" />
          Tips para Maximizar el Engagement
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Personaliza siempre el contenido generado con tu voz y experiencia</li>
          <li>• Incluye datos, números o estadísticas cuando sea relevante</li>
          <li>• Utiliza emojis estratégicamente para mejorar la legibilidad</li>
          <li>• Termina con una pregunta para fomentar comentarios</li>
          <li>• Publica en horarios de alta actividad (mañanas laborales)</li>
        </ul>
      </Card>
    </div>
  );
}
