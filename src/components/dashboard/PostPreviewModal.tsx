"use client";

import { useState } from "react";
import { X, Copy, Check, Edit3, Save, TrendingUp } from "lucide-react";
import Button from "@/components/Button";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";

interface PostPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onSave: (editedContent: string) => void;
  onCopy: () => void;
  viralScore?: number;
  recommendations?: string[];
}

export function PostPreviewModal({
  open,
  onOpenChange,
  content,
  onSave,
  onCopy,
  viralScore,
  recommendations = [],
}: PostPreviewModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(isEditing ? editedContent : content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copiado al portapapeles");
    onCopy();
  };

  const handleSave = () => {
    onSave(editedContent);
    setIsEditing(false);
    toast.success("Cambios guardados");
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 40) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-orange-600 bg-orange-50 border-orange-200";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Vista previa del post</h2>
            <p className="mt-1 text-sm text-slate-600">
              {isEditing ? "Edita tu contenido antes de publicar" : "Revisa y edita tu contenido"}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6 space-y-6">
          {/* Viral Score */}
          {viralScore !== undefined && (
            <div className={`flex items-center justify-between rounded-2xl border p-4 ${getScoreColor(viralScore)}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/50">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Viral Score</p>
                  <p className="text-2xl font-bold">{viralScore}/100</p>
                </div>
              </div>
              <div className={`rounded-full px-4 py-2 text-sm font-semibold ${getScoreColor(viralScore)}`}>
                {viralScore >= 80 ? "Excelente" : viralScore >= 60 ? "Bueno" : viralScore >= 40 ? "Promedio" : "Mejorable"}
              </div>
            </div>
          )}

          {/* Post content */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-900">Tu post</label>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 transition hover:text-blue-700"
                >
                  <Edit3 className="h-4 w-4" />
                  Editar
                </button>
              )}
            </div>

            {isEditing ? (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[300px] text-base leading-relaxed"
                placeholder="Escribe tu contenido..."
              />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <p className="whitespace-pre-line text-base leading-relaxed text-slate-800">
                  {content}
                </p>
              </div>
            )}

            {isEditing && (
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Guardar cambios
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Sugerencias de mejora</h3>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <ul className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-blue-900">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Stats preview */}
          <div className="grid grid-cols-3 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{content.split(/\s+/).length}</p>
              <p className="mt-1 text-xs text-slate-600">Palabras</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{content.length}</p>
              <p className="mt-1 text-xs text-slate-600">Caracteres</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{content.split('\n\n').length}</p>
              <p className="mt-1 text-xs text-slate-600">Párrafos</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              Revisa tu contenido y cópialo cuando estés listo
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button onClick={handleCopy} disabled={copied}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar post
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
