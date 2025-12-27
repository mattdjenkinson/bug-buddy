import { cn } from "@/lib/utils";
import * as React from "react";

const Field = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "vertical" | "horizontal";
    invalid?: boolean;
  }
>(({ className, orientation = "vertical", invalid, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-invalid={invalid}
      className={cn(
        "flex flex-col gap-2",
        orientation === "horizontal" &&
          "flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4",
        invalid && "data-[invalid=true]:text-destructive",
        className,
      )}
      {...props}
    />
  );
});
Field.displayName = "Field";

const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
});
FieldLabel.displayName = "FieldLabel";

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});
FieldDescription.displayName = "FieldDescription";

const FieldError = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    errors?: Array<{ message?: string }>;
  }
>(({ className, errors, ...props }, ref) => {
  if (!errors || errors.length === 0) return null;

  return (
    <div
      ref={ref}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {errors.map((error, index) => (
        <p key={index}>{error.message}</p>
      ))}
    </div>
  );
});
FieldError.displayName = "FieldError";

const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("space-y-4", className)} {...props} />;
});
FieldGroup.displayName = "FieldGroup";

const FieldSet = React.forwardRef<
  HTMLFieldSetElement,
  React.FieldsetHTMLAttributes<HTMLFieldSetElement>
>(({ className, ...props }, ref) => {
  return (
    <fieldset ref={ref} className={cn("space-y-4", className)} {...props} />
  );
});
FieldSet.displayName = "FieldSet";

const FieldLegend = React.forwardRef<
  HTMLLegendElement,
  React.HTMLAttributes<HTMLLegendElement> & {
    variant?: "label" | "default";
  }
>(({ className, variant = "default", ...props }, ref) => {
  return (
    <legend
      ref={ref}
      className={cn(
        variant === "label"
          ? "text-sm font-medium leading-none"
          : "text-base font-semibold",
        className,
      )}
      {...props}
    />
  );
});
FieldLegend.displayName = "FieldLegend";

const FieldContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("flex-1", className)} {...props} />;
});
FieldContent.displayName = "FieldContent";

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
};
