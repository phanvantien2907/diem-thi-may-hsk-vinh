/**
 * FormCombobox — Searchable combobox tích hợp với react-hook-form
 *
 * Dùng Popover (Base UI) + Command (cmdk) để tạo dropdown có tìm kiếm.
 * Style trigger khớp với SelectTrigger của shadcn.
 */
import * as React from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "~/lib/utils";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "~/components/ui/command";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeVietnamese(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function vietnameseFilter(value: string, search: string): number {
  if (!search) return 1;
  const val = value.toLowerCase();
  const s = search.toLowerCase();
  if (val.includes(s)) return 1;
  const normVal = normalizeVietnamese(value);
  const normSearch = normalizeVietnamese(search);
  if (normVal.includes(normSearch)) return 1;
  return 0;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ComboboxOption {
  value: string;
  label: string;
}

interface FormComboboxProps {
  options: ComboboxOption[];
  value?: string | number;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function FormCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Chọn...",
  searchPlaceholder = "Tìm kiếm...",
  emptyMessage = "Không tìm thấy.",
  disabled = false,
  className,
  "aria-invalid": ariaInvalid,
}: FormComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const stringValue = value !== undefined && value !== null ? String(value) : "";
  const selectedOption = options.find((opt) => String(opt.value) === stringValue);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        className={cn(
          // Match SelectTrigger styling
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          ariaInvalid &&
            "border-destructive ring-3 ring-destructive/20",
          "dark:bg-input/30 dark:hover:bg-input/50",
          className
        )}
        aria-invalid={ariaInvalid}
      >
        <span
          className={cn(
            "flex-1 truncate text-left",
            !selectedOption && "text-muted-foreground"
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent
        className="w-(--anchor-width) min-w-[200px] p-0 gap-0"
        align="start"
      >
        <Command filter={vietnameseFilter}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  data-checked={stringValue === String(opt.value) ? "true" : undefined}
                  onSelect={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
