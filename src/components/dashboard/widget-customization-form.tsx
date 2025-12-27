"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveWidgetCustomization } from "@/server/actions/widget/customization";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const widgetCustomizationSchema = z.object({
  projectId: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  backgroundColor: z.string(),
  fontFamily: z.string(),
  borderRadius: z.string(),
  buttonText: z.string(),
  buttonPosition: z.string(),
});

type WidgetCustomizationForm = z.infer<typeof widgetCustomizationSchema>;

interface WidgetCustomizationFormProps {
  projectId: string;
  initialData?: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    fontFamily: string;
    borderRadius: string;
    buttonText: string;
    buttonPosition: string;
  } | null;
}

export function WidgetCustomizationForm({
  projectId,
  initialData,
}: WidgetCustomizationFormProps) {
  const [saving, setSaving] = React.useState(false);

  const form = useForm<WidgetCustomizationForm>({
    resolver: zodResolver(widgetCustomizationSchema),
    defaultValues: {
      projectId,
      primaryColor: initialData?.primaryColor || "#000000",
      secondaryColor: initialData?.secondaryColor || "#ffffff",
      backgroundColor: initialData?.backgroundColor || "#ffffff",
      fontFamily: initialData?.fontFamily || "system-ui",
      borderRadius: initialData?.borderRadius || "8px",
      buttonText: initialData?.buttonText || "Feedback",
      buttonPosition: initialData?.buttonPosition || "bottom-right",
    },
  });

  // Watch form values for preview
  const watchedValues = form.watch();

  React.useEffect(() => {
    form.reset({
      projectId,
      primaryColor: initialData?.primaryColor || "#000000",
      secondaryColor: initialData?.secondaryColor || "#ffffff",
      backgroundColor: initialData?.backgroundColor || "#ffffff",
      fontFamily: initialData?.fontFamily || "system-ui",
      borderRadius: initialData?.borderRadius || "8px",
      buttonText: initialData?.buttonText || "Feedback",
      buttonPosition: initialData?.buttonPosition || "bottom-right",
    });
  }, [projectId, initialData, form]);

  const onSubmit = async (data: WidgetCustomizationForm) => {
    setSaving(true);
    try {
      const result = await saveWidgetCustomization(data);

      if (!result.success) {
        throw new Error(result.error || "Failed to save widget customization");
      }

      toast.success("Widget customization saved successfully!");
    } catch (error) {
      console.error("Error saving widget customization:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save widget customization",
      );
    } finally {
      setSaving(false);
    }
  };

  // Get position styles for preview
  const getPositionStyles = (position: string) => {
    if (position === "left") {
      return {
        left: "0",
        top: "50%",
        transform: "translateY(-50%)",
        writingMode: "vertical-rl",
        textOrientation: "mixed",
      };
    }
    if (position === "right") {
      return {
        right: "0",
        top: "50%",
        transform: "translateY(-50%)",
        writingMode: "vertical-rl",
        textOrientation: "mixed",
      };
    }
    const isBottom = position.includes("bottom");
    const isRight = position.includes("right");
    return {
      [isBottom ? "bottom" : "top"]: "20px",
      [isRight ? "right" : "left"]: "20px",
    };
  };

  // Get border radius for preview based on position
  const getBorderRadius = (position: string, borderRadius: string) => {
    if (position === "left") {
      // For left position, only apply border radius to right corners
      return `0 ${borderRadius} ${borderRadius} 0`;
    }
    if (position === "right") {
      // For right position, only apply border radius to left corners
      return `${borderRadius} 0 0 ${borderRadius}`;
    }
    // For corner positions, keep full border radius
    return borderRadius;
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Widget Customization</CardTitle>
          <CardDescription>
            Customize the appearance of the feedback widget on your website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Controller
                  name="primaryColor"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="primaryColor">
                        Primary Color
                      </FieldLabel>
                      <div className="flex gap-2">
                        <Input
                          {...field}
                          id="primaryColor"
                          type="color"
                          className="w-20 h-10"
                          aria-invalid={fieldState.invalid}
                        />
                        <Input
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="#000000"
                          aria-invalid={fieldState.invalid}
                        />
                      </div>
                      {fieldState.invalid && (
                        <FieldError
                          errors={
                            fieldState.error
                              ? [{ message: fieldState.error.message }]
                              : undefined
                          }
                        />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="secondaryColor"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="secondaryColor">
                        Secondary Color
                      </FieldLabel>
                      <div className="flex gap-2">
                        <Input
                          {...field}
                          id="secondaryColor"
                          type="color"
                          className="w-20 h-10"
                          aria-invalid={fieldState.invalid}
                        />
                        <Input
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="#ffffff"
                          aria-invalid={fieldState.invalid}
                        />
                      </div>
                      {fieldState.invalid && (
                        <FieldError
                          errors={
                            fieldState.error
                              ? [{ message: fieldState.error.message }]
                              : undefined
                          }
                        />
                      )}
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="backgroundColor"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="backgroundColor">
                      Background Color
                    </FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        {...field}
                        id="backgroundColor"
                        type="color"
                        className="w-20 h-10"
                        aria-invalid={fieldState.invalid}
                      />
                      <Input
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="#ffffff"
                        aria-invalid={fieldState.invalid}
                      />
                    </div>
                    {fieldState.invalid && (
                      <FieldError
                        errors={
                          fieldState.error
                            ? [{ message: fieldState.error.message }]
                            : undefined
                        }
                      />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="fontFamily"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fontFamily">Font Family</FieldLabel>
                    <Input
                      {...field}
                      id="fontFamily"
                      placeholder="system-ui, Arial, sans-serif"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError
                        errors={
                          fieldState.error
                            ? [{ message: fieldState.error.message }]
                            : undefined
                        }
                      />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="borderRadius"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="borderRadius">
                      Border Radius
                    </FieldLabel>
                    <Input
                      {...field}
                      id="borderRadius"
                      placeholder="8px"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError
                        errors={
                          fieldState.error
                            ? [{ message: fieldState.error.message }]
                            : undefined
                        }
                      />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="buttonText"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="buttonText">Button Text</FieldLabel>
                    <Input
                      {...field}
                      id="buttonText"
                      placeholder="Feedback"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError
                        errors={
                          fieldState.error
                            ? [{ message: fieldState.error.message }]
                            : undefined
                        }
                      />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="buttonPosition"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="buttonPosition">
                      Button Position
                    </FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="buttonPosition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">
                          Bottom Right
                        </SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="top-left">Top Left</SelectItem>
                        <SelectItem value="left">Left (Vertical)</SelectItem>
                        <SelectItem value="right">Right (Vertical)</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <FieldError
                        errors={
                          fieldState.error
                            ? [{ message: fieldState.error?.message }]
                            : undefined
                        }
                      />
                    )}
                  </Field>
                )}
              />

              <Button type="submit" loading={saving}>
                Save Widget Customization
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            See how your widget will appear on your website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-[500px] border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
            {/* Simulated website content */}
            <div className="p-6 h-full">
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded w-full mt-6"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4/5"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
              </div>
            </div>

            {/* Widget preview button */}
            <div
              className="absolute transition-all duration-200"
              style={
                {
                  ...getPositionStyles(watchedValues.buttonPosition),
                  backgroundColor: watchedValues.primaryColor,
                  color: watchedValues.secondaryColor,
                  padding:
                    watchedValues.buttonPosition === "left" ||
                    watchedValues.buttonPosition === "right"
                      ? "24px 12px"
                      : "12px 24px",
                  borderRadius: getBorderRadius(
                    watchedValues.buttonPosition,
                    watchedValues.borderRadius,
                  ),
                  fontFamily: watchedValues.fontFamily,
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  whiteSpace: "nowrap",
                } as React.CSSProperties
              }
            >
              {watchedValues.buttonText || "Feedback"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
