import { useState } from "react";
import { Sliders, Info } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip-legacy";

type ContentControlsProps = {
  tone: string;
  onToneChange: (tone: string) => void;
  formality: number;
  onFormalityChange: (formality: number) => void;
  length: number;
  onLengthChange: (length: number) => void;
  className?: string;
};

const TONE_PRESETS = [
  { value: "professional", label: "Profesional", emoji: "👔" },
  { value: "casual", label: "Casual", emoji: "😊" },
  { value: "inspirational", label: "Inspirador", emoji: "✨" },
  { value: "educational", label: "Educativo", emoji: "📚" },
  { value: "humorous", label: "Humorístico", emoji: "😄" },
  { value: "authoritative", label: "Autoritario", emoji: "🎯" },
];

export function ContentControls({
  tone,
  onToneChange,
  formality,
  onFormalityChange,
  length,
  onLengthChange,
  className = "",
}: ContentControlsProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <Sliders className="w-4 h-4" />
        {expanded ? "Ocultar" : "Mostrar"} controles avanzados
      </button>

      {/* Controls Panel */}
      {expanded && (
        <div className="space-y-6 p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          {/* Tone Selector */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Tono del Contenido
              </label>
              <Tooltip content="Selecciona el tono que mejor se adapte a tu audiencia y mensaje" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TONE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => onToneChange(preset.value)}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    tone === preset.value
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700"
                  }`}
                >
                  <span className="mr-2">{preset.emoji}</span>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Formality Slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nivel de Formalidad
                </label>
                <Tooltip content="Ajusta qué tan formal o informal será el lenguaje del contenido" />
              </div>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {formality}%
              </span>
            </div>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={formality}
                onChange={(e) => onFormalityChange(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${formality}%, #e2e8f0 ${formality}%, #e2e8f0 100%)`,
                }}
              />
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Informal 🤙</span>
                <span>Formal 🎩</span>
              </div>
            </div>
          </div>

          {/* Length Slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Longitud del Post
                </label>
                <Tooltip content="Define aproximadamente cuántas palabras tendrá tu post" />
              </div>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                ~{length} palabras
              </span>
            </div>
            <div className="space-y-2">
              <input
                type="range"
                min="50"
                max="500"
                step="50"
                value={length}
                onChange={(e) => onLengthChange(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((length - 50) / 450) * 100}%, #e2e8f0 ${((length - 50) / 450) * 100}%, #e2e8f0 100%)`,
                }}
              />
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Corto 📝</span>
                <span>Medio 📄</span>
                <span>Largo 📚</span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">Estos controles personalizan tu contenido</p>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                La IA generará contenido basándose en estas preferencias. Puedes cambiarlas
                en cualquier momento para adaptar el estilo a tu audiencia.
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          background: #2563eb;
          transform: scale(1.1);
        }

        input[type="range"]::-moz-range-thumb:hover {
          background: #2563eb;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}
