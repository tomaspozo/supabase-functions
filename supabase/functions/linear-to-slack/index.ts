import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { verifySignature } from "./lib/verifySignature.ts";
import { fetchProjectInitiatives } from "./lib/linear.ts";
import { buildSlackMessage, sendSlackNotification } from "./lib/slack.ts";

Deno.serve(async (req: Request) => {
  const WEBHOOK_SECRET = Deno.env.get("LINEAR_WEBHOOK_SECRET")!;
  const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL")!;
  const SKIP_VALIDATION = Deno.env.get("SKIP_VALIDATION")!;

  if (!WEBHOOK_SECRET || !SLACK_WEBHOOK_URL) {
    return new Response("Missing environment variables", { status: 500 });
  }

  try {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);

    if (!SKIP_VALIDATION) {
      const timestamp = payload.webhookTimestamp;
      if (Math.abs(Date.now() - timestamp) > 60_000) {
        return new Response("Timestamp too old", { status: 400 });
      }

      const signature = req.headers.get("linear-signature");
      const valid = await verifySignature(WEBHOOK_SECRET, rawBody, signature);
      if (!valid) return new Response("Invalid signature", { status: 401 });
    }

    const { actor, createdAt, data: { body, project }, url } = payload;

    const initiatives = await fetchProjectInitiatives(project.id);

    const message = buildSlackMessage({
      actor,
      createdAt,
      body,
      project,
      updateUrl: url,
      initiatives,
    });

    await sendSlackNotification(message, SLACK_WEBHOOK_URL);

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Error handling Linear webhook:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
