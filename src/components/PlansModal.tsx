import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import Button from "@/components/Button";
import Card from "@/components/Card";
import toast from "react-hot-toast";

type PlanTier = "basic" | "standard" | "premium";

interface PlansModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
}

const PLANS = [
  {
    id: "basic" as PlanTier,
    name: "Basic",
    price: "€1",
    period: "/ mes",
    description: "Perfecto para comenzar",
    features: [
      "50 créditos mensuales",
      "Historial básico",
      "Soporte por email",
    ],
  },
  {
    id: "standard" as PlanTier,
    name: "Standard",
    price: "€8",
    period: "/ mes",
    description: "Ideal para creadores activos",
    features: [
      "200 créditos mensuales",
      "Historial completo",
      "Soporte prioritario",
      "Exportación avanzada",
    ],
    highlighted: true,
  },
  {
    id: "premium" as PlanTier,
    name: "Premium",
    price: "€12",
    period: "/ mes",
    description: "Para profesionales",
    features: [
      "500 créditos mensuales",
      "Historial ilimitado",
      "Soporte 24/7",
      "Análisis avanzado",
      "API Access",
    ],
  },
];

export default function PlansModal({ open, onOpenChange, userId }: PlansModalProps) {
  const [loading, setLoading] = useState<PlanTier | null>(null);

  const handleSelectPlan = async (planId: PlanTier) => {
    if (!userId) {
      toast.error("Debes iniciar sesión para seleccionar un plan");
      return;
    }

    setLoading(planId);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          plan: planId,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Validar que la URL es de Stripe (seguridad adicional)
        if (data.url.startsWith('https://checkout.stripe.com/') ||
            data.url.startsWith('https://billing.stripe.com/')) {
          window.location.href = data.url;
        } else {
          console.error('Invalid checkout URL:', data.url);
          toast.error("URL de pago inválida");
          setLoading(null);
        }
      } else {
        toast.error(data.error || "Error al procesar el pago");
        setLoading(null);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al procesar la solicitud");
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClick={() => onOpenChange(false)} />

        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Elige tu Plan
          </DialogTitle>
          <p className="text-center text-muted-foreground mt-2">
            Selecciona el plan que mejor se adapte a tus necesidades
          </p>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`p-6 relative ${
                plan.highlighted
                  ? "border-2 border-primary shadow-lg"
                  : ""
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-secondary px-3 py-1 rounded-full text-xs font-semibold">
                  Más Popular
                </div>
              )}

              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {plan.description}
              </p>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading !== null}
                variant={plan.highlighted ? "primary" : "outline"}
                className="w-full"
              >
                {loading === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Seleccionar"
                )}
              </Button>
            </Card>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Todos los planes incluyen acceso completo a la plataforma. Puedes cancelar en cualquier momento.
        </p>
      </DialogContent>
    </Dialog>
  );
}
