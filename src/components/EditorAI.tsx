"use client";

import { useState, useEffect, useRef } from "react";
import Button from "./Button";
import { Textarea } from "./ui/textarea";
import {
  Mic,
  MicOff,
  Sparkles,
  RefreshCw,
  Copy,
  Save,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

type EditorAIProps = {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => Promise<void>;
  onRegenerate?: () => Promise<void>;
  onSave?: (content: string) => Promise<void>;
  loading?: boolean;
  viralScore?: number;
  recommendations?: string[];
  placeholder?: string;
  className?: string;
};

type SpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
};

type SpeechRecognitionErrorEvent = {
  error: string;
  message?: string;
};

type SpeechRecognitionEvent = {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
    length: number;
  };
};

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function EditorAI({
  value,
  onChange,
  onGenerate,
  onRegenerate,
  onSave,
  loading = false,
  viralScore,
  recommendations = [],
  placeholder = "Escribe tu prompt o usa el micrófono...",
  className,
}: EditorAIProps) {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [saved, setSaved] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check if speech recognition is supported
    if (typeof window !== "undefined") {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "es-ES";

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = "";

          for (let i = event.results.length - 1; i >= 0; i--) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript = transcript;
            }
          }

          if (finalTranscript) {
            onChange(value + " " + finalTranscript);
          }
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event);
          setIsListening(false);
          toast.error("Error en reconocimiento de voz");
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening, onChange, value]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      toast.success("Reconocimiento de voz detenido");
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast.success("Escuchando... Habla ahora");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copiado al portapapeles");
    } catch {
      toast.error("Error al copiar");
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    try {
      await onSave(value);
      setSaved(true);
      toast.success("Guardado exitosamente");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Error al guardar");
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return "text-gray-500";
    if (score >= 75) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreLabel = (score?: number) => {
    if (!score) return "No analizado";
    if (score >= 75) return "Alto potencial viral";
    if (score >= 50) return "Potencial medio";
    return "Necesita mejoras";
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Editor */}
      <div className="relative">
        <Textarea
          name="prompt"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[150px] pr-12 resize-none"
          disabled={loading || isListening}
        />

        {/* Voice Input Button */}
        {speechSupported && (
          <button
            onClick={toggleVoiceInput}
            type="button"
            disabled={loading}
            className={cn(
              "absolute right-3 top-3 p-2 rounded-lg transition-colors",
              isListening
                ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900 dark:text-red-300"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            )}
            title={isListening ? "Detener grabación" : "Iniciar reconocimiento de voz"}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onGenerate} disabled={loading || !value.trim()} className="flex-shrink-0">
          <Sparkles className="w-4 h-4 mr-2" />
          {loading ? "Generando..." : "Generar"}
        </Button>

        {onRegenerate && value && (
          <Button
            onClick={onRegenerate}
            variant="secondary"
            disabled={loading}
            className="flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerar
          </Button>
        )}

        {value && (
          <>
            <Button onClick={handleCopy} variant="secondary" className="flex-shrink-0 px-4 py-2 text-xs">
              <Copy className="w-4 h-4 mr-1" />
              Copiar
            </Button>

            {onSave && (
              <Button
                onClick={handleSave}
                variant="secondary"
                disabled={loading}
                className="flex-shrink-0 px-4 py-2 text-xs"
              >
                {saved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Guardado
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    Guardar
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Viral Score Badge */}
      {viralScore !== undefined && viralScore > 0 && (
        <div
          className={cn(
            "flex items-center gap-3 p-4 rounded-lg border",
            viralScore >= 75
              ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
              : viralScore >= 50
                ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
                : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
          )}
        >
          <TrendingUp className={cn("w-6 h-6", getScoreColor(viralScore))} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Viral Score
              </span>
              <span className={cn("text-2xl font-bold", getScoreColor(viralScore))}>
                {viralScore.toFixed(0)}/100
              </span>
            </div>
            <p className={cn("text-xs", getScoreColor(viralScore))}>
              {getScoreLabel(viralScore)}
            </p>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Recomendaciones de IA
              </h4>
              <ul className="space-y-1">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Voice Input Status */}
      {isListening && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          Grabando... Habla claramente
        </div>
      )}
    </div>
  );
}
