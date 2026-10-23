// Worker entry point: static assets, plus the contact form endpoint.
//
// The Cloudflare Workers runtime provides ExportedHandler / Fetcher
// globally, but they aren't visible to `astro check`. We define the
// minimal shapes inline so this file type-checks without pulling in
// @cloudflare/workers-types as a dependency.

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface EmailAddress {
  email: string;
  name?: string;
}

interface SendEmail {
  send(message: {
    to: string;
    from: string | EmailAddress;
    subject: string;
    text: string;
    replyTo?: string;
  }): Promise<{ messageId: string }>;
}

interface Env {
  ASSETS: Fetcher;
  EMAIL: SendEmail;
  // Secrets (wrangler secret put): the studio inbox, a verified Email
  // Routing destination, and the Turnstile widget's secret key.
  // CONTACT_ALSO (optional) is a comma-separated list of further
  // inboxes, each also a verified destination, sent their own copy.
  CONTACT_TO?: string;
  CONTACT_ALSO?: string;
  TURNSTILE_SECRET?: string;
}

interface ExportedHandler<E = unknown> {
  fetch?(request: Request, env: E): Promise<Response>;
}

const FROM: EmailAddress = { email: "form@ccspace.tw", name: "CC Space 網站" };

// Form fields, in the order they appear in the email.
const FIELDS = [
  ["name", "稱呼"],
  ["contact", "聯絡方式"],
  ["city", "地點"],
  ["type", "空間類型"],
  ["size", "坪數"],
  ["condition", "屋況"],
  ["budget", "預算"],
  ["message", "想跟我們說的話"],
] as const;
const REQUIRED = ["name", "contact", "type"];
const MAX_LENGTH = 5000;

const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string | null,
): Promise<boolean> {
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body },
  );
  const result = (await response.json()) as {
    success?: boolean;
    "error-codes"?: string[];
    hostname?: string;
  };
  if (result.success !== true) {
    console.warn("contact: turnstile rejected", result["error-codes"]);
  }
  return result.success === true;
}

async function handleContact(request: Request, env: Env): Promise<Response> {
  if (!env.CONTACT_TO || !env.TURNSTILE_SECRET) {
    return json(503, { error: "not-configured" });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: "bad-request" });
  }
  const value = (key: string): string => {
    const v = form.get(key);
    return typeof v === "string" ? v.trim().slice(0, MAX_LENGTH) : "";
  };
  if (REQUIRED.some((key) => !value(key))) {
    return json(400, { error: "missing-fields" });
  }
  const token = value("cf-turnstile-response");
  const human =
    token &&
    (await verifyTurnstile(
      token,
      env.TURNSTILE_SECRET,
      request.headers.get("CF-Connecting-IP"),
    ));
  if (!human) return json(403, { error: "turnstile" });

  const contact = value("contact");
  const text = FIELDS.map(([key, label]) => `${label}：${value(key) || "—"}`)
    .join("\n")
    .concat("\n\n—\n從 ccspace.tw 聯絡表單送出");
  const recipients = [env.CONTACT_TO, ...(env.CONTACT_ALSO ?? "").split(",")]
    .map((to) => to.trim())
    .filter(Boolean);
  const sent = await Promise.allSettled(
    recipients.map((to) =>
      env.EMAIL.send({
        to,
        from: FROM,
        subject: `網站詢問：${value("name")}（${value("type")}）`,
        text,
        // Reply goes straight to the client when they left an email.
        ...(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
          ? { replyTo: contact }
          : {}),
      }),
    ),
  );
  sent.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`contact: send ${i} failed`, result.reason);
    }
  });
  // The enquiry got through if the studio inbox has it.
  if (sent[0]?.status !== "fulfilled") {
    return json(502, { error: "send-failed" });
  }
  return json(200, { ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Only requests that match no static file reach this Worker; www ->
    // apex and HTTP -> HTTPS are Cloudflare dashboard rules.
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") {
        return new Response(null, { status: 405, headers: { Allow: "POST" } });
      }
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
