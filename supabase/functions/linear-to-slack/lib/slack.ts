export function buildSlackMessage({
    actor,
    createdAt,
    body,
    project,
    updateUrl,
    initiatives,
}: {
    actor: any;
    createdAt: string;
    body: string;
    project: any;
    updateUrl: string;
    initiatives: { nodes: Array<{ name: string }> };
}) {
    const initiativeLabels = initiatives?.nodes
        ?.map((i) => `*${i.name}*`)
        .join(", ");

    const blocks: any[] = [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text:
                    `*New update for <${project.url}|${project.name}>*:\n\n${body}\n\n<${updateUrl}|View update →>`,
            },
        },
    ];

    if (initiativeLabels) {
        blocks.push({
            type: "context",
            elements: [
                {
                    type: "mrkdwn",
                    text: `🏷️ Initiatives: ${initiativeLabels}`,
                },
            ],
        });
    }

    blocks.push({
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
                    new Date(
                        createdAt,
                    ).toLocaleString("en-US", { timeZone: "PST" })
                } PST`,
            },
        ],
    });

    return { blocks };
}

export async function sendSlackNotification(message: any, webhookUrl: string) {
    const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
    });

    if (!res.ok) {
        console.error("Slack error:", await res.text());
        throw new Error("Failed to post to Slack");
    }
}
