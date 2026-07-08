import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: ReactNode;
  indicatorVariant?: "brand" | "onPrimary" | "muted";
};

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  function LoadingButton(
    {
      loading = false,
      loadingLabel,
      children,
      className = "",
      disabled,
      indicatorVariant = "onPrimary",
      type = "button",
      ...props
    },
    ref,
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        {...props}
        disabled={isDisabled}
        aria-busy={loading}
        className={`${className} ${loading ? "cursor-wait !opacity-100" : ""}`}
      >
        {loading ? (
          <span className="inline-flex items-center justify-center gap-2.5">
            <LoadingIndicator
              size="sm"
              variant={indicatorVariant}
              label={
                typeof loadingLabel === "string"
                  ? loadingLabel
                  : typeof children === "string"
                    ? children
                    : "Cargando"
              }
            />
            <span>{loadingLabel ?? children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  },
);
