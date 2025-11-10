"use client";

import { logger } from '@/lib/logger';
import { useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Button from "@/components/Button";
import { Sparkles, LayoutDashboard, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingTourProps {
  userId: string | null;
}

type TourStep = {
  title: string;
  description: string;
  icon: React.ElementType;
  highlight?: string;
};

const DEFAULT_FEATURES: Record<string, unknown> = {};

export default function OnboardingTour({ userId }: OnboardingTourProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<Record<string, unknown>>(DEFAULT_FEATURES);

  const steps: TourStep[] = useMemo(
    () => [
      {
        title: "Panel inteligente",
        description: "Analiza tu rendimiento semanal, recibe ideas de IA y accede a tus posts automáticos con un sólo clic.",
        icon: LayoutDashboard,
        highlight: "Panel → Resumen diario",
      },
      {
        title: "Calendario + Auto-Pilot",
        description: "Programa contenidos en tu huso horario, ajusta la frecuencia de Auto-Pilot y mantén el control del pipeline.",
        icon: Calendar,
        highlight: "Calendario → Programación",
      },
      {
        title: "Colabora con tu equipo",
        description: "Invita a editores, revisores o viewers, comparte feedback en cada post y sigue la actividad desde el registro interno.",
        icon: Users,
        highlight: "Ajustes → Equipo",
      },
    ],
    []
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      if (!userId) {
        setOpen(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabaseClient
        .from("profiles")
        .select("features")
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        logger.error("[OnboardingTour] Failed to load profile features", error);
        setLoading(false);
        return;
      }

      const existingFeatures = (data?.features as Record<string, unknown>) ?? {};
      setFeatures(existingFeatures);

      const appPreferences =
        (existingFeatures.app_preferences as Record<string, unknown>) ?? existingFeatures ?? {};
      const alreadyCompleted = Boolean(appPreferences.onboarding_tour_completed);

      setOpen(!alreadyCompleted);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const markAsCompleted = async () => {
    if (!userId) return;

    const existingFeatures = features ?? {};
    const appPreferences = {
      ...(typeof existingFeatures.app_preferences === "object" && existingFeatures.app_preferences !== null
        ? (existingFeatures.app_preferences as Record<string, unknown>)
        : {}),
      onboarding_tour_completed: true,
    };

    const updatedFeatures = {
      ...existingFeatures,
      app_preferences: appPreferences,
    };

    setFeatures(updatedFeatures);

    const { error } = await supabaseClient
      .from("profiles")
      .update({ features: updatedFeatures })
      .eq("id", userId);

    if (error) {
      logger.error("[OnboardingTour] Failed to persist completion", error);
    }
  };

  const handleComplete = async () => {
    await markAsCompleted();
    setOpen(false);
  };

  const handleSkip = async () => {
    await markAsCompleted();
    setOpen(false);
  };

  const goNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleDialogChange = (value: boolean) => {
    if (value) {
      setOpen(true);
    }
  };

  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
    }
  }, [open]);

  if (loading || !userId) {
    return null;
  }

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const StepIcon = step.icon ?? Sparkles;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl font-semibold">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Guía rápida de Kolink
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Descubre en menos de un minuto los puntos clave para comenzar. Siempre podrás volver a esta guía desde el Centro de ayuda.
          </p>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
              <StepIcon className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{step.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{step.description}</p>
              {step.highlight && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-300">
                  {step.highlight}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            <span>Paso {currentStep + 1}</span>
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <span
                  key={`tour-step-${index}`}
                  className={cn(
                    "h-1.5 w-6 rounded-full transition",
                    index <= currentStep ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                  )}
                />
              ))}
            </div>
            <span>{steps.length} pasos</span>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleSkip}>
              Omitir tour
            </Button>
            <div className="flex items-center gap-3">
              {!isLast && (
                <Button variant="outline" onClick={goNext}>
                  Siguiente
                </Button>
              )}
              <Button onClick={isLast ? handleComplete : goNext}>
                {isLast ? "Todo claro" : "Entendido"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
