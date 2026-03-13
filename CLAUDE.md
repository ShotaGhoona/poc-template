# POC Template - Claude Code ガイド

## 技術スタック

- **Vite + React 18 + TypeScript** (SWC コンパイラ)
- **Supabase** (PostgreSQL + Auth + Storage + Realtime)
- **shadcn/ui + Radix UI + Tailwind CSS** (UI)
- **TanStack React Query** (サーバーステート)
- **react-hook-form + Zod** (フォーム + バリデーション)
- **sonner** (トースト通知)
- **lucide-react** (アイコン)
- **next-themes** (ダークモード)

## プロジェクト構造

```
src/
├── components/
│   ├── ui/           # shadcn/ui (npx shadcn@latest add で管理、手動編集しない)
│   ├── layout/       # AppLayout, AppSidebar, PageHeader
│   └── shared/       # EmptyState, PageSkeleton
├── pages/            # ルートごとのページ
├── hooks/            # useXxx.ts (React Query + Supabase)
├── contexts/         # AuthContext等
├── integrations/
│   └── supabase/     # client.ts, types.ts
├── lib/utils.ts      # cn()ユーティリティ
├── types/index.ts    # アプリ固有型
├── App.tsx           # ルーティング + プロバイダー
└── main.tsx          # エントリーポイント
```

## 開発ルール

### コンポーネント追加
- shadcn/uiコンポーネントは `npx shadcn@latest add <name>` で追加
- `src/components/ui/` 内のファイルは手動で編集しない

### データ操作（CRUD）
- 新しいテーブルごとに `src/hooks/useXxx.ts` を作成
- `useItems.ts` をテンプレートとしてコピー
- パターン: useQuery (読み取り) + useMutation (書き込み)
- ミューテーション成功時は必ず `queryClient.invalidateQueries` を呼ぶ

### DB変更
- `supabase/migrations/` に新しいSQLファイルを追加
- ファイル名: `YYYYMMDDHHMMSS_description.sql`
- 必ずRLSポリシーを設定する
- `update_updated_at_column()` トリガーを適用する

### スタイリング
- Tailwind CSSのユーティリティクラスを使用
- テーマカラーはCSS変数 (`src/index.css`) で管理
- `cn()` でクラスをマージ

### フォーム
- react-hook-form + Zod でバリデーション
- shadcn/ui の Form コンポーネントと組み合わせる

### 通知
- `import { toast } from "sonner"` を使用
- `toast.success()`, `toast.error()` パターン

### ルーティング
- React Router v6
- 認証が必要なページは `<ProtectedRoute>` で囲む
- 各ページで `<AppLayout>` をラップする

## コマンド

```bash
npm run dev       # 開発サーバー (port 8080)
npm run build     # プロダクションビルド
npm run lint      # ESLint
npm run preview   # ビルドプレビュー
```

## TypeScript

- strict: false (POCスピード優先)
- パスエイリアス: `@/` → `./src/`
