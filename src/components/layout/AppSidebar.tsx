import { Home, Package, Settings, ChevronsLeft, ChevronsRight, LogOut, Moon, Sun } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { title: "ダッシュボード", url: "/", icon: Home },
  { title: "アイテム", url: "/items", icon: Package },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { toggleSidebar, open } = useSidebar();
  const { theme, setTheme } = useTheme();

  const userInitials = user?.user_metadata?.name
    ? user.user_metadata.name.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "??";
  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "";
  const userEmail = user?.email || "";

  return (
    <Sidebar collapsible="icon">
      {/* Header with title and collapse toggle */}
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between px-2 py-1">
          <h2 className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            POC App
          </h2>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title={open ? "折りたたむ" : "展開"}
          >
            {open ? (
              <ChevronsLeft className="h-4 w-4" />
            ) : (
              <ChevronsRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>メニュー</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={location.pathname === item.url}
                    onClick={() => navigate(item.url)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: Settings, Theme toggle, User info */}
      <SidebarFooter className="border-t p-2">
        {/* Settings */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="設定"
              isActive={location.pathname === "/settings"}
              onClick={() => navigate("/settings")}
            >
              <Settings className="h-4 w-4" />
              <span>設定</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Theme toggle */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={theme === "light" ? "ダークモード" : "ライトモード"}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              <span>{theme === "light" ? "ダークモード" : "ライトモード"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* User info */}
        <div className="border-t mt-2 pt-2">
          {open ? (
            <div className="flex items-center gap-2.5 px-1.5">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-accent text-accent-foreground text-xs font-medium">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">{userName}</p>
                <p className="text-[11px] text-muted-foreground truncate leading-tight">{userEmail}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="p-1 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-accent transition-colors"
                title="ログアウト"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => signOut()}
                  className="flex justify-center w-full"
                  title="ログアウト"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-accent text-accent-foreground text-[10px] font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
