# Lovableでの実装方式 - 迷わず実装するためのガイド

Lovableが生成するプロジェクトの実装パターンを分析し、各ユースケースに対して**迷わず実装できる**具体的な方法をまとめる。

---

## 技術スタック（固定）

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| ビルド | Vite | ^5.4 |
| 言語 | TypeScript | ^5.8 |
| UI | React | ^18.3 |
| ルーティング | React Router DOM | ^6.30 |
| サーバーステート | TanStack React Query | ^5.83 |
| バックエンド | Supabase (PostgreSQL + Auth + Storage) | ^2.98+ |
| コンポーネント | shadcn/ui + Radix UI | latest |
| スタイリング | Tailwind CSS | ^3.4 |
| フォーム | react-hook-form + Zod | ^7.61 + ^3.25 |
| トースト | sonner | ^1.7 |
| アイコン | lucide-react | ^0.462 |
| ダークモード | next-themes | ^0.3 |
| コンパイラ | @vitejs/plugin-react-swc | latest |

---

## 1. 認証・認可

### UC-1: メール/パスワード認証を導入したい

**やること：**

1. Supabaseプロジェクトを作成し、`.env`に設定

```env
VITE_SUPABASE_URL="https://xxxxx.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJxxx..."
```

2. Supabaseクライアントを作成

```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

3. AuthContextを作成

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

4. App.tsxにProviderを配置

```typescript
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </AuthProvider>
</QueryClientProvider>
```

### UC-5: Protected Routeを作りたい

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">読み込み中...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">読み込み中...</div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
```

### UC-4: サインアップ時にプロフィール自動作成

**Supabaseマイグレーション（SQL）：**

```sql
-- テーブル作成
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- トリガー関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー設定
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
```

### UC-9: マルチテナント（Organization）

```sql
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- ヘルパー関数
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

**フロントエンド：OrganizationContext**

```typescript
// src/contexts/OrganizationContext.tsx
const OrganizationContext = createContext<{
  organization: Organization | null;
  setOrganization: (org: Organization) => void;
} | undefined>(undefined);
```

### UC-10: オンボーディングフロー

```typescript
function OrganizationGuard({ children }: { children: React.ReactNode }) {
  const { organization, loading } = useOrganization();
  if (loading) return <PageSkeleton />;
  if (!organization) return <OnboardingOrganization />;
  return <>{children}</>;
}

// App.tsx
<ProtectedRoute>
  <OrganizationGuard>
    <AppLayout>{children}</AppLayout>
  </OrganizationGuard>
</ProtectedRoute>
```

---

## 2. データベース設計・操作

### UC-11: 新しいテーブルを追加したい

**手順：**

1. `supabase/migrations/` に新しいSQLファイルを作成
   - ファイル名規則: `YYYYMMDDHHMMSS_description.sql`

```sql
-- supabase/migrations/20260313000001_create_tasks.sql
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- updated_atの自動更新
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS有効化
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = created_by);
```

2. Supabase型を再生成（`supabase gen types typescript`）

3. カスタムフックを作成

```typescript
// src/hooks/useTasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: { title: string; description?: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

### UC-13: DB構造が変わったとき

**ルール：既存テーブルを変更する場合は新しいマイグレーションファイルを作る**

```sql
-- supabase/migrations/20260314000001_add_priority_to_tasks.sql
ALTER TABLE public.tasks ADD COLUMN priority TEXT DEFAULT 'medium'
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
```

**Supabaseの型を再生成して、フックの型を更新するだけ。**

### UC-14: RLS（Row Level Security）

**パターン集：**

