import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

/**
 * Publish to LinkedIn
 * Posts content to the user's LinkedIn profile
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { postId, content } = req.body;

    if (!content && !postId) {
      return res.status(400).json({ error: "Content or postId required" });
    }

    // Get user from auth header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user profile with LinkedIn token
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("linkedin_access_token, linkedin_token_expires_at, linkedin_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    if (!profile.linkedin_access_token || !profile.linkedin_id) {
      return res.status(400).json({ error: "LinkedIn not connected" });
    }

    // Check if token is expired
    const expiresAt = new Date(profile.linkedin_token_expires_at);
    if (expiresAt < new Date()) {
      return res.status(401).json({
        error: "LinkedIn token expired. Please reconnect your account.",
      });
    }

    // Get content from post if postId provided
    let postContent = content;
    if (postId) {
      const { data: post, error: postError } = await supabase
        .from("posts")
        .select("generated_text")
        .eq("id", postId)
        .eq("user_id", user.id)
        .single();

      if (postError || !post) {
        return res.status(404).json({ error: "Post not found" });
      }

      postContent = post.generated_text;
    }

    // Publish to LinkedIn using UGC Posts API
    const personURN = `urn:li:person:${profile.linkedin_id}`;

    const sharePayload = {
      author: personURN,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: postContent,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const publishResponse = await fetch(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${profile.linkedin_access_token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(sharePayload),
      }
    );

    if (!publishResponse.ok) {
      const errorText = await publishResponse.text();
      console.error("Failed to publish to LinkedIn:", errorText);

      if (publishResponse.status === 401) {
        return res.status(401).json({
          error: "LinkedIn token invalid. Please reconnect your account.",
        });
      }

      return res.status(500).json({
        error: "Failed to publish to LinkedIn",
        details: errorText,
      });
    }

    const publishData = await publishResponse.json();
    const linkedInPostId = publishData.id;

    // Update post in database if postId provided
    if (postId) {
      await supabase
        .from("posts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          linkedin_post_id: linkedInPostId,
        })
        .eq("id", postId)
        .eq("user_id", user.id);

      // Track behavior
      await supabase.from("user_behaviors").insert({
        user_id: user.id,
        behavior_type: "post_published",
        context: {
          post_id: postId,
          linkedin_post_id: linkedInPostId,
          platform: "linkedin",
        },
      });
    }

    return res.status(200).json({
      success: true,
      linkedin_post_id: linkedInPostId,
      message: "Published to LinkedIn successfully",
    });
  } catch (error) {
    console.error("Error publishing to LinkedIn:", error);
    return res.status(500).json({ error: "An unexpected error occurred" });
  }
}
