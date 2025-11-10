"use client";

import { logger } from '@/lib/logger';
import { useState, useEffect, useRef, type ChangeEvent } from "react";
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
import Loader from "@/components/Loader";

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
  language?: 'es-ES' | 'en-US' | 'pt-BR';
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

// Language placeholders
const LANGUAGE_PLACEHOLDERS = {
  'es-ES': 'Escribe tu prompt o usa el micrófono...',
  'en-US': 'Write your prompt or use the microphone...',
  'pt-BR': 'Escreva seu prompt ou use o microfone...',
};

const LANGUAGE_LABELS = {
  'es-ES': {
    generating: 'Generando...',
    generate: 'Generar',
    regenerate: 'Regenerar',
    copy: 'Copiar',
    save: 'Guardar',
    saved: 'Guardado',
    listening: 'Grabando... Habla claramente',
    stopRecording: 'Detener grabación',
    startRecording: 'Iniciar reconocimiento de voz',
  },
  'en-US': {
    generating: 'Generating...',
    generate: 'Generate',
    regenerate: 'Regenerate',
    copy: 'Copy',
    save: 'Save',
    saved: 'Saved',
    listening: 'Recording... Speak clearly',
    stopRecording: 'Stop recording',
    startRecording: 'Start voice recognition',
  },
  'pt-BR': {
    generating: 'Gerando...',
    generate: 'Gerar',
    regenerate: 'Regenerar',
    copy: 'Copiar',
    save: 'Salvar',
    saved: 'Salvo',
    listening: 'Gravando... Fale claramente',
    stopRecording: 'Parar gravação',
    startRecording: 'Iniciar reconhecimento de voz',
  },
};

