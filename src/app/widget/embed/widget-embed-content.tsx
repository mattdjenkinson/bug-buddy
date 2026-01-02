"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { HexagonIconNegative } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { widgetSubmitFormSchema } from "@/lib/schemas";
import { submitWidgetFeedback } from "@/server/actions/widget/submit";
import { uploadWidgetImage } from "@/server/actions/widget/upload";
import { X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type FormValues = z.infer<typeof widgetSubmitFormSchema>;

interface WidgetEmbedPageContentProps {
  projectKey: string;
  url: string;
  secretKey: string | null;
  baseUrl: string;
  githubIntegration: {
    repositoryOwner: string;
    repositoryName: string;
    isPublic: boolean;
  } | null;
}

export default function WidgetEmbedPageContent({
  projectKey: initialProjectKey,
  url: initialUrl,
  secretKey,
  baseUrl,
  githubIntegration,
}: WidgetEmbedPageContentProps) {
  const [projectKey] = useQueryState("projectKey", {
    defaultValue: initialProjectKey,
  });
  const [url] = useQueryState("url", {
    defaultValue: initialUrl,
  });

  const [screenshot, setScreenshot] = React.useState<string | null>(null);
  const [isClosing, setIsClosing] = React.useState(false);
  const [isAnnotationDialogOpen, setIsAnnotationDialogOpen] =
    React.useState(false);
  const [annotations, setAnnotations] = React.useState<
    Array<{ id: string; x: number; y: number; text: string; number: number }>
  >([]);
  const annotationImageRef = React.useRef<HTMLImageElement | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Listen for screenshot data from parent window via postMessage
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "bug-buddy-screenshot") {
        if (event.data.screenshot) {
          setScreenshot(event.data.screenshot);
        }
      }
    };

    // Set up listener immediately
    window.addEventListener("message", handleMessage);

    // Also request screenshot if parent window is available
    // Request multiple times to ensure parent receives it
    const requestScreenshot = () => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "bug-buddy-ready" }, "*");
      }
    };

    requestScreenshot();
    setTimeout(requestScreenshot, 100);
    setTimeout(requestScreenshot, 500);

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Function to add annotation marker
  const handleScreenshotClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!annotationImageRef.current) return;

    const rect = annotationImageRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100; // Percentage
    const y = ((event.clientY - rect.top) / rect.height) * 100; // Percentage

    const newAnnotation = {
      id: Math.random().toString(36).substring(7),
      x,
      y,
      text: "",
      number: annotations.length + 1,
    };

    setAnnotations([...annotations, newAnnotation]);
  };

  // Function to update annotation text
  const updateAnnotationText = (id: string, text: string) => {
    setAnnotations(
      annotations.map((ann) => (ann.id === id ? { ...ann, text } : ann)),
    );
  };

  // Function to remove annotation
  const removeAnnotation = (id: string) => {
    const filtered = annotations.filter((ann) => ann.id !== id);
    // Renumber annotations
    const renumbered = filtered.map((ann, index) => ({
      ...ann,
      number: index + 1,
    }));
    setAnnotations(renumbered);
  };

  // Function to bake annotations into screenshot
  const bakeAnnotationsIntoScreenshot = async (
    base64Image: string,
  ): Promise<string> => {
    if (annotations.length === 0) return base64Image;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Draw the original image
        ctx.drawImage(img, 0, 0);

        // Draw annotations
        annotations.forEach((annotation) => {
          const x = (annotation.x / 100) * canvas.width;
          const y = (annotation.y / 100) * canvas.height;

          // Calculate marker size based on image dimensions for better visibility
          const markerRadius = Math.max(
            24,
            Math.min(canvas.width, canvas.height) * 0.02,
          );
          const fontSize = Math.max(20, markerRadius * 1.2);

          // Draw marker circle (much bigger)
          ctx.fillStyle = "#ef4444"; // red-500
          ctx.beginPath();
          ctx.arc(x, y, markerRadius, 0, 2 * Math.PI);
          ctx.fill();

          // Draw white border (thicker)
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = Math.max(4, markerRadius * 0.15);
          ctx.stroke();

          // Draw number (much bigger and bolder)
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(annotation.number.toString(), x, y);
        });

        // Convert to base64
        const dataUrl = canvas.toDataURL("image/png");
        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = base64Image;
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(widgetSubmitFormSchema),
    defaultValues: {
      title: "",
      description: "",
      name: "",
      email: "",
      githubUsername: "",
    },
  });

  // React Query mutation for submitting feedback
  const submitMutation = useMutation({
    mutationFn: async (data: {
      projectKey: string;
      title: string;
      description: string;
      screenshot: string;
      annotations?: string;
      userName?: string;
      userEmail?: string;
      githubUsername?: string;
      url?: string;
      userAgent: string;
      deviceInfo: {
        deviceType: string;
        browser: string;
        screenSize: { width: number; height: number };
        viewportSize: { width: number; height: number };
        os: string;
        zoomLevel: number;
        pixelRatio: number;
      };
    }) => {
      if (!secretKey) {
        throw new Error("Secret key not available");
      }

      const result = await submitWidgetFeedback({
        ...data,
        secretKey,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to submit feedback");
      }

      return result;
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!screenshot) return;

    setIsSubmitting(true);

    try {
      // Bake annotations into screenshot
      let finalScreenshot = screenshot;
      if (annotations.length > 0) {
        try {
          finalScreenshot = await bakeAnnotationsIntoScreenshot(screenshot);
        } catch (error) {
          console.error("Error baking annotations into screenshot:", error);
          // Continue with original screenshot if baking fails
        }
      }

      // Upload screenshot first to get a URL
      let screenshotUrl = finalScreenshot;
      try {
        if (!secretKey) {
          throw new Error("Secret key not available");
        }

        const uploadResult = await uploadWidgetImage({
          projectKey,
          secretKey,
          image: finalScreenshot,
        });

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "Failed to upload screenshot");
        }

        if (uploadResult.url) {
          screenshotUrl = uploadResult.url;
        }
      } catch (uploadError) {
        console.error("Error uploading screenshot:", uploadError);
        // Fallback: if upload fails, try to submit with base64 (may fail if too large)
        console.warn(
          "Falling back to base64 screenshot (may exceed size limit)",
        );
      }

      // Capture device information
      const getDeviceType = (): string => {
        const ua = navigator.userAgent.toLowerCase();
        if (/tablet|ipad|playbook|silk/i.test(ua)) {
          return "tablet";
        }
        if (
          /mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(
            ua,
          )
        ) {
          return "Mobile";
        }
        return "Desktop";
      };

      const getBrowserInfo = (): string => {
        const ua = navigator.userAgent;
        const browserRegex = [
          { name: "Chrome", regex: /Chrome\/([\d.]+)/ },
          { name: "Firefox", regex: /Firefox\/([\d.]+)/ },
          { name: "Safari", regex: /Version\/([\d.]+).*Safari/ },
          { name: "Edge", regex: /Edg\/([\d.]+)/ },
          { name: "Opera", regex: /(?:Opera|OPR)\/([\d.]+)/ },
        ];

        for (const browser of browserRegex) {
          const match = ua.match(browser.regex);
          if (match) {
            return `${browser.name} ${match[1]}`;
          }
        }
        return "Unknown";
      };

      const getOSInfo = (): string => {
        const ua = navigator.userAgent;
        if (/Windows NT/.test(ua)) {
          const match = ua.match(/Windows NT ([\d.]+)/);
          return match ? `Windows ${match[1]}` : "Windows";
        }
        if (/Mac OS X/.test(ua)) {
          const match = ua.match(/Mac OS X ([\d_]+)/);
          return match ? `macOS ${match[1].replace(/_/g, ".")}` : "macOS";
        }
        if (/Linux/.test(ua)) return "Linux";
        if (/Android/.test(ua)) {
          const match = ua.match(/Android ([\d.]+)/);
          return match ? `Android ${match[1]}` : "Android";
        }
        if (/iPhone|iPad/.test(ua)) {
          const match = ua.match(/OS ([\d_]+)/);
          return match ? `iOS ${match[1].replace(/_/g, ".")}` : "iOS";
        }
        return "Unknown";
      };

      const getZoomLevel = (): number => {
        // Browser zoom level is difficult to detect accurately, especially in iframes
        // Default to 100% which is the standard zoom level
        // In the future, this could be enhanced with more sophisticated detection
        return 100;
      };

      const deviceInfo = {
        deviceType: getDeviceType(),
        browser: getBrowserInfo(),
        screenSize: {
          width: screen.width,
          height: screen.height,
        },
        viewportSize: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        os: getOSInfo(),
        zoomLevel: getZoomLevel(),
        pixelRatio: window.devicePixelRatio || 1,
      };

      // Prepare annotations JSON
      const annotationsJson =
        annotations.length > 0
          ? JSON.stringify(
              annotations.map((ann) => ({
                number: ann.number,
                x: ann.x,
                y: ann.y,
                text: ann.text,
              })),
            )
          : undefined;

      // Submit feedback using React Query mutation
      await submitMutation.mutateAsync({
        projectKey,
        title: data.title,
        description: data.description,
        screenshot: screenshotUrl,
        annotations: annotationsJson,
        userName: data.name || undefined,
        userEmail: data.email || undefined,
        githubUsername: data.githubUsername || undefined,
        url,
        userAgent: navigator.userAgent,
        deviceInfo,
      });

      // Show success message
      toast.success("Feedback submitted successfully!");

      // Close modal after a short delay to show the success message
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit feedback. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    // Wait for fade-out animation to complete before closing
    setTimeout(() => {
      if (window.parent) {
        window.parent.postMessage("bug-buddy-close", "*");
      }
    }, 300); // Match animation duration
  };

  return (
    <>
      <Toaster />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 transition-opacity duration-300 backdrop-blur-xl`}
      >
        <Card
          className={`w-full max-w-4xl max-h-[90vh] overflow-auto transition-all duration-300 ${
            isClosing
              ? "opacity-0 scale-95"
              : "opacity-100 scale-100 fade-in-scale"
          }`}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Submit Feedback</CardTitle>
                <CardDescription>Provide your feedback below.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form id="feedback-form" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6 md:grid-cols-2">
                {screenshot && (
                  <div className="order-2 md:order-1">
                    <Field>
                      <FieldLabel>
                        Screenshot (click to add annotations)
                      </FieldLabel>
                      <div className="border rounded-lg p-2 bg-background sticky top-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={screenshot}
                          alt="Screenshot"
                          className="max-w-full h-auto rounded-sm cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setIsAnnotationDialogOpen(true)}
                          title="Click to add annotations"
                        />
                        {annotations.length > 0 && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            {annotations.length} annotation
                            {annotations.length !== 1 ? "s" : ""} added
                          </div>
                        )}
                      </div>
                    </Field>
                    {githubIntegration && githubIntegration.isPublic && (
                      <div className="mt-4 hidden md:block">
                        <Controller
                          name="githubUsername"
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel htmlFor="githubUsername">
                                GitHub Username (optional)
                              </FieldLabel>
                              <Input
                                {...field}
                                id="githubUsername"
                                placeholder="your-github-username"
                                aria-invalid={fieldState.invalid}
                              />
                              <FieldDescription>
                                Add your GitHub username to be notified when
                                this issue is updated.
                              </FieldDescription>
                              {fieldState.invalid && fieldState.error && (
                                <FieldError
                                  errors={[
                                    { message: fieldState.error.message },
                                  ]}
                                />
                              )}
                            </Field>
                          )}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className={`order-1 ${screenshot ? "md:order-2" : ""}`}>
                  <FieldGroup>
                    <Controller
                      name="title"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="title">Title</FieldLabel>
                          <Input
                            {...field}
                            id="title"
                            placeholder="Brief description of the issue"
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && fieldState.error && (
                            <FieldError
                              errors={[{ message: fieldState.error.message }]}
                            />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name="description"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="description">
                            Description
                          </FieldLabel>
                          <Textarea
                            {...field}
                            id="description"
                            placeholder="Provide detailed feedback, steps to reproduce, expected behavior, etc."
                            rows={6}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && fieldState.error && (
                            <FieldError
                              errors={[{ message: fieldState.error.message }]}
                            />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name="name"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="name">
                            Name (optional)
                          </FieldLabel>
                          <Input
                            {...field}
                            id="name"
                            placeholder="Your name"
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && fieldState.error && (
                            <FieldError
                              errors={[{ message: fieldState.error.message }]}
                            />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name="email"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="email">
                            Email (optional)
                          </FieldLabel>
                          <Input
                            {...field}
                            id="email"
                            type="email"
                            placeholder="your.email@example.com"
                            aria-invalid={fieldState.invalid}
                          />
                          <FieldDescription>
                            We&apos;ll use this to follow up on your feedback if
                            needed.
                          </FieldDescription>
                          {fieldState.invalid && fieldState.error && (
                            <FieldError
                              errors={[{ message: fieldState.error.message }]}
                            />
                          )}
                        </Field>
                      )}
                    />

                    {githubIntegration && githubIntegration.isPublic && (
                      <div className="md:hidden">
                        <Controller
                          name="githubUsername"
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel htmlFor="githubUsername">
                                GitHub Username (optional)
                              </FieldLabel>
                              <Input
                                {...field}
                                id="githubUsername"
                                placeholder="your-github-username"
                                aria-invalid={fieldState.invalid}
                              />
                              <FieldDescription>
                                Add your GitHub username to be notified when
                                this issue is updated.
                              </FieldDescription>
                              {fieldState.invalid && fieldState.error && (
                                <FieldError
                                  errors={[
                                    { message: fieldState.error.message },
                                  ]}
                                />
                              )}
                            </Field>
                          )}
                        />
                      </div>
                    )}
                  </FieldGroup>
                </div>
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <div className="flex gap-2 w-full justify-end">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="feedback-form"
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                Submit Feedback
              </Button>
            </div>
          </CardFooter>
        </Card>
        <Link
          href={baseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 right-4 text-xs text-muted-foreground hover:text-foreground transition-colors z-50 flex items-center gap-2"
        >
          <HexagonIconNegative className="w-4 h-4" />
          Powered by Bug Buddy
        </Link>
      </div>

      {/* Annotation Dialog */}
      <Dialog
        open={isAnnotationDialogOpen}
        onOpenChange={setIsAnnotationDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Add Annotations</DialogTitle>
            <DialogDescription>
              Click on the screenshot to add markers. Add text for each marker
              below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative border rounded-lg p-2 bg-background">
              <div className="relative inline-block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={annotationImageRef}
                  src={screenshot || ""}
                  alt="Screenshot for annotation"
                  className="max-w-full h-auto rounded-sm cursor-crosshair block"
                  onClick={handleScreenshotClick}
                />
                {/* Render markers on the image */}
                {annotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${annotation.x}%`,
                      top: `${annotation.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                      <span className="text-white text-xs font-bold">
                        {annotation.number}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {annotations.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">Annotation Details</h3>
                {annotations.map((annotation) => (
                  <div key={annotation.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">#{annotation.number}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAnnotation(annotation.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder={`Add description for marker #${annotation.number}...`}
                      value={annotation.text}
                      onChange={(e) =>
                        updateAnnotationText(annotation.id, e.target.value)
                      }
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAnnotationDialogOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
