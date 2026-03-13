# 新しいページを追加

引数: $ARGUMENTS (ページ名、パス、説明)

以下の手順を順番に実行してください：

## 1. ページコンポーネント作成

`src/pages/[ページ名].tsx` を作成：

```tsx
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";

export default function [ページ名]() {
  return (
    <AppLayout>
      <PageHeader title="[タイトル]" description="[説明]" />
      {/* コンテンツ */}
    </AppLayout>
  );
}
```

## 2. ルーティング追加

`src/App.tsx` に追加：
- ページのimport
- `<Route path="/[パス]" element={<ProtectedRoute><[ページ名] /></ProtectedRoute>} />`

## 3. サイドバー追加

`src/components/layout/AppSidebar.tsx` の navItems に追加。
lucide-react から適切なアイコンを選択。

## 注意
- UIテキストは全て日本語
- AppLayoutでラップすること
- ProtectedRouteで囲むこと（公開ページの場合は除く）
