// GET /api/gender
// 公開画面（/reveal）が現在登録されている性別を取得するためのエンドポイント。
// パスワードなどの機密情報は一切扱わない。

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.GENDER_KV) {
    return jsonResponse({ error: "KV binding (GENDER_KV) が設定されていません。" }, 500);
  }

  const gender = await env.GENDER_KV.get("gender");

  return jsonResponse({ gender: gender || null });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // 常に最新の性別データを取得できるようキャッシュしない
      "cache-control": "no-store, max-age=0",
    },
  });
}
