"use client";

import { useMemo } from "react";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";
import {
  validatePassword,
  getPasswordStrengthColor,
  getPasswordStrengthLabel,
  getPasswordStrengthProgress,
} from "@/lib/security/passwordValidation";

interface PasswordStrengthIndicatorProps {
  password: string;
  showFeedback?: boolean;
  className?: string;
}

export function PasswordStrengthIndicator({
  password,
  showFeedback = true,
  className = "",
}: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => {
    if (!password) return null;
    return validatePassword(password);
  }, [password]);

  if (!password || !strength) {
    return null;
  }

  const progress = getPasswordStrengthProgress(strength.score);
  const colorClass = getPasswordStrengthColor(strength.strength);
  const label = getPasswordStrengthLabel(strength.strength);

  // Progress bar color based on strength
  let progressColor = "bg-red-500";
  if (strength.score >= 5) progressColor = "bg-green-600";
  else if (strength.score >= 4) progressColor = "bg-green-500";
  else if (strength.score >= 3) progressColor = "bg-yellow-500";
  else if (strength.score >= 2) progressColor = "bg-orange-500";

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Fortaleza de la contraseña</span>
          <span className={`font-semibold ${strength.isValid ? "text-green-600" : "text-slate-500"}`}>
            {label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full transition-all duration-300 ${progressColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Feedback messages */}
      {showFeedback && (
        <div className="space-y-2">
          {strength.feedback.length > 0 && (
            <div className={`rounded-xl border p-3 ${colorClass}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="space-y-1">
                  {strength.feedback.map((message, index) => (
                    <p key={index} className="text-xs font-medium">
                      {message}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {strength.isValid && (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-green-700">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-xs font-medium">Contraseña segura y válida</p>
            </div>
          )}
        </div>
      )}

      {/* Security tips */}
      {!strength.isValid && showFeedback && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
          <div className="flex items-start gap-2">
            <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-blue-900">Consejos de seguridad:</p>
              <ul className="ml-4 list-disc space-y-0.5 text-xs text-blue-700">
                <li>Usa una combinación de mayúsculas y minúsculas</li>
                <li>Incluye números y caracteres especiales</li>
                <li>Evita palabras comunes o secuencias</li>
                <li>Usa al menos 12 caracteres para mayor seguridad</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
