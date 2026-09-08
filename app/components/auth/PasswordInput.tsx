/**
 * PasswordInput — Input mật khẩu có nút toggle hiện/ẩn
 * Dùng chung cho cả Login và Register forms
 */
import * as React from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  className?: string;
}

function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="relative flex items-center">
      <Input
        type={showPassword ? "text" : "password"}
        className={cn("pr-10", className)}
        {...props}
      />
      {/* Nút toggle hiện/ẩn mật khẩu */}
      {/* Nút toggle hiện/ẩn — tabIndex mặc định (0) để keyboard users có thể dùng */}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute right-1 text-muted-foreground hover:text-foreground"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {showPassword ? (
          <EyeOffIcon data-icon="inline" />
        ) : (
          <EyeIcon data-icon="inline" />
        )}
      </Button>
    </div>
  );
}

export { PasswordInput };