```sql
-- 認証ユーザーのみ読み取り可
CREATE POLICY "Authenticated read" ON public.tasks
  FOR SELECT TO authenticated USING (true);

-- 自分のデータのみ読み取り
CREATE POLICY "Own data read" ON public.tasks
  FOR SELECT TO authenticated USING (auth.uid() = created_by);

-- 組織メンバーのみ読み取り（ヘルパー関数使用）
CREATE POLICY "Org members read" ON public.projects
  FOR SELECT TO authenticated
  USING (is_org_member(organization_id));

-- ロールベース
CREATE POLICY "Admin only" ON public.settings
  FOR ALL TO authenticated
  USING (has_org_role(organization_id, 'admin') OR has_org_role(organization_id, 'owner'));
```

### UC-16: JOINして関連データを取得

```typescript
// Supabaseのselect構文でJOINを表現
const { data } = await supabase
  .from('documents')
  .select(`
    *,
    project:projects(*),
    creator:profiles!documents_created_by_fkey(display_name, avatar_url),
    comments(count)
  `)
  .eq('project_id', projectId)
  .order('created_at', { ascending: false });
```

### UC-17: UPSERT

```typescript
const { data, error } = await supabase
  .from('property_values')
  .upsert(
    {
      object_id: objectId,
      property_definition_id: defId,
      value_text: newValue,
    },
    { onConflict: 'object_id,property_definition_id' }
  )
  .select()
  .single();
```

### UC-18: ソフトデリート

```sql
-- テーブルに is_deleted カラムを追加
ALTER TABLE public.documents ADD COLUMN is_deleted BOOLEAN DEFAULT false;

-- RLSで削除済みを除外
CREATE POLICY "Hide deleted" ON public.documents
  FOR SELECT TO authenticated USING (is_deleted = false);
```

```typescript
// 削除 = is_deletedをtrueに
const softDelete = async (id: string) => {
  await supabase.from('documents').update({ is_deleted: true }).eq('id', id);
};

// 復元
const restore = async (id: string) => {
  await supabase.from('documents').update({ is_deleted: false }).eq('id', id);
};

// ゴミ箱の一覧（RLSバイパスが必要 or 別ポリシー）
const { data } = await supabase.from('documents').select('*').eq('is_deleted', true);
```

### UC-19: タイムスタンプ自動更新

```sql
-- 汎用トリガー関数（1回だけ作る）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルに適用
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### UC-20: Enum型の定義

```sql
CREATE TYPE public.document_status AS ENUM (
  'draft', 'review_requested', 'in_review', 'revision', 'completed'
);

-- テーブルで使用
ALTER TABLE public.documents ADD COLUMN status document_status DEFAULT 'draft';
```

### UC-21: JSONB型

```sql
-- 柔軟な設定やメタデータに使用
ALTER TABLE public.dashboard_blocks ADD COLUMN config JSONB DEFAULT '{}';

-- 使用例：
-- { "attributeTypeId": "xxx", "displayMode": "table", "limit": 10 }
```

```typescript
// TypeScript側
interface BlockConfig {
  attributeTypeId?: string;
  displayMode?: 'table' | 'kanban' | 'gallery';
  limit?: number;
}

const config: BlockConfig = data.config as BlockConfig;
```

---

## 3. UI・コンポーネント

### UC-24: shadcn/uiコンポーネントの追加

```bash
# CLIで追加
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add select
npx shadcn@latest add table
npx shadcn@latest add tabs
npx shadcn@latest add card
npx shadcn@latest add toast
npx shadcn@latest add sidebar
```

**必須の前提設定** (`components.json`):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### UC-25: ダイアログ（モーダル）

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function CreateItemDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />新規作成</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>アイテムを作成</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); /* 保存処理 */ setOpen(false); }}>
          <Input placeholder="タイトル" />
          <Button type="submit">作成</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### UC-26: サイドバーナビゲーション

```typescript
// shadcn/uiのSidebarを使用
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { title: 'ダッシュボード', icon: LayoutDashboard, path: '/' },
    { title: 'プロジェクト', icon: FolderKanban, path: '/projects' },
    { title: 'ドキュメント', icon: FileText, path: '/documents' },
    { title: '設定', icon: Settings, path: '/settings' },
  ];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>メニュー</SidebarGroupLabel>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  isActive={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

// レイアウト
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  );
}
```

### UC-27: レスポンシブ対応

```typescript
// use-mobile.tsx
import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
```

```tsx
{/* レスポンシブなグリッド */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>

{/* モバイルではDrawer、デスクトップではDialog */}
{isMobile ? <Drawer>...</Drawer> : <Dialog>...</Dialog>}
```

### UC-28: ダークモード

```typescript
// ThemeProvider.tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}

// ThemeToggle.tsx
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

**index.cssのCSS変数：**

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  /* ... */
}
```

### UC-29: トースト通知

```typescript
import { toast } from 'sonner';

