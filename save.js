// POST /api/save
// { password: string, gender: "boy" | "girl" } を受け取り、
// パスワードを検証したうえで Cloudflare KV に性別を保存する。

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ADMIN_PASSWORD) {
    return jsonResponse({ ok: false, error: "サーバー側に ADMIN_PASSWORD が設定されていません。" }, 500);
  }
  if (!env.GENDER_KV) {
    return jsonResponse({ ok: false, error: "KV binding (GENDER_KV) が設定されていません。" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "リクエストの形式が正しくありません。" }, 400);
  }

  const { password, gender } = body || {};

  if (typeof password !== "string" || !timingSafeEqual(password, env.ADMIN_PASSWORD)) {
    return jsonResponse({ ok: false, error: "パスワードが違います。" }, 401);
  }

  if (gender !== "boy" && gender !== "girl") {
    return jsonResponse({ ok: false, error: "性別は boy または girl を指定してください。" }, 400);
  }

  await env.GENDER_KV.put("gender", gender);

  return jsonResponse({ ok: true, gender });
}

function timingSafeEqual(a, b) {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}
