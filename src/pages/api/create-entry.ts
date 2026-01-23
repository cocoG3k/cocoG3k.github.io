import { isAuthorized } from "../../lib/adminAuth";

export const prerender = false;

type EntryPayload = {
  title: string;
  description: string;
  date: string;
  tags?: string[];
  body: string;
  slug?: string;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const jsonResponse = (status: number, data: Record<string, unknown>) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const getRequiredEnv = (name: string) => {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value as string;
};

const buildFrontmatter = (payload: EntryPayload) => {
  const safeTitle = JSON.stringify(payload.title.trim());
  const safeDescription = JSON.stringify(payload.description.trim());
  const date = payload.date.trim();
  const tagList = (payload.tags ?? []).filter((tag) => tag.trim());

  const lines = [
    "---",
    `title: ${safeTitle}`,
    `description: ${safeDescription}`,
    `date: ${date}`,
  ];

  if (tagList.length > 0) {
    lines.push("tags:");
    for (const tag of tagList) {
      lines.push(`  - ${tag}`);
    }
  }

  lines.push("---", "", payload.body.trim(), "");
  return lines.join("\n");
};

export async function POST({ request }: { request: Request }) {
  let payload: EntryPayload;

  try {
    payload = (await request.json()) as EntryPayload;
  } catch {
    return jsonResponse(400, { message: "Invalid JSON payload." });
  }

  try {
    if (!isAuthorized(request)) {
      return jsonResponse(401, { message: "Unauthorized." });
    }

    if (!payload.title || !payload.description || !payload.date || !payload.body) {
      return jsonResponse(400, { message: "必須項目が不足しています。" });
    }

    const dateValue = new Date(payload.date);
    if (Number.isNaN(dateValue.getTime())) {
      return jsonResponse(400, { message: "日付が正しくありません。" });
    }

    const rawSlug = payload.slug?.trim() || payload.title.trim();
    const slugBase = slugify(rawSlug) || slugify(payload.title) || dateValue.toISOString().slice(0, 10);
    const resolvedSlug = slugBase;

    if (!resolvedSlug) {
      return jsonResponse(400, { message: "スラッグを生成できませんでした。" });
    }

    const owner = getRequiredEnv("GITHUB_OWNER");
    const repo = getRequiredEnv("GITHUB_REPO");
    const token = getRequiredEnv("GITHUB_TOKEN");
    const branch = import.meta.env.GITHUB_BRANCH || "main";
    const filePath = `src/content/diary/${resolvedSlug}.md`;
    const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    const commonHeaders = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const existingResponse = await fetch(`${apiBase}?ref=${branch}`, {
      headers: commonHeaders,
    });

    if (existingResponse.status === 200) {
      return jsonResponse(409, {
        message: "同じスラッグのエントリーがすでに存在します。",
        slug: resolvedSlug,
      });
    }

    if (existingResponse.status !== 404) {
      const errorBody = await existingResponse.text();
      return jsonResponse(502, { message: "既存チェックに失敗しました。", detail: errorBody });
    }

    const content = buildFrontmatter(payload);
    const encodedContent = Buffer.from(content).toString("base64");

    const commitResponse = await fetch(apiBase, {
      method: "PUT",
      headers: {
        ...commonHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Add diary entry ${resolvedSlug}`,
        content: encodedContent,
        branch,
      }),
    });

    if (!commitResponse.ok) {
      const errorBody = await commitResponse.text();
      return jsonResponse(502, { message: "GitHub へのコミットに失敗しました。", detail: errorBody });
    }

    return jsonResponse(201, { path: filePath, slug: resolvedSlug });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return jsonResponse(500, { message });
  }
}
