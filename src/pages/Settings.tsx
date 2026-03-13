import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function Settings() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <PageHeader
        title="設定"
        description="アカウント設定と環境設定の管理"
      />
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>プロフィール</CardTitle>
            <CardDescription>
              アカウント情報
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>メールアドレス</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>ユーザーID</Label>
              <Input value={user?.id || ""} disabled />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>危険な操作</CardTitle>
            <CardDescription>
              アカウントに対する取り消し不可能な操作
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive">アカウント削除</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
