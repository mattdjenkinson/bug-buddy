import { SignupEmail } from "@/emails/signup.email";
import { transporter } from "@/lib/mail-transporter";
import { render } from "@react-email/components";

export const SendWelcomeEmailStep = async (email: string) => {
  "use step";

  const template = await render(<SignupEmail email={email} />);

  const options = {
    from: "no-reply@notifications.bugbuddy.com",
    to: email,
    subject: "Welcome to Bug Buddy",
    html: template,
  };

  await transporter.sendMail(options);
};