// 成功
toast.success('保存しました');

// エラー
toast.error('エラーが発生しました');

// カスタム
toast('処理中...', { description: 'しばらくお待ちください' });

// App.tsxに<Sonner />を配置するだけ
```

### UC-30: ローディングスケルトン

```typescript
import { Skeleton } from '@/components/ui/skeleton';

function PageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
```

### UC-36: ドラッグ＆ドロップ

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

```typescript
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

function SortableList({ items, onReorder }: Props) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      // 並び替えロジック
      onReorder(active.id, over!.id);
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        {items.map(item => (
          <SortableItem key={item.id} id={item.id}>{item.name}</SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

---

## 4. フォーム・バリデーション

### UC-42: フォームにバリデーション

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function TaskForm({ onSubmit }: { onSubmit: (values: FormValues) => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', description: '', priority: 'medium' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>タイトル</FormLabel>
              <FormControl>
                <Input {...field} placeholder="タスク名を入力" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>優先度</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">保存</Button>
      </form>
    </Form>
  );
}
```

### UC-47: インラインで編集・保存（onBlur）

```typescript
function InlineEditableTitle({ id, initialValue }: Props) {
  const [value, setValue] = useState(initialValue);
  const updateMutation = useUpdateItem();

  const handleBlur = () => {
    if (value !== initialValue) {
      updateMutation.mutate({ id, title: value });
    }
  };

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      className="border-none text-xl font-bold focus:ring-0"
    />
  );
}
```

---

## 5. データ表示・一覧

### UC-50: テーブル表示

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function DataTable({ data, columns }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map(col => (
            <TableHead key={col.key}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(row => (
          <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50"
            onClick={() => navigate(`/items/${row.id}`)}>
            {columns.map(col => (
              <TableCell key={col.key}>{row[col.key]}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### UC-51: カンバンボード

```typescript
function KanbanBoard({ items, groupByProperty }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    items.forEach(item => {
      const group = item[groupByProperty] || 'その他';
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(item);
    });
    return map;
  }, [items, groupByProperty]);

  return (
    <div className="flex gap-4 overflow-x-auto p-4">
      {Array.from(groups.entries()).map(([groupName, groupItems]) => (
        <div key={groupName} className="min-w-[300px] bg-muted/30 rounded-lg p-3">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Badge variant="outline">{groupName}</Badge>
            <span className="text-xs text-muted-foreground">{groupItems.length}</span>
          </h3>
          <div className="space-y-2">
            {groupItems.map(item => (
              <Card key={item.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                <p className="font-medium text-sm">{item.title}</p>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### UC-53: ビュー切り替え

```typescript
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutList, Kanban, LayoutGrid } from 'lucide-react';

type ViewMode = 'table' | 'kanban' | 'gallery';

function ViewSwitcher({ items }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  return (
    <div>
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="table"><LayoutList className="h-4 w-4" /></TabsTrigger>
          <TabsTrigger value="kanban"><Kanban className="h-4 w-4" /></TabsTrigger>
          <TabsTrigger value="gallery"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
        </TabsList>
      </Tabs>

      {viewMode === 'table' && <DataTable data={items} />}
      {viewMode === 'kanban' && <KanbanBoard items={items} />}
      {viewMode === 'gallery' && <GalleryView items={items} />}
    </div>
  );
}
```

### UC-54-56: フィルター・ソート・検索

```typescript
function useFilteredData(items: Item[], searchQuery: string, filters: Filter[], sort: Sort) {
  return useMemo(() => {
    let result = [...items];

    // 検索
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
      );
    }

    // フィルター
    filters.forEach(filter => {
      result = result.filter(item => {
        const value = item[filter.field];
        switch (filter.operator) {
          case 'equals': return value === filter.value;
          case 'contains': return String(value).includes(filter.value);
          case 'is_empty': return !value;
          default: return true;
        }
      });
    });

    // ソート
    if (sort.field) {
      result.sort((a, b) => {
        const aVal = a[sort.field];
        const bVal = b[sort.field];
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sort.direction === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [items, searchQuery, filters, sort]);
}
```

---

## 6. ステート管理・データフェッチ

### UC-59: React Queryのセットアップ

```typescript
// main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5分
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
```

### UC-60: ミューテーション後のキャッシュ更新

```typescript
// 基本パターン：invalidateQueries
export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: CreateItemInput) => {
      const { data, error } = await supabase.from('items').insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success('作成しました');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
```

### UC-61: 楽観的更新

```typescript
export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('items').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['items'] });
      const previous = queryClient.getQueryData(['items']);
      queryClient.setQueryData(['items'], (old: Item[]) =>
        old.map(item => item.id === newData.id ? { ...item, ...newData } : item)
      );
      return { previous };
    },
    onError: (_err, _newData, context) => {
      queryClient.setQueryData(['items'], context?.previous);
      toast.error('更新に失敗しました');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
```

### UC-62: 依存クエリ

```typescript
function useProjectDocuments(projectId?: string) {
  return useQuery({
    queryKey: ['documents', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId, // projectIdがあるときだけ実行
  });
}
```

---

## 7. ルーティング・ナビゲーション

### UC-65-70: ルーティング設定

```typescript
// App.tsx
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公開ルート */}
        <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* 保護されたルート（レイアウト付き） */}
        <Route element={<ProtectedRoute><AppLayout><Outlet /></AppLayout></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/items" element={<Items />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

```typescript
// 動的ルートのパラメータ取得
import { useParams, useNavigate } from 'react-router-dom';

function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: item, isLoading } = useItem(id!);

  if (isLoading) return <PageSkeleton />;
  if (!item) return <Navigate to="/404" replace />;

  return <div>{item.title}</div>;
}
```

---

## 8. リアルタイム機能

### UC-71: リアルタイム通知

```typescript
export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 通知を取得
  const query = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // リアルタイムサブスクリプション
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        toast(payload.new.title, { description: payload.new.body });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return query;
}
```

---

## 9. リッチコンテンツ

### UC-74: リッチテキストエディター（Tiptap）

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
```

```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

function BlockEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: '入力してください...' }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  return (
    <div className="prose prose-sm max-w-none">
      <EditorContent editor={editor} />
    </div>
  );
}
```

---

## 10. ファイル・メディア

### UC-79-82: ファイルアップロード（Supabase Storage）

```typescript
// アップロード
async function uploadFile(file: File, bucket: string, path: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });
  if (error) throw error;

  // 公開URLを取得
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
}

// コンポーネント
function FileUpload({ onUpload }: { onUpload: (url: string) => void }) {
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const path = `uploads/${Date.now()}_${file.name}`;
      const url = await uploadFile(file, 'files', path);
      onUpload(url);
      toast.success('アップロードしました');
    } catch (err) {
      toast.error('アップロードに失敗しました');
    }
  };

  return <Input type="file" onChange={handleChange} />;
}
```

---

## 11. チャート・分析

### UC-83: グラフ表示

```bash
npm install recharts
```

```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function StatsChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <Card className="p-4">
      <h3 className="font-medium mb-4">統計</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
```

### UC-84: KPIカード

```typescript
function KpiCard({ title, value, icon: Icon, trend }: Props) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {trend && (
        <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend > 0 ? '+' : ''}{trend}% 前月比
        </p>
      )}
    </Card>
  );
}

// 使用例
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <KpiCard title="総プロジェクト" value={42} icon={FolderKanban} trend={12} />
  <KpiCard title="ドキュメント" value={156} icon={FileText} trend={8} />
  <KpiCard title="レビュー待ち" value={7} icon={Clock} trend={-3} />
  <KpiCard title="完了率" value="87%" icon={CheckCircle} trend={5} />
</div>
```

---

## 12. テーマ・スタイリング

### UC-86: カスタムカラーパレット

```typescript
// tailwind.config.ts
export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        // カスタムカラー
        success: { DEFAULT: "hsl(var(--success))" },
        warning: { DEFAULT: "hsl(var(--warning))" },
        info: { DEFAULT: "hsl(var(--info))" },
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans JP", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

---

## 13. 開発環境

### UC-91-95: プロジェクト設定

**パスエイリアス** (`tsconfig.app.json`):

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

**Vite設定** (`vite.config.ts`):

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  server: { host: '::', port: 8080 },
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

**環境変数** (`.env`):

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxx...
```

**ESLint** (`eslint.config.js`):

```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  }
);
```

---

## 14. プロジェクト構造テンプレート

Lovableが生成するプロジェクトは常にこの構造に従う：

```
src/
├── components/
│   ├── ui/              # shadcn/uiコンポーネント（触らない）
│   ├── layout/          # AppLayout, AppSidebar, PageHeader
│   ├── [feature]/       # 機能ごとのディレクトリ
│   └── shared/          # EmptyState, PageSkeleton等
├── pages/               # ルートごとのページコンポーネント
├── hooks/               # カスタムフック（useXxx.ts）
├── contexts/            # React Context（AuthContext等）
├── integrations/
│   └── supabase/
│       ├── client.ts    # Supabaseクライアント
│       └── types.ts     # 自動生成型
├── lib/
│   └── utils.ts         # cn()ユーティリティ
├── types/
│   └── index.ts         # アプリ固有の型定義
├── App.tsx              # ルーティング＋プロバイダー
├── main.tsx             # エントリーポイント
└── index.css            # グローバルCSS + テーマ変数
```

**命名規則：**
- コンポーネント: `PascalCase.tsx`
- フック: `useXxx.ts` (Supabaseの操作は `useItems.ts` のように対象エンティティ名)
- ページ: `XxxPage.tsx` or `Xxx.tsx`
- 型定義: `interface Xxx` or `type Xxx`

**フック設計の原則：**
- 1つのエンティティに対して1つのフックファイル
- `useXxx()` = 一覧取得（useQuery）
- `useXxx(id)` = 単体取得（useQuery）
- `useCreateXxx()` = 作成（useMutation）
- `useUpdateXxx()` = 更新（useMutation）
- `useDeleteXxx()` = 削除（useMutation）
- すべてのMutationで `onSuccess` に `queryClient.invalidateQueries` を呼ぶ

---

## 15. まとめ：Lovableの意思決定ルール

| 判断ポイント | Lovableの選択 | 理由 |
|-------------|-------------|------|
| バックエンド | Supabase | Auth+DB+Storage+Realtimeが一体 |
| グローバルステート | React Query + Context | ReduxやZustandは不要 |
| UIライブラリ | shadcn/ui | カスタマイズ可能でアクセシブル |
| フォーム | react-hook-form + Zod | 型安全なバリデーション |
| スタイリング | Tailwind CSS変数 | テーマ切替可能 |
| トースト | sonner | 軽量でテーマ対応 |
| アイコン | lucide-react | 400+アイコン、Tree Shaking対応 |
| ダークモード | next-themes（class方式） | SSR不要でも動作 |
| TypeScript | Strict: false | POCスピード優先 |
| テスト | Vitest + @testing-library | Viteネイティブ |
| ルーティング | React Router v6 | SPA標準 |
| ビルド | Vite + SWC | 最速ビルド |
