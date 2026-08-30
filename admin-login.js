// POST /api/admin-login
// { password: string } を受け取り、環境変数 ADMIN_PASSWORD と比較する簡易認証。
// 成功しても長期セッションは発行せず、フロント側で一時的に保持したパスワードを
// 以後の /api/save 呼び出しに毎回添付してもらう方式（シンプルさ優先）。

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ADMIN_PASSWORD) {
    return jsonResponse({ ok: false, error: "サーバー側に ADMIN_PASSWORD が設定されていません。" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "リクエストの形式が正しくありません。" }, 400);
  }

  const { password } = body || {};

  if (typeof password !== "string" || password.length === 0) {
    return jsonResponse({ ok: false, error: "パスワードを入力してください。" }, 400);
  }

  if (!timingSafeEqual(password, env.ADMIN_PASSWORD)) {
    return jsonResponse({ ok: false, error: "パスワードが違います。" }, 401);
  }

  return jsonResponse({ ok: true });
}

// 簡易的なタイミング攻撃対策付き文字列比較
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
