import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-6xl font-bold text-muted-foreground mb-2">404</h1>
      <p className="text-xl text-muted-foreground mb-6">ページが見つかりません</p>
      <Button onClick={() => navigate("/")}>ホームに戻る</Button>
    </div>
  );
}
