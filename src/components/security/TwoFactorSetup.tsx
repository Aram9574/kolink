"use client";

import { useState } from "react";
import { Shield, Key, Copy, CheckCircle, AlertTriangle } from "lucide-react";
import Button from "@/components/Button";
import { supabaseClient } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import QRCode from "qrcode";

interface TwoFactorSetupProps {
  onComplete?: () => void;
}

export function TwoFactorSetup({ onComplete }: TwoFactorSetupProps) {
  const [step, setStep] = useState<"intro" | "scan" | "verify" | "complete">("intro");
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrCodeData, setQrCodeData] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const startSetup = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (!session) {
        toast.error("No estás autenticado");
        return;
      }

      const response = await fetch("/api/security/2fa/setup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setSecret(result.data.secret);
        setQrCodeUrl(result.data.qrCodeUrl);
        setBackupCodes(result.data.backupCodes);

        // Generate QR code image
        const qrDataUrl = await QRCode.toDataURL(result.data.qrCodeUrl, {
          width: 300,
          margin: 2,
        });
        setQrCodeData(qrDataUrl);

        setStep("scan");
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Failed to setup 2FA:", error);
      toast.error("Error al configurar 2FA");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Ingresa un código de 6 dígitos");
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (!session) {
        toast.error("No estás autenticado");
        return;
      }

      const response = await fetch("/api/security/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          code: verificationCode,
          isSetup: true,
        }),
      });

      const result = await response.json();

      if (result.success && result.verified) {
        toast.success("2FA activado exitosamente");
        setStep("complete");
      } else {
        toast.error(result.error || "Código inválido");
      }
    } catch (error) {
      console.error("Failed to verify code:", error);
      toast.error("Error al verificar el código");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: "secret" | "codes") => {
    navigator.clipboard.writeText(text);

    if (type === "secret") {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }

    toast.success("Copiado al portapapeles");
  };

  const downloadBackupCodes = () => {
    const text = `KOLINK - Códigos de respaldo 2FA\n\nGuarda estos códigos en un lugar seguro. Cada código solo puede usarse una vez.\n\n${backupCodes.join("\n")}\n\nFecha de generación: ${new Date().toLocaleString()}`;

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kolink-2fa-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Códigos descargados");
  };

  return (
    <div className="space-y-6">
      {/* Intro step */}
      {step === "intro" && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">
              Autenticación de dos factores
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Agrega una capa adicional de seguridad a tu cuenta
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50 p-6">
            <h4 className="font-semibold text-blue-900">¿Cómo funciona?</h4>
            <ol className="space-y-3 text-sm text-blue-800">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-900">
                  1
                </span>
                <span>Escanea un código QR con tu aplicación de autenticación</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-900">
                  2
                </span>
                <span>La app genera códigos de 6 dígitos que cambian cada 30 segundos</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-900">
                  3
                </span>
                <span>Ingresa el código junto con tu contraseña al iniciar sesión</span>
              </li>
            </ol>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h4 className="font-semibold text-slate-900">Apps recomendadas</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Google Authenticator
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Microsoft Authenticator
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Authy
              </li>
            </ul>
          </div>

          <Button onClick={startSetup} disabled={loading} className="w-full py-3">
            {loading ? "Configurando..." : "Comenzar configuración"}
          </Button>
        </div>
      )}

      {/* Scan QR code step */}
      {step === "scan" && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-slate-900">Escanea el código QR</h3>
            <p className="mt-2 text-sm text-slate-600">
              Usa tu aplicación de autenticación para escanear este código
            </p>
          </div>

          {/* QR Code */}
          {qrCodeData && (
            <div className="flex justify-center">
              <div className="rounded-2xl border-4 border-slate-200 bg-white p-4">
                <img src={qrCodeData} alt="QR Code" className="h-64 w-64" />
              </div>
            </div>
          )}

          {/* Manual entry */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-semibold text-slate-900">¿No puedes escanear?</p>
            <p className="mt-2 text-xs text-slate-600">Ingresa este código manualmente:</p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900">
                {secret}
              </code>
              <button
                onClick={() => copyToClipboard(secret, "secret")}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              >
                {copiedSecret ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button onClick={() => setStep("verify")} className="w-full py-3">
            Continuar
          </Button>
        </div>
      )}

      {/* Verify code step */}
      {step === "verify" && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Key className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Verifica el código</h3>
            <p className="mt-2 text-sm text-slate-600">
              Ingresa el código de 6 dígitos de tu aplicación
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-2xl font-mono tracking-widest text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />

            <Button onClick={verifyCode} disabled={loading || verificationCode.length !== 6} className="w-full py-3">
              {loading ? "Verificando..." : "Verificar y activar"}
            </Button>

            <button
              onClick={() => setStep("scan")}
              className="w-full text-center text-sm text-slate-600 transition hover:text-slate-900"
            >
              Volver al código QR
            </button>
          </div>
        </div>
      )}

      {/* Complete step */}
      {step === "complete" && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">¡2FA activado!</h3>
            <p className="mt-2 text-sm text-slate-600">
              Tu cuenta ahora está protegida con autenticación de dos factores
            </p>
          </div>

          {/* Backup codes */}
          <div className="space-y-4 rounded-2xl border border-orange-200 bg-orange-50 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-orange-600" />
              <div>
                <h4 className="font-semibold text-orange-900">Códigos de respaldo</h4>
                <p className="mt-1 text-sm text-orange-800">
                  Guarda estos códigos en un lugar seguro. Puedes usarlos para acceder a tu cuenta si pierdes acceso
                  a tu aplicación de autenticación.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <code key={index} className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-center font-mono text-sm text-slate-900">
                  {code}
                </code>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(backupCodes.join("\n"), "codes")}
                className="flex-1"
              >
                {copiedCodes ? <CheckCircle className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copiar códigos
              </Button>
              <Button variant="outline" onClick={downloadBackupCodes} className="flex-1">
                Descargar
              </Button>
            </div>
          </div>

          <Button
            onClick={() => {
              setStep("intro");
              onComplete?.();
            }}
            className="w-full py-3"
          >
            Finalizar
          </Button>
        </div>
      )}
    </div>
  );
}
