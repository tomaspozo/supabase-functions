import "jsr:@supabase/functions-js/edge-runtime.d.ts";

async function verifySignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const signature = Array.from(new Uint8Array(sigBuf)).map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");

  return signature === signatureHeader;
}

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
      const now = Date.now();
      if (Math.abs(now - timestamp) > 60_000) {
        return new Response("Timestamp too old", { status: 400 });
      }

      const signatureHeader = req.headers.get("linear-signature");
      const isValid = await verifySignature(
        WEBHOOK_SECRET,
        rawBody,
        signatureHeader,
      );
      if (!isValid) {
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const {
      actor,
      createdAt,
      data: { body, project },
      url,
    } = payload;

    const slackMessage = {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              `*New update for <${project.url}|${project.name}>*:\n\n${body}\n\n<${url}|View update →>`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "image",
              image_url: actor.avatarUrl,
              alt_text: actor.name,
            },
            {
              type: "mrkdwn",
              text: `<${actor.url}|by ${actor.name}> at ${
                new Date(createdAt).toLocaleString("en-US", {
                  timeZone: "PST",
                })
              } PST`,
            },
          ],
        },
      ],
    };

    const slackRes = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      body: JSON.stringify(slackMessage),
      headers: { "Content-Type": "application/json" },
    });

    if (!slackRes.ok) {
      return new Response("Failed to post to Slack", { status: 500 });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing Linear webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/linear-to-slack' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
