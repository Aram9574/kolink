"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import Button from "@/components/Button";

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "danger" | "warning";
  loading?: boolean;
}

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  variant = "default",
  loading = false,
}: ConfirmationModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    if (!loading) {
      onOpenChange(false);
    }
  };

  const variantStyles = {
    default: {
      icon: "text-blue-600 bg-blue-100",
      button: "bg-blue-600 hover:bg-blue-700",
    },
    danger: {
      icon: "text-red-600 bg-red-100",
      button: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      icon: "text-yellow-600 bg-yellow-100",
      button: "bg-yellow-600 hover:bg-yellow-700",
    },
  };

  const styles = variantStyles[variant];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-6 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${styles.icon}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h2>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {description}
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-200 p-6 dark:border-slate-700">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1"
              >
                {cancelText}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading}
                className={`flex-1 ${styles.button} text-white`}
              >
                {loading ? "Procesando..." : confirmText}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
