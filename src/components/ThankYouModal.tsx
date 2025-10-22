import { motion } from "framer-motion";
import { PartyPopper, Sparkles } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Button from "@/components/Button";

interface ThankYouModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: string;
  credits?: number;
}

export default function ThankYouModal({
  open,
  onOpenChange,
  plan = "PRO",
  credits = 0,
}: ThankYouModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-center max-w-md">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="flex justify-center mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <PartyPopper className="h-10 w-10 text-primary" />
          </div>
        </motion.div>

        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold mb-4"
        >
          ¡Gracias por mejorar tu plan!
        </motion.h2>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground mb-6"
        >
          Ahora tienes acceso al plan <span className="font-bold text-primary uppercase">{plan}</span> con{" "}
          <span className="font-bold text-primary">{credits} créditos</span> para usar.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-accent-muted dark:bg-surface-dark rounded-lg p-6 mb-6"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">¡Empieza a crear!</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Dirígete al dashboard y comienza a generar contenido increíble con IA.
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Continuar al Dashboard
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
