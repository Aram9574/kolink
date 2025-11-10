// Export modal for content downloads
"use client";

import { logger } from '@/lib/logger';
import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, Loader2 } from "lucide-react";
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
  const [loadingDownload, setLoadingDownload] = useState(false);

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
      logger.error("Download error:", error);
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
          <div className="text-sm text-muted-foreground text-left">
            Descarga tu contenido en el formato que prefieras.
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
