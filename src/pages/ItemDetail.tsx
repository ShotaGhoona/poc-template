import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useItem, useUpdateItem } from "@/hooks/useItems";
import { toast } from "sonner";

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: item, isLoading } = useItem(id!);
  const updateItem = useUpdateItem();
  const [title, setTitle] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (isLoading) {
    return (
      <AppLayout>
        <PageSkeleton />
      </AppLayout>
    );
  }

  if (!item) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">アイテムが見つかりません</p>
          <Button variant="link" onClick={() => navigate("/items")}>
            一覧に戻る
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!initialized) {
    setTitle(item.title);
    setInitialized(true);
  }

  const handleSave = async () => {
    try {
      await updateItem.mutateAsync({ id: item.id, title });
      toast.success("保存しました");
    } catch (error: any) {
      toast.error(error.message || "保存に失敗しました");
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/items")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          一覧に戻る
        </Button>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>アイテム詳細</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>作成日</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(item.created_at).toLocaleString("ja-JP")}
              </p>
            </div>
            <div className="space-y-2">
              <Label>ID</Label>
              <p className="text-sm text-muted-foreground font-mono">{item.id}</p>
            </div>
            <Button onClick={handleSave} disabled={updateItem.isPending}>
              {updateItem.isPending ? "保存中..." : "保存"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
