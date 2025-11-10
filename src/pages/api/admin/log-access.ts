import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { action, metadata } = req.body as {
      action?: string;
      metadata?: Record<string, unknown>;
    };

    if (!action) {
      return res.status(400).json({ error: "Action is required" });
    }

    const { error: insertError } = await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action,
      details: {
        ...(metadata ?? {}),
        route: metadata?.route ?? req.headers.referer ?? null,
        user_agent: req.headers["user-agent"],
        ip_address: (req.headers["x-forwarded-for"] as string) ?? req.socket.remoteAddress,
      },
    });

    if (insertError) {
      logger.error("[admin/log-access] Failed to insert audit log:", insertError);
      return res.status(500).json({ error: "Failed to register access log" });
    }

    return res.status(201).json({ success: true });
  } catch (error) {
    logger.error("[admin/log-access] Unexpected error:", error);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
