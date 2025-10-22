// [Phase 5] Export modal for LinkedIn and downloads
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Share2, FileText, Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import Button from "@/components/Button";
import toast from "react-hot-toast";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  title?: string;
}

export default function ExportModal({ open, onOpenChange, content, title }: ExportModalProps) {
  const [loadingLinkedIn, setLoadingLinkedIn] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [linkedInSuccess, setLinkedInSuccess] = useState(false);

  const handleLinkedInExport = async () => {
    setLoadingLinkedIn(true);
    try {
      const response = await fetch("/api/export/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title }),
      });

      const data = await response.json();

      if (data.success) {
        setLinkedInSuccess(true);
        toast.success("Contenido listo para LinkedIn");

        // Open LinkedIn in new tab
        setTimeout(() => {
          window.open(data.url, "_blank");
        }, 500);
      } else {
        toast.error("Error al preparar contenido");
      }
    } catch (error) {
      console.error("LinkedIn export error:", error);
      toast.error("Error al conectar con LinkedIn");
    } finally {
      setLoadingLinkedIn(false);
    }
  };

  const handleDownload = async (format: "txt" | "md") => {
    setLoadingDownload(true);
    try {
      const response = await fetch("/api/export/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title, format }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `kolink-content-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Archivo .${format} descargado`);
      } else {
        toast.error("Error al descargar archivo");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Error al descargar");
    } finally {
      setLoadingDownload(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogClose onClick={() => onOpenChange(false)} />

        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Exportar Contenido
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Elige cómo quieres compartir o guardar tu contenido
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {/* LinkedIn Export */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Button
              onClick={handleLinkedInExport}
              disabled={loadingLinkedIn || linkedInSuccess}
              className="w-full flex items-center justify-center gap-2"
            >
              {loadingLinkedIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparando...
                </>
              ) : linkedInSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  Listo para LinkedIn
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  Publicar en LinkedIn
                </>
              )}
            </Button>
          </motion.div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border-light dark:border-border-dark" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background-light dark:bg-surface-dark px-2 text-muted-foreground">
                O descargar como
              </span>
            </div>
          </div>

          {/* Download Options */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3"
          >
            <Button
              onClick={() => handleDownload("txt")}
              disabled={loadingDownload}
              variant="outline"
              className="flex items-center justify-center gap-2"
            >
              {loadingDownload ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  .TXT
                </>
              )}
            </Button>

            <Button
              onClick={() => handleDownload("md")}
              disabled={loadingDownload}
              variant="outline"
              className="flex items-center justify-center gap-2"
            >
              {loadingDownload ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  .MD
                </>
              )}
            </Button>
          </motion.div>

          {/* Info Text */}
          <p className="text-xs text-center text-muted-foreground mt-4">
            El contenido será exportado tal como fue generado
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
