# DBマイグレーションを作成

引数: $ARGUMENTS (変更内容の説明)

## 手順

### 1. マイグレーションファイル作成

`supabase/migrations/` にSQLファイルを作成。
ファイル名: 現在の日時ベースで `YYYYMMDDHHMMSS_[説明].sql`

### 2. 変更パターン別テンプレート

**新テーブル追加の場合：**
```sql
CREATE TABLE public.[name] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- フィールド
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_[name]_updated_at
  BEFORE UPDATE ON public.[name]
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_[name]_created_by ON public.[name](created_by);

ALTER TABLE public.[name] ENABLE ROW LEVEL SECURITY;
-- ポリシー追加
```

**カラム追加の場合：**
```sql
ALTER TABLE public.[name] ADD COLUMN [column] [TYPE] DEFAULT [value];
```

**Enum追加の場合：**
```sql
CREATE TYPE public.[name] AS ENUM ('value1', 'value2');
```

### 3. 型ファイル更新

`src/integrations/supabase/types.ts` を更新して新しいテーブル/カラムの型を追加。

### 4. フック更新

関連する `src/hooks/useXxx.ts` の型・クエリを更新。

## チェックリスト

- [ ] RLSポリシーが設定されている
- [ ] updated_atトリガーが適用されている
- [ ] FKカラムにインデックスがある
- [ ] types.tsが更新されている
- [ ] 関連フックが更新されている
