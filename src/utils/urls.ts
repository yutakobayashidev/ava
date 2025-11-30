/**
 * URLにクエリパラメータをシリアライズして追加する
 * @param base ベースURL（origin）
 * @param path パス
 * @param params クエリパラメータ
 * @returns 完全なURL文字列
 */
export function serializeSearchParams(
  base: string,
  path: string,
  params: Record<string, string>,
): string {
  const url = new URL(path, base);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

/**
 * リクエストのoriginを基準にリダイレクト用URLを構築する
 * @param req リクエストオブジェクト
 * @param path パス
 * @param params クエリパラメータ
 * @returns 完全なURL文字列
 */
export function buildRedirectUrl(
  req: Request,
  path: string,
  params: Record<string, string>,
): string {
  const base = new URL(req.url).origin;
  return serializeSearchParams(base, path, params);
}
