import * as React from "react"
import { cn } from "cn"

import { Button } from "~/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="Phân trang"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      variant={isActive ? "default" : "ghost"}
      size={size}
      className={cn("rounded-full cursor-pointer", className)}
      nativeButton={false}
      render={
        <a
          aria-current={isActive ? "page" : undefined}
          data-slot="pagination-link"
          data-active={isActive}
          {...props}
        />
      }
    />
  )
}

type PaginationButtonProps = {
  isActive?: boolean
} & React.ComponentProps<typeof Button>

function PaginationButton({
  className,
  isActive,
  size = "icon",
  variant,
  ...props
}: PaginationButtonProps) {
  return (
    <Button
      variant={variant || (isActive ? "default" : "ghost")}
      size={size}
      className={cn(
        "rounded-full cursor-pointer transition-all select-none",
        isActive && "shadow-xs font-semibold",
        className
      )}
      aria-current={isActive ? "page" : undefined}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  text = "Trước",
  ...props
}: React.ComponentProps<typeof PaginationButton> & { text?: string }) {
  return (
    <PaginationButton
      aria-label="Trang trước"
      variant="outline"
      size="sm"
      className={cn("gap-1 pl-2.5 pr-3 text-xs rounded-full cursor-pointer", className)}
      {...props}
    >
      <ChevronLeftIcon className="size-3.5" />
      <span className="hidden sm:inline">{text}</span>
    </PaginationButton>
  )
}

function PaginationNext({
  className,
  text = "Sau",
  ...props
}: React.ComponentProps<typeof PaginationButton> & { text?: string }) {
  return (
    <PaginationButton
      aria-label="Trang sau"
      variant="outline"
      size="sm"
      className={cn("gap-1 pl-3 pr-2.5 text-xs rounded-full cursor-pointer", className)}
      {...props}
    >
      <span className="hidden sm:inline">{text}</span>
      <ChevronRightIcon className="size-3.5" />
    </PaginationButton>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-8 items-center justify-center text-muted-foreground [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <MoreHorizontalIcon />
      <span className="sr-only">Thêm trang</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationButton,
  PaginationNext,
  PaginationPrevious,
}
