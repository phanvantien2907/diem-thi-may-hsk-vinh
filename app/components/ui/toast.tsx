/**
 * Toast component — Base UI (@base-ui/react/toast)
 *
 * Customizations (HSK Design System):
 * - Position: top-right desktop / top-center mobile (rơi xuống từ trên)
 * - Shape: rounded-2xl (khớp với button style của project)
 * - Semantic colors: soft palette per type (success/error/info/warning)
 * - Animation: drop-in từ trên, slide-up khi dismiss
 */
import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { cn } from "cn"

import { Button } from "~/components/ui/button"
import { XIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const toast = ToastPrimitive.createToastManager()

// ─── Semantic color map per toast type ───────────────────────────────────────
// Soft palette: không dùng màu thuần, đảm bảo contrast và dark mode
const TOAST_TYPE_CLASSES: Record<string, string> = {
  success:
    "bg-green-50 text-green-900 border-green-200 dark:bg-green-950/50 dark:text-green-100 dark:border-green-800/60",
  error:
    "bg-red-50 text-red-900 border-red-200 dark:bg-red-950/50 dark:text-red-100 dark:border-red-800/60",
  info:
    "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/50 dark:text-blue-100 dark:border-blue-800/60",
  warning:
    "bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-100 dark:border-yellow-800/60",
  loading:
    "bg-muted text-foreground border-border",
}

// Icon color per type
const TOAST_ICON_CLASSES: Record<string, string> = {
  success: "text-green-600 dark:text-green-400",
  error:   "text-red-600 dark:text-red-400",
  info:    "text-blue-600 dark:text-blue-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  loading: "text-muted-foreground",
}

// ─── Provider / Portal ────────────────────────────────────────────────────────

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />
}

// ─── Viewport — top-center (mobile) / top-right (sm+) ────────────────────────
function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        // Mobile: horizontally centered, top-4
        "pointer-events-none fixed inset-x-4 top-4 z-50 mx-auto w-auto max-w-sm outline-none",
        // Desktop: right-aligned
        "sm:inset-x-auto sm:right-4 sm:left-auto sm:mx-0 sm:w-full",
        className
      )}
      {...props}
    />
  )
}

// ─── Toast Root — shape + top-drop animation ──────────────────────────────────
function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        // Base layout — anchored to top of viewport stack
        "group/toast pointer-events-auto absolute right-0 top-0 z-[calc(1000-var(--toast-index))] w-full",
        // Shape
        "rounded-2xl border shadow-lg",
        // Default colors (overridden by semantic classes in ToastList)
        "bg-popover text-popover-foreground border-border",
        // Performance
        "will-change-transform outline-none select-none",
        // Focus ring
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        // CSS variable setup for stacking
        "[--gap:0.5rem]",
        "[--height:var(--toast-frontmost-height,var(--toast-height))]",
        "[--offset-y:calc(var(--toast-offset-y)+calc(var(--toast-index)*var(--gap))+var(--toast-swipe-movement-y))]",
        "[--peek:0.5rem]",
        "[--scale:calc(max(0,1-(var(--toast-index)*0.05)))]",
        "[--shrink:calc(1-var(--scale))]",
        // Stacked height + transform (top-anchored)
        "h-(--height) origin-top",
        "[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+(var(--toast-index)*var(--peek))+(var(--shrink)*var(--height))))_scale(var(--scale))]",
        "[transition:transform_450ms_cubic-bezier(0.22,1,0.36,1),opacity_450ms,height_150ms]",
        // Pseudo-element spacer above (for hover-expand)
        "after:absolute after:bottom-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        // Expanded state (on hover)
        "data-expanded:h-(--toast-height)",
        "data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
        // Limited state (too many toasts)
        "data-limited:opacity-0",
        // ── Enter animation: drop in from ABOVE ────────────────────────────
        "data-starting-style:[transform:translateY(-120%)] data-starting-style:opacity-0",
        // ── Exit animation: slide UP and out ──────────────────────────────
        "[[data-ending-style]:not([data-limited]):not([data-swipe-direction])&]:[transform:translateY(-120%)] [[data-ending-style]:not([data-limited]):not([data-swipe-direction])&]:opacity-0",
        // Swipe exits
        "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        // Expanded swipe exits
        "data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        className
      )}
      {...props}
    />
  )
}

// ─── Content wrapper — compact padding ────────────────────────────────────────
function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        "flex h-full items-center gap-3 overflow-hidden px-5 py-3",
        "transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "data-behind:opacity-0 data-expanded:opacity-100",
        className
      )}
      {...props}
    />
  )
}

// ─── Title ────────────────────────────────────────────────────────────────────
function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-sm font-semibold leading-snug", className)}
      {...props}
    />
  )
}

// ─── Description — inherits container text color at 75% opacity ───────────────
function ToastDescription({
  className,
  ...props
}: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-xs opacity-75 leading-snug", className)}
      {...props}
    />
  )
}

// ─── Action ───────────────────────────────────────────────────────────────────
function ToastAction({
  className,
  render = <Button variant="outline" size="sm" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn("shrink-0", className)}
      {...props}
    />
  )
}

// ─── Close button — adaptive opacity ─────────────────────────────────────────
function ToastClose({
  className,
  children,
  render = <Button variant="ghost" size="icon-sm" />,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Đóng thông báo"
      render={render}
      className={cn(
        "relative shrink-0 opacity-50 transition-opacity hover:opacity-100",
        "after:absolute after:-inset-2 after:content-['']",
        className
      )}
      {...props}
    >
      {children ?? <XIcon aria-hidden="true" />}
    </ToastPrimitive.Close>
  )
}

// ─── Icon — semantic color per type ──────────────────────────────────────────
function ToastIcon({ type }: { type: string | undefined }) {
  const colorClass = type ? (TOAST_ICON_CLASSES[type] ?? "") : ""

  let icon: React.ReactNode = null

  if (type === "success") icon = <CircleCheckIcon aria-hidden="true" />
  if (type === "info")    icon = <InfoIcon aria-hidden="true" />
  if (type === "warning") icon = <TriangleAlertIcon aria-hidden="true" />
  if (type === "error")   icon = <OctagonXIcon aria-hidden="true" />
  if (type === "loading") icon = <Loader2Icon className="animate-spin" aria-hidden="true" />

  if (!icon) return null

  return (
    <span
      data-slot="toast-icon"
      className={cn(
        "shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        colorClass
      )}
    >
      {icon}
    </span>
  )
}

// ─── ToastList — semantic className injected per type ────────────────────────
function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()

  return toasts.map((toastItem) => {
    // Semantic background/text/border per type
    const typeClass = toastItem.type
      ? (TOAST_TYPE_CLASSES[toastItem.type] ?? "")
      : ""

    return (
      <Toast key={toastItem.id} toast={toastItem} className={typeClass}>
        <ToastContent>
          <ToastIcon type={toastItem.type} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <ToastTitle />
            <ToastDescription />
          </div>
          <ToastAction />
          <ToastClose />
        </ToastContent>
      </Toast>
    )
  })
}

// ─── Toaster — main export, wraps everything ─────────────────────────────────
function Toaster({
  children,
  toastManager = toast,
  ...props
}: ToastPrimitive.Provider.Props) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  )
}

const createToastManager = ToastPrimitive.createToastManager
const useToastManager = ToastPrimitive.useToastManager

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
}
