import * as React from "react";
import { Link, useLocation } from "react-router";
import {
  LayoutDashboardIcon,
  CalendarDaysIcon,
  UsersRoundIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ChevronsUpDownIcon,
  RadioIcon,
  ArrowRightLeftIcon,
  LogOutIcon,
  SearchIcon,
  HistoryIcon,
  SettingsIcon,
} from "lucide-react";
import { LogoutDialog } from "~/components/layout/logout-dialog";
import { AdminAuditLogDialog } from "~/components/layout/AdminAuditLogDialog";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import type { UserProfile } from "~/types/auth";

export const ADMIN_NAV_ITEMS = [
  {
    label: "Bảng điều khiển",
    href: "/trang-quan-tri",
    icon: LayoutDashboardIcon,
    badge: "Live",
  },
  {
    label: "Kỳ thi & Ca thi",
    href: "/quan-ly-ky-thi-ca-thi",
    icon: CalendarDaysIcon,
    badge: null,
  },
  {
    label: "Hồ sơ đăng ký",
    href: "/quan-ly-ho-so-dang-ky",
    icon: UsersRoundIcon,
    badge: "Mới",
  },
  {
    label: "Giao dịch & Thanh toán",
    href: "/quan-ly-giao-dich-thanh-toan",
    icon: CreditCardIcon,
    badge: null,
  },
] as const;

function getInitials(name: string): string {
  if (!name || !name.trim()) return "AD";
  const trimmed = name.trim();
  if (/^\d+$/.test(trimmed)) return "AD";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AdminSidebarProps {
  user: UserProfile;
  onOpenCommand?: () => void;
}

export function AdminSidebar({ user, onOpenCommand }: AdminSidebarProps) {
  const location = useLocation();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = React.useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = React.useState(false);



  return (
    <Sidebar collapsible="icon" className="border-r">
      {/* ── Header: Logo + Tên Portal ───────────────────────────────────────── */}
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link to="/trang-quan-tri" />}
              className="hover:bg-sidebar-accent cursor-pointer rounded-2xl transition-all"
              aria-label="Về trang quản trị"
            >
              <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                <ShieldCheckIcon className="size-5" aria-hidden="true" />
              </div>
              <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold tracking-tight">
                    Đại học Vinh
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium rounded-full">
                    Admin
                  </Badge>
                </div>
                <span className="truncate text-xs text-muted-foreground">
                  Trang quản trị
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
                  onClick={onOpenCommand}
                  tooltip="Tìm kiếm quản trị (⌘K)"
                  className={cn(
                    "w-full cursor-pointer justify-between rounded-full border border-sidebar-border bg-sidebar-accent/30 hover:bg-sidebar-accent text-sidebar-foreground/75 hover:text-sidebar-foreground transition-all shadow-2xs",
                    "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2"
                  )}
                  aria-label="Mở tìm kiếm quản trị"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <SearchIcon className="size-4 shrink-0 text-muted-foreground group-hover/menu-button:text-foreground transition-colors" aria-hidden="true" />
                    <span className="truncate text-xs text-muted-foreground group-hover/menu-button:text-foreground transition-colors group-data-[collapsible=icon]:hidden">
                      Tìm kiếm quản trị...
                    </span>
                  </div>
                  <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground group-data-[collapsible=icon]:hidden sm:inline-flex">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 group-data-[collapsible=icon]:hidden">
            Nghiệp vụ quản trị
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link to={item.href} />}
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "cursor-pointer rounded-xl transition-all font-medium",
                        isActive && "font-semibold"
                      )}
                    >
                      <item.icon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="truncate flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="group-data-[collapsible=icon]:hidden ml-auto">
                          <Badge
                            variant={item.badge === "Live" ? "default" : "outline"}
                            className={cn(
                              "text-[10px] px-1.5 py-0 rounded-full",
                              item.badge === "Live" && "bg-primary text-primary-foreground animate-pulse"
                            )}
                          >
                            {item.badge}
                          </Badge>
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── System Live Card ──────────────────────────────────────────────── */}
        <SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent>
            <div className="mx-2 rounded-2xl border border-border/80 bg-sidebar-accent/30 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-semibold text-foreground">WebSocket Live</span>
                </div>
                <RadioIcon className="size-3.5 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Đang nhận tín hiệu giải phóng ghế tự động (Cron 60s) và trạng thái thanh toán PayOS.
              </p>
              <div className="pt-1">
                <Link
                  to="/thong-tin-thi-sinh"
                  className="flex items-center justify-between text-xs font-medium text-foreground/80 hover:text-foreground hover:underline transition-colors py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <ArrowRightLeftIcon className="size-3 text-muted-foreground" />
                    Giao diện Thí sinh
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">Xem →</span>
                </Link>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer: Admin Profile Dropdown ─────────────────────────────────── */}
      <SidebarSeparator />
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-2.5 py-2",
                  "cursor-pointer outline-none select-none",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  "transition-colors duration-150",
                  "focus-visible:ring-2 focus-visible:ring-ring"
                )}
                aria-label={`Menu quản trị viên — ${user.name}`}
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex min-w-0 flex-1 flex-col text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {user.name}
                    </span>
                  </div>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email || user.username || "admin@vinhuni.edu.vn"}
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
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-9 shrink-0 ring-2 ring-primary/25">
                      <AvatarFallback className="rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col text-left leading-tight gap-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-semibold text-foreground">
                          {user.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] rounded-full px-1.5 py-0 shrink-0 font-medium">
                          Admin
                        </Badge>
                      </div>
                      <span className="truncate text-[11px] text-muted-foreground font-mono">
                        {user.email || user.username || "admin@vinhuni.edu.vn"}
                      </span>
                    </div>
                  </div>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem
                    render={<Link to="/thong-tin-thi-sinh" />}
                    className="cursor-pointer rounded-xl gap-2 text-xs"
                  >
                    <ArrowRightLeftIcon className="size-4 text-primary" aria-hidden="true" />
                    <div className="flex flex-col">
                      <span className="font-medium">Góc nhìn thí sinh</span>
                      <span className="text-[10px] text-muted-foreground">Chế độ xem trước chỉ đọc</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    render={<Link to="/tai-khoan-cua-toi" />}
                    className="cursor-pointer rounded-xl gap-2 text-xs"
                  >
                    <SettingsIcon className="size-4 text-primary" aria-hidden="true" />
                    <span>Thiết lập tài khoản quản trị</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setIsAuditLogOpen(true)}
                    className="cursor-pointer rounded-xl gap-2 text-xs"
                  >
                    <HistoryIcon className="size-4 text-primary" aria-hidden="true" />
                    <span>Lịch sử thao tác của tôi</span>
                  </DropdownMenuItem>


                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer rounded-xl gap-2 text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => setIsLogoutDialogOpen(true)}
                >
                  <LogOutIcon className="size-4" aria-hidden="true" />
                  <span>Đăng xuất</span>
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

      <AdminAuditLogDialog
        open={isAuditLogOpen}
        onOpenChange={setIsAuditLogOpen}
      />
    </Sidebar>
  );
}
