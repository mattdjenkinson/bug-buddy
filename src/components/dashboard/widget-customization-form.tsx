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
import { widgetCustomizationSchema } from "@/lib/schemas";
import {
  CUSTOM_WIDGET_FONT_FAMILY,
  CUSTOM_WIDGET_FONT_STYLE_ID,
  loadCustomFont,
} from "@/lib/widget-fonts";
import { saveWidgetCustomization } from "@/server/actions/widget/customization";
import { deleteFont } from "@/server/actions/widget/delete-font";
import { uploadFont } from "@/server/actions/widget/upload-font";
import { zodResolver } from "@hookform/resolvers/zod";
import posthog from "posthog-js";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type WidgetCustomizationForm = z.infer<typeof widgetCustomizationSchema>;

interface WidgetCustomizationFormProps {
  projectId: string;
  initialData?: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    fontUrl: string | null;
    fontFileName: string | null;
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
  const [uploadingFont, setUploadingFont] = React.useState(false);
  const [removingFont, setRemovingFont] = React.useState(false);
  const [customFontUrl, setCustomFontUrl] = React.useState<string | null>(
    initialData?.fontUrl || null,
  );
  const [customFontFileName, setCustomFontFileName] = React.useState<
    string | null
  >(initialData?.fontFileName || null);
  const fontInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<WidgetCustomizationForm>({
    resolver: zodResolver(widgetCustomizationSchema),
    defaultValues: {
      projectId,
      primaryColor: initialData?.primaryColor || "#000000",
      secondaryColor: initialData?.secondaryColor || "#ffffff",
      fontFamily: initialData?.fontUrl
        ? CUSTOM_WIDGET_FONT_FAMILY
        : initialData?.fontFamily === "CustomWidgetFont"
          ? CUSTOM_WIDGET_FONT_FAMILY
          : initialData?.fontFamily || "system-ui",
      fontUrl: initialData?.fontUrl || undefined,
      fontFileName: initialData?.fontFileName || undefined,
      borderRadius: initialData?.borderRadius || "8px",
      buttonText: initialData?.buttonText || "Feedback",
      buttonPosition: initialData?.buttonPosition || "bottom-right",
    },
  });

  // Watch form values for preview
  const watchedValues = form.watch();

  React.useEffect(() => {
    const fontUrl = initialData?.fontUrl || undefined;
    const fontFileName = initialData?.fontFileName || undefined;
    const hasCustomFont = !!fontUrl;
    // If custom font exists, use CUSTOM_WIDGET_FONT_FAMILY; otherwise use saved or default
    // Also handle legacy "CustomWidgetFont" name
    const savedFontFamily = initialData?.fontFamily || "system-ui";
    const fontFamily = hasCustomFont
      ? CUSTOM_WIDGET_FONT_FAMILY
      : savedFontFamily === "CustomWidgetFont"
        ? CUSTOM_WIDGET_FONT_FAMILY
        : savedFontFamily;

    form.reset({
      projectId,
      primaryColor: initialData?.primaryColor || "#000000",
      secondaryColor: initialData?.secondaryColor || "#ffffff",
      fontFamily,
      fontUrl,
      fontFileName,
      borderRadius: initialData?.borderRadius || "8px",
      buttonText: initialData?.buttonText || "Feedback",
      buttonPosition: initialData?.buttonPosition || "bottom-right",
    });
    setCustomFontUrl(initialData?.fontUrl || null);
    setCustomFontFileName(initialData?.fontFileName || null);
  }, [projectId, initialData, form]);

