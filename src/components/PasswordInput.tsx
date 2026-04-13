import * as React from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  showStrength?: boolean;
}

const requirements = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "Uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "Number", test: (v: string) => /[0-9]/.test(v) },
  { label: "Special character (!@#$...)", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showStrength = false, value, onChange, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const val = typeof value === "string" ? value : "";
    const met = requirements.filter((r) => r.test(val)).length;
    const strength = val.length === 0 ? 0 : met <= 2 ? 1 : met <= 3 ? 2 : met <= 4 ? 3 : 4;
    const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
    const strengthColor = ["", "bg-destructive", "bg-orange-400", "bg-yellow-400", "bg-green-500"][strength];

    return (
      <div className="space-y-2">
        <div className="relative">
          <input
            type={visible ? "text" : "password"}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              className
            )}
            ref={ref}
            value={value}
            onChange={onChange}
            {...props}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible(!visible)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {showStrength && val.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn("h-1 flex-1 rounded-full transition-colors", i <= strength ? strengthColor : "bg-muted")}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{strengthLabel}</span>
            </div>
            <ul className="space-y-0.5">
              {requirements.map((req) => (
                <li key={req.label} className={cn("text-xs flex items-center gap-1.5", req.test(val) ? "text-green-500" : "text-muted-foreground")}>
                  <span>{req.test(val) ? "✓" : "○"}</span>
                  {req.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
