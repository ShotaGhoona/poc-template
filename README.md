# POC Template

Lovable（ノーコードAIツール）と同じ技術スタック・開発パターンを採用したPOCテンプレート。
Claude Codeと組み合わせることで、Lovableと同等のスピードと品質でPOC開発ができる。

## なぜこのテンプレートが必要か

AIでの開発は技術スタックや開発方針の選択肢がありすぎて、最適解がわかりにくい。Lovableのようなノーコードツールは内部で最適な選定が決まっているため迷わず開発できるが、料金が高額。

このテンプレートは**Lovableが実際に生成するプロジェクト2つを徹底分析**し、技術スタック・設計パターン・実装方式を全て抽出したもの。Claude Code CLIと併用することで、Lovableの開発体験を再現する。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| ビルド | Vite + SWC |
| フロントエンド | React 18 + TypeScript |
| バックエンド | Supabase（PostgreSQL + Auth + Storage） |
| UI | shadcn/ui + Radix UI + Tailwind CSS |
| サーバーステート | TanStack React Query |
| フォーム | react-hook-form + Zod |
| 通知 | sonner |
| アイコン | lucide-react |
| ダークモード | next-themes |
| テスト | Vitest + Testing Library |

## セットアップ

```bash
# 1. クローン
git clone https://github.com/ShotaGhoona/poc-template.git my-app
cd my-app

# 2. セットアップ（npm install + shadcn/uiコンポーネント一括インストール）
./setup.sh

# 3. 環境変数を設定
cp .env.example .env
# .env を編集し、SupabaseのURLとanon keyを入力

# 4. 開発開始
npm run dev
```

ブラウザで `http://localhost:8080` を開く。

### Supabaseプロジェクトの作成

1. [supabase.com/dashboard](https://supabase.com/dashboard) でプロジェクトを作成
2. Settings → API からProject URLとanon keyをコピー
3. `.env` に貼り付け
4. SQLエディタで `supabase/migrations/00000000000001_initial_setup.sql` を実行

## プロジェクト構造

```
├── CLAUDE.md                    # Claude Code用ガイド（自動参照）
├── setup.sh                     # ワンコマンドセットアップ
├── .claude/commands/            # カスタムスラッシュコマンド
│   ├── new-entity.md            #   /new-entity - CRUD一式を生成
│   ├── new-page.md              #   /new-page - ページを追加
│   ├── add-feature.md           #   /add-feature - 機能を追加
│   └── db-migrate.md            #   /db-migrate - DB変更
├── docs/plan/
│   ├── 開発のユースケース.md      # 110個のユースケース一覧
│   └── loverbleでの実装方式.md   # 各ユースケースの具体的実装コード
├── supabase/
│   └── migrations/              # SQLマイグレーション
└── src/
    ├── components/
    │   ├── ui/                  # shadcn/ui（setup.shで自動生成）
    │   ├── layout/              # AppLayout, AppSidebar, PageHeader
    │   └── shared/              # EmptyState, PageSkeleton
    ├── pages/                   # Auth, Dashboard, Items, ItemDetail, Settings, 404
    ├── hooks/                   # useItems.ts（CRUDフックのテンプレート）
    ├── contexts/                # AuthContext（Supabase認証）
    ├── integrations/supabase/   # Supabaseクライアント + 型定義
    ├── lib/utils.ts             # cn()ユーティリティ
    ├── types/index.ts           # アプリ固有型
    ├── App.tsx                  # ルーティング + プロバイダー
    └── main.tsx                 # エントリーポイント
```

## Claude Codeでの使い方

このテンプレートはClaude Code CLIとの併用を前提に設計されている。

### カスタムコマンド

```bash
# 新しいエンティティ（テーブル + CRUD + ページ）を一式生成
/new-entity projects name:string description:text status:enum

# ページを追加
/new-page Analytics /analytics 分析ダッシュボード

# 機能を追加（docs/planを参照して最適な方法を判断）
/add-feature カンバンボード表示を追加したい

# DBマイグレーション作成
/db-migrate projectsテーブルにpriorityカラムを追加
```

### CLAUDE.md

プロジェクトルートの `CLAUDE.md` がClaude Codeに自動で読み込まれ、以下を指示する：

- 新機能追加の標準手順（DB → 型 → フック → ページ → ルーティング）
- マイグレーション・フック・ページのテンプレート
- UIの実装判断ルール（Dialog vs Sheet vs 新ページ 等）
- エラーハンドリング・日本語化のルール

### 開発ドキュメント

`docs/plan/` に110個のユースケースと具体的な実装コードがまとまっている。Claude Codeが `/add-feature` コマンドで自動参照する。

## 含まれている機能

- メール/パスワード認証（Supabase Auth）
- ProtectedRoute（未認証リダイレクト）
- サイドバーナビゲーション
- ダークモード切替
- KPIカードダッシュボード
- CRUDサンプル（Items：一覧 / 詳細 / 作成 / 更新 / 削除）
- トースト通知
- レスポンシブ対応
- ローディングスケルトン / 空状態表示

## コマンド

```bash
npm run dev        # 開発サーバー（port 8080）
npm run build      # プロダクションビルド
npm run build:dev  # 開発ビルド（ソースマップ付き）
npm run lint       # ESLint
npm run test       # テスト実行
npm run test:watch # テストウォッチモード
npm run preview    # ビルドプレビュー
```

## 新しいエンティティの追加方法（手動）

Claude Codeを使わない場合の手順：

1. `supabase/migrations/` にSQLファイルを追加（テーブル + RLS + トリガー）
2. `src/integrations/supabase/types.ts` に型を追加
3. `src/hooks/useItems.ts` をコピーして `useXxx.ts` を作成
4. `src/pages/` に一覧ページと詳細ページを作成
5. `src/App.tsx` にルートを追加
6. `src/components/layout/AppSidebar.tsx` にナビゲーション追加

## ライセンス

MIT
