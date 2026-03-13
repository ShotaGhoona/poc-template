# 新しいエンティティ（テーブル + CRUD）を追加

引数: $ARGUMENTS (エンティティ名とフィールド定義)

以下の手順を順番に実行してください：

## 1. マイグレーションファイル作成

`supabase/migrations/` に新しいSQLファイルを作成。
ファイル名: `YYYYMMDDHHMMSS_create_[テーブル名].sql`

含めるもの：
- CREATE TABLE（id UUID PK, created_by FK, created_at, updated_at + 指定されたフィールド）
- update_updated_at_column トリガー
- FKカラムへのインデックス
- RLS有効化 + 4つの基本ポリシー（SELECT/INSERT/UPDATE/DELETE）

## 2. 型定義を追加

`src/integrations/supabase/types.ts` の Database.public.Tables にテーブル型を追加。
Row, Insert, Update の3つの型を定義。

## 3. CRUDフックを作成

`src/hooks/useItems.ts` をコピーして `src/hooks/use[エンティティ名].ts` を作成。
- テーブル名を置換
- 型定義を置換
- queryKeyを置換
- フィールドを調整

## 4. 一覧ページを作成

`src/pages/[エンティティ名].tsx` を作成。
- AppLayoutでラップ
- PageHeaderにタイトルと新規作成ボタン
- テーブル表示（shadcn Table）
- 空状態表示（EmptyState）
- 作成ダイアログ（Dialog）
- 削除ボタン（トースト付き）

## 5. 詳細ページを作成

`src/pages/[エンティティ名]Detail.tsx` を作成。
- AppLayoutでラップ
- 戻るボタン
- 編集フォーム（Card内）
- 保存ボタン（トースト付き）

## 6. ルーティング追加

`src/App.tsx` に以下を追加：
- ページのimport
- `<Route path="/[パス]">` （ProtectedRouteで囲む）
- `<Route path="/[パス]/:id">` （ProtectedRouteで囲む）

## 7. サイドバー追加

`src/components/layout/AppSidebar.tsx` の navItems に追加。
適切な lucide-react アイコンを選択。

## 注意

- UIテキストは全て日本語
- toast.success / toast.error でフィードバック
- 日付は `toLocaleDateString("ja-JP")` でフォーマット
