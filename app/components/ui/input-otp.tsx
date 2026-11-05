import * as React from "react";
import { MinusIcon } from "lucide-react";
import { cn } from "~/lib/utils";

interface InputOTPContextValue {
  value: string;
  maxLength: number;
  disabled?: boolean;
  mask?: boolean;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  handleSlotChange: (index: number, char: string) => void;
  handleSlotKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  registerInputRef: (index: number, el: HTMLInputElement | null) => void;
}

const InputOTPContext = React.createContext<InputOTPContextValue | null>(null);

export interface InputOTPProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
  mask?: boolean;
  autoFocus?: boolean;
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
}

export function InputOTP({
  value,
  onChange,
  onComplete,
  maxLength = 6,
  disabled = false,
  mask = true,
  autoFocus = false,
  className,
  containerClassName,
  children,
}: InputOTPProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);
  const lastCompletedValueRef = React.useRef<string>("");

  const cleanValue = React.useMemo(
    () => value.replace(/\D/g, "").slice(0, maxLength),
    [value, maxLength]
  );

  React.useEffect(() => {
    if (cleanValue.length < maxLength) {
      lastCompletedValueRef.current = "";
    } else if (
      cleanValue.length === maxLength &&
      onComplete &&
      lastCompletedValueRef.current !== cleanValue
    ) {
      lastCompletedValueRef.current = cleanValue;
      onComplete(cleanValue);
    }
  }, [cleanValue, maxLength, onComplete]);

  React.useEffect(() => {
    if (autoFocus && !disabled) {
      const targetIdx = Math.min(cleanValue.length, maxLength - 1);
      const timer = setTimeout(() => {
        inputRefs.current[targetIdx]?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled, maxLength]);

  const registerInputRef = React.useCallback((index: number, el: HTMLInputElement | null) => {
    inputRefs.current[index] = el;
  }, []);

  const focusSlot = React.useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, maxLength - 1));
      setActiveIndex(clamped);
      inputRefs.current[clamped]?.focus();
      inputRefs.current[clamped]?.select();
    },
    [maxLength]
  );

  const handleSlotChange = React.useCallback(
    (index: number, raw: string) => {
      if (disabled) return;
      const digits = raw.replace(/\D/g, "");
      if (!digits) return;

      const chars = cleanValue.split("");
      while (chars.length < maxLength) chars.push("");

      if (digits.length === 1) {
        chars[index] = digits;
        const nextVal = chars.join("").slice(0, maxLength);
        onChange(nextVal);
        if (index < maxLength - 1) {
          focusSlot(index + 1);
        }
      } else {
        // Multi-character input or mobile autofill
        for (let i = 0; i < digits.length && index + i < maxLength; i++) {
          chars[index + i] = digits[i];
        }
        const nextVal = chars.join("").slice(0, maxLength);
        onChange(nextVal);
        focusSlot(Math.min(index + digits.length, maxLength - 1));
      }
    },
    [cleanValue, disabled, focusSlot, maxLength, onChange]
  );

  const handleSlotKeyDown = React.useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      if (e.key === "Backspace") {
        e.preventDefault();
        const chars = cleanValue.split("");
        while (chars.length < maxLength) chars.push("");

        if (chars[index]) {
          chars[index] = "";
          onChange(chars.join("").replace(/\s+$/g, ""));
        } else if (index > 0) {
          chars[index - 1] = "";
          onChange(chars.join("").replace(/\s+$/g, ""));
          focusSlot(index - 1);
        }
        return;
      }

      if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        focusSlot(index - 1);
        return;
      }

      if (e.key === "ArrowRight" && index < maxLength - 1) {
        e.preventDefault();
        focusSlot(index + 1);
        return;
      }

      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        handleSlotChange(index, e.key);
      }
    },
    [cleanValue, disabled, focusSlot, handleSlotChange, maxLength, onChange]
  );

  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      e.preventDefault();
      const pasted = e.clipboardData.getData("text/plain").replace(/\D/g, "").slice(0, maxLength);
      if (!pasted) return;
      onChange(pasted);
      focusSlot(Math.min(pasted.length, maxLength - 1));
    },
    [disabled, focusSlot, maxLength, onChange]
  );

  const ctx = React.useMemo<InputOTPContextValue>(
    () => ({
      value: cleanValue,
      maxLength,
      disabled,
      mask,
      activeIndex,
      setActiveIndex,
      handleSlotChange,
      handleSlotKeyDown,
      handlePaste,
      registerInputRef,
    }),
    [
      activeIndex,
      cleanValue,
      disabled,
      handlePaste,
      handleSlotChange,
      handleSlotKeyDown,
      mask,
      maxLength,
      registerInputRef,
    ]
  );

  return (
    <InputOTPContext.Provider value={ctx}>
      <div
        data-slot="input-otp"
        className={cn(
          "flex items-center justify-center gap-2 has-disabled:opacity-50",
          containerClassName,
          className
        )}
      >
        {children}
      </div>
    </InputOTPContext.Provider>
  );
}

export function InputOTPGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center gap-1.5 sm:gap-2", className)}
      {...props}
    />
  );
}

export function InputOTPSlot({
  index,
  className,
}: {
  index: number;
  className?: string;
}) {
  const ctx = React.useContext(InputOTPContext);
  if (!ctx) {
    throw new Error("InputOTPSlot must be used within an InputOTP");
  }

  const char = ctx.value[index] ?? "";
  const isActive = ctx.activeIndex === index;

  return (
    <div className="relative flex items-center justify-center">
      <input
        ref={(el) => ctx.registerInputRef(index, el)}
        type={ctx.mask ? "password" : "text"}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={1}
        disabled={ctx.disabled}
        value={char}
        aria-label={`Chữ số PIN thứ ${index + 1}`}
        onFocus={() => ctx.setActiveIndex(index)}
        onChange={(e) => ctx.handleSlotChange(index, e.target.value)}
        onKeyDown={(e) => ctx.handleSlotKeyDown(index, e)}
        onPaste={ctx.handlePaste}
        className={cn(
          "size-10 sm:size-11 rounded-xl border border-input bg-background text-center font-mono text-base sm:text-lg font-bold text-foreground shadow-2xs transition-all outline-none select-all",
          "focus:border-ring focus:ring-3 focus:ring-ring/30",
          char && "border-primary/50 bg-primary/5",
          isActive && !ctx.disabled && "border-primary ring-2 ring-primary/20",
          ctx.disabled && "cursor-not-allowed bg-muted text-muted-foreground",
          className
        )}
      />
    </div>
  );
}

export function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" className="text-muted-foreground/50 px-0.5" {...props}>
      <MinusIcon className="size-3.5" />
    </div>
  );
}

