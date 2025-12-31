import { Button } from "@react-email/components";

const EmailButton = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => {
  return (
    <Button
      className="bg-[#5A5A5A] rounded-[16px] text-white text-[16px] font-medium no-underline text-center block px-6 py-3"
      href={href}
    >
      {children}
    </Button>
  );
};

export default EmailButton;
