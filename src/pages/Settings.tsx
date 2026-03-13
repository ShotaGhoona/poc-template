import { useState } from "react";
import { User, Palette } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const userSettingsSections = [
  { id: "profile", label: "プロフィール", icon: User },
  { id: "theme", label: "テーマ設定", icon: Palette },
] as const;

type UserSettingsSection = (typeof userSettingsSections)[number]["id"];

function ProfileSection() {
  const { user } = useAuth();

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div>
        <h3 className="text-lg font-semibold">プロフィール</h3>
        <p className="text-sm text-muted-foreground mt-1">アカウント情報</p>
      </div>
      <Separator />
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>メールアドレス</Label>
          <Input value={user?.email || ""} disabled />
        </div>
        <div className="space-y-2">
          <Label>ユーザーID</Label>
          <Input value={user?.id || ""} disabled />
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="text-lg font-semibold">危険な操作</h3>
        <p className="text-sm text-muted-foreground mt-1">
          アカウントに対する取り消し不可能な操作
        </p>
        <Button variant="destructive" className="mt-4">
          アカウント削除
        </Button>
      </div>
    </div>
  );
}

function ThemeSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div>
        <h3 className="text-lg font-semibold">テーマ設定</h3>
        <p className="text-sm text-muted-foreground mt-1">
          アプリの外観を変更します
        </p>
      </div>
      <Separator />
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: "light", label: "ライト" },
          { value: "dark", label: "ダーク" },
          { value: "system", label: "システム" },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:bg-accent",
              theme === option.value
                ? "border-primary bg-accent"
                : "border-transparent"
            )}
          >
            <div
              className={cn(
                "h-16 w-full rounded-md border",
                option.value === "light" && "bg-white",
                option.value === "dark" && "bg-zinc-900",
                option.value === "system" &&
                  "bg-gradient-to-r from-white to-zinc-900"
              )}
            />
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] =
    useState<UserSettingsSection>("profile");

  return (
    <AppLayout>
      <PageHeader title="設定" description="アプリケーションの設定を管理" />
      <Tabs defaultValue="user" className="space-y-6">
        <div className="border-b">
          <TabsList className="h-auto p-0 bg-transparent rounded-none gap-6">
            <TabsTrigger
              value="user"
              className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-1 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              ユーザー設定
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="user">
          <div className="flex gap-6">
            {/* Left nav */}
            <nav className="w-48 shrink-0 space-y-1">
              {userSettingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    activeSection === section.id
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <section.icon className="h-4 w-4" />
                  {section.label}
                </button>
              ))}
            </nav>

            {/* Right content */}
            <div className="flex-1 min-w-0">
              {activeSection === "profile" && <ProfileSection />}
              {activeSection === "theme" && <ThemeSection />}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
