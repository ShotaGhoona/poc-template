# POC Template - Claude Code 開発ガイド

このプロジェクトはLovable（ノーコードAIツール）と同じ技術スタックと開発パターンを採用している。
迷ったときは `docs/plan/loverbleでの実装方式.md` を参照すること。

## 技術スタック（固定・変更不可）

| カテゴリ | 技術 | 備考 |
|---------|------|------|
| ビルド | Vite + SWC | `@vitejs/plugin-react-swc` |
| UI | React 18 + TypeScript | strict: false |
| バックエンド | Supabase | PostgreSQL + Auth + Storage + Realtime |
| コンポーネント | shadcn/ui + Radix UI | `npx shadcn@latest add` で管理 |
| スタイリング | Tailwind CSS | CSS変数でテーマ管理 |
| サーバーステート | TanStack React Query | useQuery + useMutation |
| フォーム | react-hook-form + Zod | shadcn Form コンポーネントと組合せ |
| トースト | sonner | `toast.success()` / `toast.error()` |
| アイコン | lucide-react | |
| ダークモード | next-themes | class方式 |
| ルーティング | React Router v6 | |

**他のライブラリを選定しない。** 上記で対応できない場合のみ、追加を検討する。

## プロジェクト構造

```
src/
├── components/
│   ├── ui/           # shadcn/ui（手動編集禁止）
│   ├── layout/       # AppLayout, AppSidebar, PageHeader
│   ├── shared/       # EmptyState, PageSkeleton
│   └── [feature]/    # 機能ごとのコンポーネント
├── pages/            # ルートごとのページ
├── hooks/            # useXxx.ts（React Query + Supabase）
├── contexts/         # AuthContext 等
├── integrations/
│   └── supabase/     # client.ts, types.ts
├── lib/utils.ts      # cn() ユーティリティ
├── types/index.ts    # アプリ固有型
├── App.tsx           # ルーティング + プロバイダー
└── main.tsx          # エントリーポイント
```

## 新機能追加の標準手順

ユーザーから「○○機能を追加して」と言われたら、以下の順番で実装する：

### 1. DBテーブルが必要な場合

```
supabase/migrations/YYYYMMDDHHMMSS_create_xxx.sql を作成
↓
src/integrations/supabase/types.ts に型を追加（or supabase gen types）
↓
src/hooks/useXxx.ts を作成（useItems.ts をコピーして置換）
↓
ページ・コンポーネントを作成
↓
App.tsx にルートを追加
↓
AppSidebar.tsx にナビゲーション追加
```

### 2. UIのみの場合

```
必要な shadcn/ui コンポーネントを npx shadcn@latest add で追加
↓
src/components/[feature]/ にコンポーネント作成
↓
ページに組み込み
```

## マイグレーションの書き方（テンプレート）

新しいテーブルを追加するとき、必ず以下を含める：

```sql
-- 1. テーブル作成
CREATE TABLE public.xxx (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- カラム定義
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. updated_atトリガー
CREATE TRIGGER update_xxx_updated_at
  BEFORE UPDATE ON public.xxx
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. インデックス（FKカラムには必ず）
CREATE INDEX idx_xxx_created_by ON public.xxx(created_by);

-- 4. RLS有効化 + ポリシー
ALTER TABLE public.xxx ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view" ON public.xxx FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create" ON public.xxx FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own" ON public.xxx FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own" ON public.xxx FOR DELETE TO authenticated USING (auth.uid() = created_by);
```

## CRUDフックの書き方（テンプレート）

`src/hooks/useItems.ts` をコピーして以下を置換するだけ：

1. ファイル名: `useXxx.ts`
2. `items` → テーブル名
3. `Item` → 型名
4. `["items"]` → `["xxx"]`（queryKey）
5. フィールドを調整

**必ず守るパターン：**
- `useXxx()` → 一覧取得（useQuery）
- `useXxx(id)` → 単体取得（useQuery）
- `useCreateXxx()` → 作成（useMutation + invalidateQueries）
- `useUpdateXxx()` → 更新（useMutation + invalidateQueries）
- `useDeleteXxx()` → 削除（useMutation + invalidateQueries）

## ページの書き方（テンプレート）

```tsx
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";

export default function XxxPage() {
  return (
    <AppLayout>
      <PageHeader title="タイトル" description="説明" action={<Button>アクション</Button>} />
      {/* コンテンツ */}
    </AppLayout>
  );
}
```

**ルート追加時のチェックリスト：**
1. `src/pages/Xxx.tsx` を作成
2. `App.tsx` に `<Route>` を追加（`<ProtectedRoute>` で囲む）
3. `AppSidebar.tsx` の `navItems` にメニュー追加

## コンポーネント設計の原則

- **1ファイル1コンポーネント**（小さいサブコンポーネントは同ファイル内でOK）
- **ビジネスロジックはフックに分離**（コンポーネントはUIのみ）
- **共通UIは `shared/` に配置**（EmptyState, PageSkeleton 等）
- **機能固有UIは `[feature]/` ディレクトリに配置**

## UIの実装判断ルール

| やりたいこと | 使うもの |
|------------|---------|
| モーダル/ダイアログ | `<Dialog>` (shadcn/ui) |
| サイドパネル | `<Sheet>` (shadcn/ui) |
| 確認ダイアログ | `<AlertDialog>` (shadcn/ui) |
| ドロップダウン | `<DropdownMenu>` (shadcn/ui) |
| フォーム | `react-hook-form` + `Zod` + shadcn `<Form>` |
| テーブル | shadcn `<Table>` |
| カード一覧 | `grid` + shadcn `<Card>` |
| 通知 | `toast` from sonner |
| ローディング | shadcn `<Skeleton>` or `animate-spin` |
| 空状態 | `<EmptyState>` (shared) |
| 日付 | `date-fns` + shadcn `<Calendar>` |
| アイコン | `lucide-react` |
| 検索 | shadcn `<Command>` (cmdk) |
| ドラッグ＆ドロップ | `@dnd-kit` (必要時に追加) |
| グラフ | `recharts` (必要時に追加) |
| リッチテキスト | `@tiptap/react` (必要時に追加) |

## エラーハンドリングパターン

```tsx
// ミューテーション
try {
  await mutation.mutateAsync(data);
  toast.success("保存しました");
} catch (error: any) {
  toast.error(error.message || "エラーが発生しました");
}

// クエリのローディング/エラー
const { data, isLoading, error } = useXxx();
if (isLoading) return <PageSkeleton />;
if (error) return <div>エラーが発生しました</div>;
if (!data?.length) return <EmptyState ... />;
```

## 日本語化ルール

- UIテキストは全て日本語で記述する
- ボタン: 「保存」「削除」「新規作成」「キャンセル」「戻る」
- 通知: 「保存しました」「削除しました」「エラーが発生しました」
- ラベル: 「タイトル」「説明」「ステータス」「作成日」「メールアドレス」「パスワード」

## コマンド

```bash
npm run dev        # 開発サーバー (port 8080)
npm run build      # プロダクションビルド
npm run build:dev  # 開発ビルド（ソースマップ付き）
npm run lint       # ESLint
npm run preview    # ビルドプレビュー
npm run test       # テスト実行
npm run test:watch # テストウォッチモード
```

## Supabaseワークフロー

```bash
# ローカル開発
npx supabase start                    # ローカルSupabase起動
npx supabase db reset                 # マイグレーション再適用
npx supabase gen types typescript --local > src/integrations/supabase/types.ts  # 型生成

# リモート（本番）
npx supabase db push                  # マイグレーションを本番に適用
npx supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts
```
