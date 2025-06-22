export function buildProjectUpdateSlackMessage(
    projectUpdate: {
        body: string;
        createdAt: string;
        health: "onTrack" | "atRisk" | "offTrack" | string;
        updateUrl: string;
        project: { name: string; url: string };
        user: { name: string; url: string; avatarUrl?: string };
        initiatives: Array<{
            id: string;
            name: string;
            state: { name: string };
        }>;
    },
) {
    const { body, createdAt, health, updateUrl, project, user } = projectUpdate;

    const healthMap: Record<"onTrack" | "atRisk" | "offTrack", string> = {
        onTrack: "🟢 On track",
        atRisk: "🟡 At risk",
        offTrack: "🔴 Off track",
    };

    const healthLabel = healthMap[health as keyof typeof healthMap] ??
        "🟣 Unknown";

    const initiativeList = projectUpdate.initiatives
        ?.map((i) => `*${i.name}*`)
        .join(", ");

    // Replace image markdown with 📎 links
    let attachmentCount = 0;
    const bodyWithSlackLinks = body.replace(
        /!\[.*?\]\((https:\/\/uploads\.linear\.app\/.*?)\)/g,
        (_, url) => {
            attachmentCount++;
            return `📎 <${url}|Attachment ${attachmentCount}>`;
        },
    );

    const blocks: any[] = [];

    blocks.push({
        type: "section",
        text: {
            type: "mrkdwn",
            text: `*<${project.url}|${project.name}>*`,
        },
    });

    blocks.push({
        type: "section",
        text: {
            type: "mrkdwn",
            text:
                `${healthLabel} | <${user.url}|${user.name}> posted a project update`,
        },
    });

    if (initiativeList) {
        blocks.push({
            type: "context",
            elements: [
                {
                    type: "mrkdwn",
                    text: `🏷️ Initiatives: ${initiativeList}`,
                },
            ],
        });
    }

    if (bodyWithSlackLinks) {
        blocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: bodyWithSlackLinks,
            },
        });
    }

    blocks.push({
        type: "actions",
        elements: [
            {
                type: "button",
                text: {
                    type: "plain_text",
                    text: "Open in Linear",
                    emoji: true,
                },
                url: updateUrl,
                action_id: "open_linear",
            },
        ],
    });

    blocks.push({
        type: "context",
        elements: [
            {
                type: "image",
                image_url: user.avatarUrl ?? "https://via.placeholder.com/48",
                alt_text: user.name,
            },
            {
                type: "mrkdwn",
                text: `Posted at ${
                    new Date(createdAt).toLocaleString("en-US", {
                        timeZone: "PST",
                    })
                }`,
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
