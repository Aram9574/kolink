import { logger } from '@/lib/logger';
import { useEffect, useMemo, useState } from "react";
import { MessageCircleMore, Send } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/lib/supabaseClient";
import { useNotifications } from "@/contexts/NotificationContext";
import Button from "@/components/Button";

type FeedbackCategory = "bug" | "suggestion" | "idea";

interface FeedbackFormState {
  category: FeedbackCategory;
  title: string;
  description: string;
  includeScreenshot: boolean;
  emailCopy: boolean;
}

const DEFAULT_STATE: FeedbackFormState = {
  category: "bug",
  title: "",
  description: "",
  includeScreenshot: true,
  emailCopy: false,
};

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [form, setForm] = useState<FeedbackFormState>(DEFAULT_STATE);
  const { notifySuccess, notifyError } = useNotifications();

  useEffect(() => {
    let active = true;
    if (!open) return;

    supabaseClient.auth.getSession().then(({ data }) => {
      if (!active) return;
      const accessToken = data.session?.access_token ?? null;
      setToken(accessToken);
    });

    return () => {
      active = false;
    };
  }, [open]);

  const isValid = useMemo(() => form.title.trim().length > 3 && form.description.trim().length > 10, [form]);

  const handleSubmit = async () => {
    if (!isValid) {
      notifyError("Por favor completa el título y la descripción con más detalles.");
      return;
    }

    if (!token) {
      notifyError("Necesitas iniciar sesión para enviar comentarios.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/support/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "No pudimos enviar tu mensaje.");
      }

      setForm(DEFAULT_STATE);
      setOpen(false);
      notifySuccess("¡Gracias! Nuestro equipo revisará tu comentario muy pronto.");
    } catch (error) {
      logger.error("[FeedbackButton] Failed to submit feedback", error);
      notifyError(error instanceof Error ? error.message : "Error inesperado al enviar el formulario.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-[70] flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-blue-700",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
        )}
      >
        <MessageCircleMore className="h-4 w-4" />
        Reportar bug / sugerencia
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogClose onClick={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">Cuéntanos qué mejorar</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Tu feedback nos ayuda a priorizar mejoras y resolver problemas antes de que impacten a más usuarios.
            </p>
          </DialogHeader>

          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <label htmlFor="feedback-category" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Tipo
              </label>
              <select
                id="feedback-category"
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value as FeedbackCategory }))
                }
                className="w-full rounded-md border border-border-light dark:border-border-dark bg-background-light dark:bg-surface-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="bug">Encontré un bug</option>
                <option value="suggestion">Quiero sugerir una mejora</option>
                <option value="idea">Tengo una idea nueva</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="feedback-title" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Resumen
              </label>
              <Input
                id="feedback-title"
                placeholder="Ej. El calendario no muestra mis posts programados"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                maxLength={120}
              />
              <p className="text-right text-xs text-muted-foreground">{form.title.length}/120</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="feedback-description" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Detalles
              </label>
              <Textarea
                id="feedback-description"
                rows={6}
                placeholder="Cuéntanos qué sucede, qué esperabas, pasos para reproducirlo o qué impacto tendría la mejora..."
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.includeScreenshot}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, includeScreenshot: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border border-border-light dark:border-border-dark"
                />
                Adjuntaré una captura por email si hace falta
              </label>

              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.emailCopy}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, emailCopy: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border border-border-light dark:border-border-dark"
                />
                Envíenme una copia cuando respondan
              </label>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!isValid || submitting}
                onClick={handleSubmit}
                className="flex items-center gap-2"
              >
                {submitting ? "Enviando..." : "Enviar"}
                {!submitting && <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
