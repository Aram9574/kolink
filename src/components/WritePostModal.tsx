import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { type LucideIcon, PencilLine, Sparkles, Repeat, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export type WriteOptionId = "ai" | "manual" | "repurpose" | "carousel";

type OptionItem = {
  id: WriteOptionId;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  badge?: string;
};

const OPTIONS: OptionItem[] = [
  {
    id: "ai",
    title: "Crear con IA",
    description: "Genera un nuevo post con recomendaciones inteligentes y plantillas sugeridas.",
    icon: Sparkles,
    accent: "from-blue-500/10 to-purple-500/10 text-blue-600",
  },
  {
    id: "manual",
    title: "Escribir manualmente",
    description: "Redacta tu post desde cero y gestiona tus borradores en el editor.",
    icon: PencilLine,
    accent: "from-emerald-500/10 to-teal-500/10 text-emerald-600",
  },
  {
    id: "repurpose",
    title: "Reutilizar contenido",
    description: "Transforma tus publicaciones previas con nuevos ángulos y gánale tiempo al creativo.",
    icon: Repeat,
    accent: "from-amber-500/10 to-orange-500/10 text-amber-600",
  },
  {
    id: "carousel",
    title: "Crear carrusel",
    description: "Convierte tus ideas en un carrusel deslizante para captar más atención (muy pronto).",
    icon: LayoutDashboard,
    accent: "from-sky-500/10 to-cyan-500/10 text-sky-600",
    badge: "Próximamente",
  },
];

type WritePostModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (option: WriteOptionId) => void;
};

export default function WritePostModal({ open, onOpenChange, onSelect }: WritePostModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogClose onClick={() => onOpenChange(false)} />

        <DialogHeader className="space-y-2 text-center">
          <DialogTitle className="text-2xl font-semibold">¿Cómo quieres crear tu post?</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Elige el flujo que mejor se adapte a lo que necesitas hoy.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={cn(
                "relative flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:-translate-y-1 hover:shadow-xl",
                "dark:border-slate-700 dark:bg-slate-900"
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br",
                  option.accent
                )}
              >
                <option.icon className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {option.title}
                  </h3>
                  {option.badge && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      {option.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-300 leading-relaxed">
                  {option.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
