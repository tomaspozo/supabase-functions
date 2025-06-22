const LINEAR_API_URL = "https://api.linear.app/graphql";

export async function fetchProjectInitiatives(projectId: string) {
    const query = `
    query GetProjectInitiatives($id: String!) {
      project(id: $id) {
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
    if (!apiKey) throw new Error("Missing LINEAR_API_KEY");

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
        console.error(errors);
        throw new Error("Failed to fetch initiatives");
    }

    return data.project.initiatives.nodes;
}
