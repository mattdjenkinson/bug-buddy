import { Container, Preview, Section, Text } from "@react-email/components";
import EmailButton from "./components/button";
import Wrapper from "./components/wrapper";
import { emailBaseUrl } from "./utils";

interface SignupEmailProps {
  email: string;
}

export const SignupEmail = ({ email }: SignupEmailProps) => (
  <Wrapper>
    <Preview>
      Welcome to Bug Buddy - Capture feedback, track bugs, and create GitHub
      issues seamlessly.
    </Preview>
    <Container className="mx-auto py-5">
      <Text className="text-[24px] font-medium leading-[32px] mb-6 text-center">
        Bug Buddy
      </Text>
      <Text className="text-[16px] leading-[26px]">Hi {email},</Text>
      <Text className="text-[16px] leading-[26px]">
        Welcome to Bug Buddy! We&apos;re excited to have you on board. Bug Buddy
        is a feedback widget system that helps you capture screenshots, collect
        user annotations, and automatically create GitHub issues from feedback.
      </Text>
      <Text className="text-[16px] leading-[26px]">
        Get started by creating your first project and embedding the feedback
        widget on your website. Your users can then submit feedback with
        screenshots and annotations, which will automatically sync to your
        GitHub repository.
      </Text>
      <Section className="text-center my-6">
        <EmailButton href={`${emailBaseUrl}/dashboard`}>
          Go to Dashboard
        </EmailButton>
      </Section>
      <Text className="text-[16px] leading-[26px]">
        Best,
        <br />
        The Bug Buddy team
      </Text>
    </Container>
  </Wrapper>
);

SignupEmail.PreviewProps = {
  email: "alan@example.com",
} as SignupEmailProps;

export default SignupEmail;