  // Load custom font in preview
  React.useEffect(() => {
    if (customFontUrl) {
      console.log("Loading custom font in preview:", customFontUrl);
      loadCustomFont(customFontUrl)
        .then(() => {
          console.log("Font loaded successfully in preview");
        })
        .catch((error) => {
          console.error("Failed to load custom font in preview:", error);
        });
    } else {
      // Remove style element when no custom font
      const existingStyle = document.getElementById(
        CUSTOM_WIDGET_FONT_STYLE_ID,
      );
      if (existingStyle) {
        existingStyle.remove();
      }
    }

    // Cleanup function
    return () => {
      const existingStyle = document.getElementById(
        CUSTOM_WIDGET_FONT_STYLE_ID,
      );
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [customFontUrl]);

  const handleFontUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFont(true);
    try {
      const formData = new FormData();
      formData.append("font", file);

      const result = await uploadFont(formData);

      if (!result.success) {
        throw new Error(result.error || "Failed to upload font");
      }

      if (result.url) {
        setCustomFontUrl(result.url);
        setCustomFontFileName(result.fileName || file.name);
        form.setValue("fontUrl", result.url);
        form.setValue("fontFileName", result.fileName || file.name);
        form.setValue("fontFamily", CUSTOM_WIDGET_FONT_FAMILY);
        toast.success("Font uploaded successfully!");
      }
    } catch (error) {
      console.error("Error uploading font:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload font",
      );
    } finally {
      setUploadingFont(false);
      // Reset input
      if (fontInputRef.current) {
        fontInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFont = async () => {
    const currentFontUrl = customFontUrl;

    if (!currentFontUrl) {
      return;
    }

    setRemovingFont(true);
    try {
      // Delete from blob storage
      const deleteResult = await deleteFont(currentFontUrl);

      if (!deleteResult.success) {
        console.warn("Failed to delete font from storage:", deleteResult.error);
        // Continue with removal even if blob deletion fails
      }

      // Update local state
      setCustomFontUrl(null);
      setCustomFontFileName(null);
      form.setValue("fontUrl", undefined);
      form.setValue("fontFileName", undefined);

      // Reset font family to default if it was CUSTOM_WIDGET_FONT_FAMILY
      const newFontFamily =
        form.getValues("fontFamily") === CUSTOM_WIDGET_FONT_FAMILY
          ? "system-ui"
          : form.getValues("fontFamily");
      form.setValue("fontFamily", newFontFamily);

      // Save the changes to the database
      const currentFormData = form.getValues();
      const saveResult = await saveWidgetCustomization({
        projectId: currentFormData.projectId,
        fontUrl: null, // Explicitly set to null to clear from database
        fontFileName: null, // Explicitly set to null to clear from database
        fontFamily: newFontFamily,
        // Preserve other existing values
        primaryColor: currentFormData.primaryColor,
        secondaryColor: currentFormData.secondaryColor,
        borderRadius: currentFormData.borderRadius,
        buttonText: currentFormData.buttonText,
        buttonPosition: currentFormData.buttonPosition,
      });

      if (!saveResult.success) {
        throw new Error(saveResult.error || "Failed to save changes");
      }

      toast.success("Custom font removed");
    } catch (error) {
      console.error("Error removing font:", error);
      toast.error("Failed to remove font. Please try again.");
    } finally {
      setRemovingFont(false);
    }
  };

  const onSubmit = async (data: WidgetCustomizationForm) => {
    setSaving(true);
    try {
      // Ensure fontUrl and fontFileName are included from the current state
      const submitData = {
        ...data,
        fontUrl: customFontUrl || undefined,
        fontFileName: customFontFileName || undefined,
      };

      const result = await saveWidgetCustomization(submitData);

      if (!result.success) {
        throw new Error(result.error || "Failed to save widget customization");
      }

      toast.success("Widget customization saved successfully!");

      // Track widget customization save
      posthog.capture("widget_customization_saved", {
        project_id: data.projectId,
        button_position: data.buttonPosition,
        has_custom_font: !!customFontUrl,
      });
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
                name="fontFamily"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fontFamily">Font Family</FieldLabel>
                    <Input
                      {...field}
                      id="fontFamily"
                      placeholder="system-ui, Arial, sans-serif"
                      disabled={!!customFontUrl}
                      aria-invalid={fieldState.invalid}
                    />
                    {customFontUrl && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Font family is set to &quot;{CUSTOM_WIDGET_FONT_FAMILY}
                        &quot; for your custom font
                      </p>
                    )}
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

              <Field>
                <FieldLabel htmlFor="fontUpload">
                  Custom Font (Optional)
                </FieldLabel>
                <div className="space-y-2">
                  {customFontUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            Custom Font Loaded
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {customFontFileName || "Custom font"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveFont}
                          disabled={uploadingFont || removingFont}
                          loading={removingFont}
                        >
                          Remove
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Font family has been set to &quot;
                        {CUSTOM_WIDGET_FONT_FAMILY}&quot; automatically
                      </p>
                    </div>
                  ) : (
                    <>
                      <Input
                        ref={fontInputRef}
                        id="fontUpload"
                        type="file"
                        accept=".woff,.woff2,.ttf,.otf"
                        onChange={handleFontUpload}
                        disabled={uploadingFont}
                      />
                      <p className="text-xs text-muted-foreground">
                        Supported formats: WOFF, WOFF2, TTF, OTF (max 2MB)
                      </p>
                    </>
                  )}
                </div>
              </Field>

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
                  fontFamily: customFontUrl
                    ? `${CUSTOM_WIDGET_FONT_FAMILY}, ${watchedValues.fontFamily || "system-ui"}`
                    : watchedValues.fontFamily || "system-ui",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  whiteSpace: "nowrap",
                  zIndex: 999999,
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
