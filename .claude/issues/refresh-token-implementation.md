---
name: 新機能追加・改善
about: OAuth 2.1のrefresh token機能を実装
title: "OAuth 2.1のrefresh token機能を実装"
labels: "enhancement"
assignees: ""
---

## 概要

OAuth 2.1のrefresh token機能を実装し、アクセストークンの有効期限切れ時に再認証なしでトークンを更新できるようにする。

## 背景・目的

- 現在はアクセストークンが期限切れになると再度OAuth認証フローを実行する必要がある
- MCPクライアントの利用体験を向上させるため、refresh tokenによる自動トークン更新機能が必要
- セキュリティを保ちつつ、ユーザーが長期間シームレスにMCPサーバーを利用できるようにする
- OAuth 2.1のベストプラクティスに準拠する

## 完了条件

### データベース設計

- `refresh_tokens` テーブルをマイグレーションで追加
  - `id`, `token_hash`, `client_id`, `user_id`, `expires_at`, `created_at`, `used_at` などのカラム
  - アクセストークンとの関連付け

### トークンエンドポイントの拡張

- `/api/oauth/token` エンドポイントで `grant_type=refresh_token` をサポート
- リクエストパラメータ: `refresh_token`, `client_id`
- レスポンス: 新しい `access_token` と `refresh_token` のペア

### トークン発行ロジック

- 認可コード交換時（`grant_type=authorization_code`）にアクセストークンと共にrefresh tokenを発行
- refresh tokenはハッシュ化してDBに保存（セキュリティ対策）
- アクセストークンにrefresh tokenとの関連を持たせる

### Refresh tokenローテーション

- refresh token使用時に、古いrefresh tokenを無効化し、新しいrefresh tokenを発行
- 使用済みrefresh tokenの再利用を検知し、関連するすべてのトークンを無効化（セキュリティ対策）

### 有効期限管理

- refresh tokenの有効期限を設定（推奨: 30日間）
- 期限切れrefresh tokenの利用を拒否
- 定期的な期限切れトークンのクリーンアップ処理（オプション）

### セキュリティ考慮事項

- 使用済みトークンの `used_at` タイムスタンプ記録
- トークンローテーションによるリプレイ攻撃対策
- クライアント認証の確認（PKCE対応クライアントの場合）

### テスト

- refresh tokenの正常発行・更新フローのテスト
- 期限切れrefresh tokenの拒否テスト
- 使用済みrefresh tokenの再利用検知テスト
- 無効なclient_idでのrefresh token利用の拒否テスト

## 参考情報・補足

- [OAuth 2.1 Draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-11)
- [RFC 6749 - Refresh Token](https://datatracker.ietf.org/doc/html/rfc6749#section-6)
- 現在の実装: `src/app/api/oauth/token/route.ts`
- 現在のDB schema: `drizzle/schema.ts`
