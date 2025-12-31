"use client";

import { submitFeedback } from "@/server/actions/widget/submit";
import { uploadImage } from "@/server/actions/widget/upload";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { getBaseUrlClient } from "@/lib/base-url.client";
import { widgetSubmitFormSchema } from "@/lib/schemas";
import { X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type FormValues = z.infer<typeof widgetSubmitFormSchema>;

export default function WidgetEmbedPageContent() {
  const [projectKey] = useQueryState("projectKey", {
    defaultValue: "",
  });
  const [url] = useQueryState("url", {
    defaultValue: "",
  });

  const [screenshot, setScreenshot] = React.useState<string | null>(null);
  const [isClosing, setIsClosing] = React.useState(false);

  // Listen for screenshot data from parent window via postMessage
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from any origin for now (you can add origin check if needed)
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
  // Annotation feature disabled - canvas state removed
  // const [canvas, setCanvas] = React.useState<unknown>(null);
  // const [fabricLoaded, setFabricLoaded] = React.useState(false);
  // const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(widgetSubmitFormSchema),
    defaultValues: {
      title: "",
      description: "",
      name: "",
      email: "",
    },
  });

  // Annotation feature disabled - canvas initialization commented out
  // React.useEffect(() => {
  //   import("fabric").then(() => {
  //     setFabricLoaded(true);
  //   });
  // }, []);

  // React.useEffect(() => {
  //   if (!fabricLoaded || !canvasRef.current || !screenshot) return;
  //   // ... canvas initialization code
  // }, [fabricLoaded, screenshot]);

  // Annotation feature disabled - tool handlers commented out
  // const addArrow = async () => { ... };
  // const addRectangle = async () => { ... };
  // const addCircle = async () => { ... };
  // const clearAnnotations = () => { ... };

  const onSubmit = async (data: FormValues) => {
    if (!screenshot) return;

    setIsSubmitting(true);

    try {
      // Upload screenshot first to get a URL
      let screenshotUrl = screenshot;
      try {
        const uploadResult = await uploadImage({ image: screenshot });

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
          return "mobile";
        }
        return "desktop";
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

      // Submit feedback with the URL
      const result = await submitFeedback({
        projectKey,
        title: data.title,
        description: data.description,
        screenshot: screenshotUrl,
        annotations: undefined,
        userName: data.name || undefined,
        userEmail: data.email || undefined,
        url,
        userAgent: navigator.userAgent,
        deviceInfo,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to submit feedback");
      }

      // Show success message
      toast.success("Feedback submitted successfully!");

      // Close modal after a short delay to show the success message
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
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
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 transition-opacity duration-300 ${
          isClosing ? "opacity-0" : "opacity-100 fade-in"
        }`}
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
                      <FieldLabel>Screenshot</FieldLabel>
                      <div className="border rounded-lg p-4 bg-gray-50 sticky top-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={screenshot}
                          alt="Screenshot"
                          className="max-w-full h-auto rounded"
                        />
                      </div>
                    </Field>
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
          href={getBaseUrlClient()}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 right-4 text-xs text-muted-foreground hover:text-foreground transition-colors z-50 flex items-center gap-2"
        >
          <HexagonIconNegative className="w-4 h-4" />
          Powered by Bug Buddy
        </Link>
      </div>
    </>
  );
}
