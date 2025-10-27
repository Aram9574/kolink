import Card from "@/components/Card";
import { Rocket, MessageSquare, BarChart3, Users, LineChart, MessageSquareText } from "lucide-react";

const FEATURES = [
  { icon: Rocket, title: "Collab AI", description: "Briefings inteligentes que generan variantes con tu tono de voz." },
  { icon: BarChart3, title: "Analytics", description: "Paneles que te dicen qué replicar, cuándo publicar y en qué formato." },
  { icon: Users, title: "Community", description: "Acceso a masterminds mensuales con creadores que ya monetizan LinkedIn." },
  { icon: LineChart, title: "Trends", description: "Curación diaria de tendencias y hooks que están funcionando en tu industria." },
  { icon: MessageSquareText, title: "Strategy Sessions", description: "Sesiones 1:1 con expertos para revisar contenido y objetivos." },
  { icon: MessageSquare, title: "Feedback Loop", description: "Recibe comentarios accionables de coaches y de la comunidad." },
];

export function Features() {
  return (
    <section id="features" className="bg-gray-50 py-20">
      <h2 className="mb-10 text-center text-3xl font-bold">Todo lo que necesitas para ganar en LinkedIn</h2>
      <div className="mx-auto grid max-w-6xl gap-6 px-6 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="h-full text-center">
            <div className="p-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-semibold">{title}</h3>
              <p className="text-gray-600">{description}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
