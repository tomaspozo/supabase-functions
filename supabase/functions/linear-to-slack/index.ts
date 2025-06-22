import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LINEAR_API_URL = "https://api.linear.app/graphql";

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

async function fetchProjectInitiatives(projectId: string) {
  const query = `
    query GetProjectInitiatives($id: String!) {
      project(id: $id) {
        id
        name
        initiatives {
          nodes {
            id
            name
            targetDate
            status
          }
        }
      }
    }
  `;

  const apiKey = Deno.env.get("LINEAR_API_KEY");
  if (!apiKey) {
    throw new Error("Missing LINEAR_API_KEY in environment variables");
  }

  const res = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query,
      variables: { id: projectId },
    }),
  });

  const { data, errors } = await res.json();

  if (!res.ok || errors) {
    console.error("Failed to fetch initiatives from Linear API", errors);
    throw new Error("Failed to fetch initiatives from Linear API");
  }

  return data.project.initiatives;
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

    // If SKIP_VALIDATION is set, skip validation, otherwise validate
    // timestamp and signature folowing Linear's documentation:
    // https://linear.app/developers/webhooks#securing-webhooks
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

    const initiatives = await fetchProjectInitiatives(project.id);
    const initiativeLabels = initiatives.nodes
      .map((i: any) => `*${i.name}*`)
      .join(", ");

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
        ...(initiativeLabels
          ? [
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `🏷️ Initiatives: ${initiativeLabels}`,
                },
              ],
            },
          ]
          : []),
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
