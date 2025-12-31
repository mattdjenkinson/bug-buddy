import { SendWelcomeEmailStep } from "../../steps/emails/send-welcome-email.step";

export const sendWelcomeEmailWorkflow = async (email: string) => {
  "use workflow";
  console.log("Starting send welcome email workflow", { email });
  await SendWelcomeEmailStep(email);
  console.log("Send welcome email workflow completed", { email });

  return { status: "done" };
};