export default function EditorAI({
  value,
  onChange,
  onGenerate,
  onRegenerate,
  onSave,
  loading = false,
  viralScore,
  recommendations = [],
  placeholder,
  className,
  language = 'es-ES',
}: EditorAIProps) {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPromptValidation, setShowPromptValidation] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const valueRef = useRef(value);

  const labels = LANGUAGE_LABELS[language];
  const defaultPlaceholder = placeholder || LANGUAGE_PLACEHOLDERS[language];

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    // Check if speech recognition is supported
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setSpeechSupported(false);
      recognitionRef.current = null;
      return;
    }

    setSpeechSupported(true);
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";

      for (let i = event.results.length - 1; i >= 0; i--) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript = transcript;
        }
      }

      if (finalTranscript) {
        const currentValue = valueRef.current ?? "";
        const separator = currentValue.trim().length > 0 ? " " : "";
        onChange(`${currentValue}${separator}${finalTranscript}`);
      }
    };

    recognition.onerror = (event) => {
      logger.error("Speech recognition error:", event);
      setIsListening(false);
      toast.error(language === 'es-ES' ? "Error en reconocimiento de voz" : language === 'en-US' ? "Voice recognition error" : "Erro no reconhecimento de voz");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [language, onChange]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error(language === 'es-ES' ? "Reconocimiento de voz no disponible" : language === 'en-US' ? "Voice recognition unavailable" : "Reconhecimento de voz indisponível");
      return;
    }

    try {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
        toast.success(
          language === 'es-ES'
            ? "Reconocimiento de voz detenido"
            : language === 'en-US'
              ? "Voice recognition stopped"
              : "Reconhecimento de voz parado"
        );
      } else {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success(
          language === 'es-ES'
            ? "Escuchando... Habla ahora"
            : language === 'en-US'
              ? "Listening... Speak now"
              : "Ouvindo... Fale agora"
        );
      }
    } catch (error) {
      logger.error("Speech recognition toggle error:", error);
      toast.error(language === 'es-ES' ? "No se pudo iniciar el reconocimiento" : language === 'en-US' ? "Could not start recognition" : "Não foi possível iniciar o reconhecimento");
      setIsListening(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      const successMsg = language === 'es-ES' ? "Copiado al portapapeles" : language === 'en-US' ? "Copied to clipboard" : "Copiado para área de transferência";
      toast.success(successMsg);
    } catch {
      const errorMsg = language === 'es-ES' ? "Error al copiar" : language === 'en-US' ? "Error copying" : "Erro ao copiar";
      toast.error(errorMsg);
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    try {
      await onSave(value);
      setSaved(true);
      const successMsg = language === 'es-ES' ? "Guardado exitosamente" : language === 'en-US' ? "Saved successfully" : "Salvo com sucesso";
      toast.success(successMsg);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      const errorMsg = language === 'es-ES' ? "Error al guardar" : language === 'en-US' ? "Error saving" : "Erro ao salvar";
      toast.error(errorMsg);
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

  const handleGenerateClick = async () => {
    if (loading) {
      return;
    }

    if (!value.trim()) {
      setShowPromptValidation(true);
      const message =
        language === 'es-ES'
          ? "Escribe un prompt o selecciona una plantilla antes de generar"
          : language === 'en-US'
            ? "Write a prompt or choose a template before generating"
            : "Escreva um prompt ou selecione um template antes de gerar";
      toast.error(message);
      return;
    }

    try {
      await onGenerate();
    } catch (error) {
      logger.error("Generate action error:", error);
      const message =
        language === 'es-ES'
          ? "No se pudo iniciar la generación"
          : language === 'en-US'
            ? "Generation failed to start"
            : "Não foi possível iniciar a geração";
      toast.error(message);
    }
  };

  const handlePromptChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (showPromptValidation) {
      setShowPromptValidation(false);
    }
    onChange(event.target.value);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Editor */}
      <div className="space-y-2">
        <div className="relative">
          <Textarea
            name="prompt"
            value={value}
            onChange={handlePromptChange}
            placeholder={defaultPlaceholder}
            className="min-h-[200px] md:min-h-[150px] pr-14 md:pr-12 resize-none text-base"
            disabled={loading || isListening}
          />

          {/* Voice Input Button */}
          {speechSupported ? (
            <button
              onClick={toggleVoiceInput}
              type="button"
              disabled={loading}
              className={cn(
                "absolute right-3 top-3 p-3 md:p-2 rounded-lg transition-colors min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0 flex items-center justify-center",
                isListening
                  ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900 dark:text-red-300"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              )}
              title={isListening ? labels.stopRecording : labels.startRecording}
              aria-pressed={isListening}
            >
              {isListening ? <MicOff className="w-6 h-6 md:w-5 md:h-5" /> : <Mic className="w-6 h-6 md:w-5 md:h-5" />}
            </button>
          ) : (
            <div className="absolute right-3 top-3 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-300">
              {language === 'es-ES'
                ? "El dictado por voz no está disponible en este navegador"
                : language === 'en-US'
                  ? "Voice dictation is not available on this browser"
                  : "Ditado por voz indisponível neste navegador"}
            </div>
          )}
        </div>

        {showPromptValidation && !value.trim() && (
          <p className="text-sm text-red-500 dark:text-red-400">
            {language === 'es-ES'
              ? "Escribe un prompt o selecciona una plantilla antes de generar."
              : language === 'en-US'
                ? "Write a prompt or choose a template before generating."
                : "Escreva um prompt ou selecione um template antes de gerar."}
          </p>
        )}
      </div>

      {speechSupported && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
          <span
            className={cn(
              "inline-flex h-2.5 w-2.5 rounded-full transition",
              isListening ? "bg-red-500 animate-pulse" : "bg-gray-400"
            )}
            aria-hidden="true"
          />
          <span aria-live="polite">
            {isListening ? labels.listening : labels.startRecording}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleGenerateClick} disabled={loading} className="flex-shrink-0 min-h-[48px] text-base md:text-sm">
          {loading ? (
            <>
              <Loader size={18} className="mr-2 border-t-white" />
              {labels.generating}
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 md:w-4 md:h-4 mr-2" />
              {labels.generate}
            </>
          )}
        </Button>

        {onRegenerate && value && (
          <Button
            onClick={onRegenerate}
            variant="secondary"
            disabled={loading}
            className="flex-shrink-0 min-h-[48px] text-base md:text-sm"
          >
            <RefreshCw className="w-5 h-5 md:w-4 md:h-4 mr-2" />
            {labels.regenerate}
          </Button>
        )}

        {value && (
          <>
            <Button onClick={handleCopy} variant="secondary" className="flex-shrink-0 px-5 py-3 md:px-4 md:py-2 text-sm md:text-xs min-h-[48px] md:min-h-0">
              <Copy className="w-4 h-4 md:w-4 md:h-4 mr-2 md:mr-1" />
              {labels.copy}
            </Button>

            {onSave && (
              <Button
                onClick={handleSave}
                variant="secondary"
                disabled={loading}
                className="flex-shrink-0 px-5 py-3 md:px-4 md:py-2 text-sm md:text-xs min-h-[48px] md:min-h-0"
              >
                {saved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 md:w-4 md:h-4 mr-2 md:mr-1" />
                    {labels.saved}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 md:w-4 md:h-4 mr-2 md:mr-1" />
                    {labels.save}
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Viral Score Badge with Progress Circle */}
      {viralScore !== undefined && viralScore > 0 && (
        <div
          className={cn(
            "flex items-center gap-4 md:gap-4 p-6 md:p-5 rounded-xl border-2",
            viralScore >= 75
              ? "bg-gradient-to-br from-green-50 to-green-100 border-green-300 dark:from-green-900/20 dark:to-green-800/20 dark:border-green-700"
              : viralScore >= 50
                ? "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300 dark:from-yellow-900/20 dark:to-yellow-800/20 dark:border-yellow-700"
                : "bg-gradient-to-br from-red-50 to-red-100 border-red-300 dark:from-red-900/20 dark:to-red-800/20 dark:border-red-700"
          )}
        >
          {/* Circular Progress Gauge */}
          <div className="relative flex items-center justify-center w-24 h-24 md:w-20 md:h-20 flex-shrink-0">
            {/* Background Circle */}
            <svg className="transform -rotate-90 w-24 h-24 md:w-20 md:h-20">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="7"
                fill="none"
                className="text-gray-200 dark:text-gray-700 md:hidden"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-gray-200 dark:text-gray-700 hidden md:block"
              />
              {/* Progress Circle */}
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="7"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - viralScore / 100)}`}
                className={cn(
                  "transition-all duration-1000 ease-out md:hidden",
                  viralScore >= 75
                    ? "text-green-500 dark:text-green-400"
                    : viralScore >= 50
                      ? "text-yellow-500 dark:text-yellow-400"
                      : "text-red-500 dark:text-red-400"
                )}
                strokeLinecap="round"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - viralScore / 100)}`}
                className={cn(
                  "transition-all duration-1000 ease-out hidden md:block",
                  viralScore >= 75
                    ? "text-green-500 dark:text-green-400"
                    : viralScore >= 50
                      ? "text-yellow-500 dark:text-yellow-400"
                      : "text-red-500 dark:text-red-400"
                )}
                strokeLinecap="round"
              />
            </svg>
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-2xl md:text-xl font-bold", getScoreColor(viralScore))}>
                {viralScore.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Text Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 md:mb-1">
              <TrendingUp className={cn("w-6 h-6 md:w-5 md:h-5", getScoreColor(viralScore))} />
              <span className="text-base md:text-sm font-semibold text-gray-800 dark:text-gray-200">
                Viral Score
              </span>
              {/* Tooltip info icon */}
              <button
                type="button"
                className="group relative"
                aria-label="Información sobre Viral Score"
              >
                <AlertCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10">
                  <p className="font-medium mb-1">¿Qué es el Viral Score?</p>
                  <p className="text-gray-300">
                    Métrica que predice el potencial de engagement de tu post basado en estructura,
                    emociones, storytelling y claridad. Mayor score = mayor probabilidad de viralidad.
                  </p>
                  <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                </div>
              </button>
            </div>
            <p className={cn("text-sm md:text-xs font-medium mb-2 md:mb-1", getScoreColor(viralScore))}>
              {getScoreLabel(viralScore)}
            </p>
            {/* Progress Bar Alternative */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 md:h-2 overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-1000 ease-out rounded-full",
                  viralScore >= 75
                    ? "bg-green-500 dark:bg-green-400"
                    : viralScore >= 50
                      ? "bg-yellow-500 dark:bg-yellow-400"
                      : "bg-red-500 dark:bg-red-400"
                )}
                style={{ width: `${viralScore}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations with Tooltips */}
      {recommendations.length > 0 && (
        <div className="p-6 md:p-5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-4 md:gap-3">
            <div className="flex-shrink-0 w-12 h-12 md:w-10 md:h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
              <Sparkles className="w-6 h-6 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4 md:mb-3">
                <h4 className="text-base md:text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Recomendaciones de IA
                </h4>
                {/* Tooltip for Recommendations */}
                <button
                  type="button"
                  className="group relative"
                  aria-label="Información sobre Recomendaciones"
                >
                  <AlertCircle className="w-4 h-4 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10">
                    <p className="font-medium mb-1">Cómo usar estas recomendaciones</p>
                    <p className="text-gray-300">
                      Nuestra IA analiza tu contenido y sugiere mejoras específicas basadas en patrones de posts
                      virales. Implementar estas recomendaciones puede aumentar tu engagement hasta un 40%.
                    </p>
                    <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                  </div>
                </button>
              </div>
              <ul className="space-y-3 md:space-y-2">
                {recommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 md:gap-2 p-3 md:p-2 rounded-lg bg-white/50 dark:bg-blue-950/30 hover:bg-white dark:hover:bg-blue-950/50 transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5 md:w-4 md:h-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm md:text-xs text-blue-900 dark:text-blue-100 font-medium">{rec}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 md:mt-3 pt-4 md:pt-3 border-t border-blue-200 dark:border-blue-700">
                <p className="text-sm md:text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2 md:gap-1">
                  <TrendingUp className="w-4 h-4 md:w-3 md:h-3" />
                  Implementar estas sugerencias puede mejorar tu viral score
                </p>
              </div>
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
          {labels.listening}
        </div>
      )}
    </div>
  );
}
