import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Package } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useItems, useCreateItem, useDeleteItem } from "@/hooks/useItems";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function CreateItemDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const createItem = useCreateItem();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createItem.mutateAsync({ title: title.trim() });
      toast.success("アイテムを作成しました");
      setTitle("");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "作成に失敗しました");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>アイテムを作成</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タイトルを入力"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={createItem.isPending}>
            {createItem.isPending ? "作成中..." : "作成"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Items() {
  const navigate = useNavigate();
  const { data: items, isLoading } = useItems();
  const deleteItem = useDeleteItem();

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Items" />
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Items"
        description="アイテムの一覧と管理"
        action={<CreateItemDialog />}
      />

      {!items?.length ? (
        <EmptyState
          icon={Package}
          title="アイテムがありません"
          description="最初のアイテムを作成してみましょう"
          actionLabel="新規作成"
          onAction={() => {}}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>作成日</TableHead>
              <TableHead className="w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                onClick={() => navigate(`/items/${item.id}`)}
              >
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{item.status || "draft"}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString("ja-JP")}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteItem.mutate(item.id);
                    }}
                  >
                    削除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AppLayout>
  );
}
