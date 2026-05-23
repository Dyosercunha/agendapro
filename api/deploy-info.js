export default function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ ok: false, error: "Metodo nao permitido." });
  }

  return response.status(200).json({
    ok: true,
    environment: process.env.VERCEL_ENV || "local",
    project: process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "",
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA || "",
    commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || "",
    branch: process.env.VERCEL_GIT_COMMIT_REF || "",
    provider: "vercel",
    checkedAt: new Date().toISOString(),
  });
}
