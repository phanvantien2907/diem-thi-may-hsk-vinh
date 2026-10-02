/**
 * AppSidebar — Sidebar chính của Dashboard
 *
 * Bao gồm:
 * - Header: Logo + tên trường
 * - Nav: 4 mục điều hướng chính
 * - Footer: User profile dropdown (Avatar + tên + email + menu actions)
 *
 * Base UI pattern: dùng `render` prop thay vì `asChild`
 * Logout: dùng LogoutDialog (AlertDialog) thay vì redirect trực tiếp
 */
import * as React from "react";
import { Link, useLocation } from "react-router";
import {
  BookOpenCheckIcon,
  SearchIcon,
  PackageIcon,
  UserCircleIcon,
  CreditCardIcon,
  UserIcon,
  ChevronsUpDownIcon,
  GraduationCapIcon,
  LogOutIcon,
} from "lucide-react";
import { LogoutDialog } from "~/components/layout/logout-dialog";
import { AppCommandMenu } from "~/components/layout/AppCommandMenu";
import { cn } from "~/lib/utils";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "~/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";

// ─── Nav items definition ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    label: "Thông tin thí sinh",
    href: "/thong-tin-thi-sinh",
    icon: UserCircleIcon,
  },
  {
    label: "Đăng ký thi",
    href: "/dang-ky-thi",
    icon: BookOpenCheckIcon,
  },
  {
    label: "Tra cứu kết quả",
    href: "/ket-qua-thi",
    icon: SearchIcon,
  },
  {
    label: "Vận chuyển chứng chỉ",
    href: "/van-chuyen-chung-chi",
    icon: PackageIcon,
  },
  {
    label: "Tài khoản của tôi",
    href: "/tai-khoan-cua-toi",
    icon: UserCircleIcon,
  },
] as const;

// ─── Helper: lấy 2 chữ cái đầu cho Avatar fallback ──────────────────────────
function getInitials(name: string): string {
  if (!name || !name.trim()) return "TS";
  const trimmed = name.trim();
  if (/^\d+$/.test(trimmed)) return "TS";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface SidebarUser {
  name: string;
  email?: string;
  username?: string;
  cccd?: string;
  phone?: string;
  role?: string;
}

interface AppSidebarProps {
  user: SidebarUser;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AppSidebar({ user }: AppSidebarProps) {
  const location = useLocation();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = React.useState(false);
  const [isCommandOpen, setIsCommandOpen] = React.useState(false);
  const [isMac, setIsMac] = React.useState(true);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const userAgent = navigator.userAgent || navigator.platform || "";
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(userAgent));
    }
  }, []);

  return (
    <Sidebar collapsible="icon">
      {/* ── Header: Logo + Tên trường ──────────────────────────────────────── */}
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Base UI: dùng render prop thay vì asChild */}
            <SidebarMenuButton
              size="lg"
              render={
                <Link
                  to="/thong-tin-thi-sinh"
                  aria-label="Trang chủ"
                />
              }
            >
              {/* Emblem */}
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCapIcon className="size-4" aria-hidden="true" />
              </div>
              {/* Text — ẩn khi sidebar collapsed */}
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-semibold">
                  Đại học Vinh
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  HSK Registration
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <SidebarContent>
        {/* ── Search / Command Trigger ── */}
        <SidebarGroup className="py-1 pb-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setIsCommandOpen(true)}
                  tooltip={`Tìm kiếm nhanh (${isMac ? "⌘K" : "Ctrl+K"})`}
                  className={cn(
                    "w-full cursor-pointer justify-between rounded-full border border-sidebar-border bg-sidebar-accent/30 hover:bg-sidebar-accent text-sidebar-foreground/75 hover:text-sidebar-foreground transition-all shadow-2xs",
                    "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2"
                  )}
                  aria-label="Mở tìm kiếm nhanh"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <SearchIcon className="size-4 shrink-0 text-muted-foreground group-hover/menu-button:text-foreground transition-colors" aria-hidden="true" />
                    <span className="truncate text-xs text-muted-foreground group-hover/menu-button:text-foreground transition-colors group-data-[collapsible=icon]:hidden">
                      Tìm kiếm...
                    </span>
                  </div>
                  <kbd className="hidden sm:inline-flex h-4.5 select-none items-center rounded border border-border/70 bg-background/90 px-1.5 font-mono text-[9px] font-semibold text-muted-foreground shadow-2xs group-data-[collapsible=icon]:hidden">
                    {isMac ? "⌘K" : "Ctrl K"}
                  </kbd>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    {/* Base UI: render prop thay vì asChild */}
                    <SidebarMenuButton
                      render={<Link to={item.href} />}
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <item.icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer: User Profile Dropdown ─────────────────────────────────── */}
      <SidebarSeparator />
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-2.5 py-2",
                  "cursor-pointer outline-none select-none",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  "transition-colors duration-150",
                  "focus-visible:ring-2 focus-visible:ring-ring"
                )}
                aria-label={`Menu người dùng — ${user.name}`}
              >
                {/* Avatar */}
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>

                {/* Name + Subtitle */}
                <div className="flex min-w-0 flex-1 flex-col text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-medium text-foreground">
                    {user.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email || user.role || "Thí sinh"}
                  </span>
                </div>

                <ChevronsUpDownIcon
                  className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
                  aria-hidden="true"
                />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                side="top"
                sideOffset={8}
                className="w-68 rounded-2xl p-2.5 shadow-lg"
              >
                {/* User info card in dropdown */}
                <div className="flex flex-col gap-2 p-2.5 mb-1 bg-muted/50 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 shrink-0 ring-2 ring-primary/25">
                      <AvatarFallback className="rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-sm">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col text-left leading-tight gap-1">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {user.name}
                      </span>
                      <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {user.role || "Thí sinh"}
                      </span>
                    </div>
                  </div>


                </div>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  {/* Hồ sơ */}
                  <DropdownMenuItem className="cursor-pointer rounded-lg">
                    <UserIcon data-icon="inline-start" aria-hidden="true" />
                    <Link to="/tai-khoan-cua-toi" className="flex-1">
                      Hồ sơ của tôi
                    </Link>
                  </DropdownMenuItem>

                  {/* Thanh toán */}
                  <DropdownMenuItem className="cursor-pointer rounded-lg">
                    <CreditCardIcon
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                    <Link to="/payment" className="flex-1">
                      Thanh toán
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {/* Đăng xuất */}
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer rounded-lg"
                  onClick={() => setIsLogoutDialogOpen(true)}
                >
                  <LogOutIcon data-icon="inline-start" aria-hidden="true" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <LogoutDialog
        open={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
      />

      <AppCommandMenu
        open={isCommandOpen}
        onOpenChange={setIsCommandOpen}
        onLogout={() => setIsLogoutDialogOpen(true)}
      />
    </Sidebar>
  );
}
