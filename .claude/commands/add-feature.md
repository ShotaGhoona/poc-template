# 機能を追加

引数: $ARGUMENTS (追加したい機能の説明)

## 実装方針の決定

まず `docs/plan/loverbleでの実装方式.md` を読み、該当するユースケースの実装パターンを確認してください。

## 実装フロー

1. **必要なshadcn/uiコンポーネントを確認** → なければ `npx shadcn@latest add [name]` で追加
2. **DBテーブルが必要か判断** → 必要なら `supabase/migrations/` にSQLを追加
3. **データ操作が必要か判断** → 必要なら `src/hooks/useXxx.ts` を作成
4. **新しいページが必要か判断** → 必要なら `src/pages/Xxx.tsx` を作成 + ルーティング追加
5. **既存ページへの組み込みか判断** → 既存コンポーネントを修正

## 判断基準

- 独立した画面が必要 → 新ページ
- 既存画面の一部 → 既存ページ内にコンポーネント追加
- データの永続化が必要 → Supabaseテーブル + フック
- UIの状態のみ → useState / useLocalStorage
- サーバーデータ → React Query（useQuery/useMutation）
- モーダルで十分 → Dialog
- 多くの入力が必要 → 新ページ or Sheet

## 参照ドキュメント

- `docs/plan/開発のユースケース.md` - 110個のユースケース一覧
- `docs/plan/loverbleでの実装方式.md` - 各ユースケースの具体的コード例
- `src/hooks/useItems.ts` - CRUDフックのテンプレート
- `supabase/migrations/00000000000001_initial_setup.sql` - マイグレーションのテンプレート
