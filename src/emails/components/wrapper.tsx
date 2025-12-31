import {
  Body,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Link,
  Tailwind,
  Text,
} from "@react-email/components";
import { emailBaseUrl } from "../utils";

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <Html>
      <Head />
      <Font
        fontFamily="Geist Mono"
        fallbackFontFamily="monospace"
        webFont={{
          url: "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700&display=swap",
          format: "woff2",
        }}
        fontWeight={400}
        fontStyle="normal"
      />
      <Tailwind>
        <Body className="bg-white font-geist-mono p-4">
          {children}
          <Container className="mx-auto py-5">
            <Hr className="border-[#E5E5E5]" />
            <Text className="text-[#8E8E8E] text-[12px] text-center">
              <Link
                href={`${emailBaseUrl}/`}
                className="text-[#8E8E8E] underline"
              >
                Bug Buddy
              </Link>{" "}
              - Feedback widget system for modern teams
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default Wrapper;
