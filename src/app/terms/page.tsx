import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Bug Buddy",
  description: "Terms of Service for Bug Buddy",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Terms of Service</CardTitle>
          <CardDescription>
            Last updated: {new Date().toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-slate dark:prose-invert max-w-none">
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing and using Bug Buddy (&quot;the Service&quot;), you
                accept and agree to be bound by the terms and provision of this
                agreement. If you do not agree to abide by the above, please do
                not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                2. Description of Service
              </h2>
              <p>
                Bug Buddy is a feedback widget system that allows users to
                capture screenshots, add annotations, and automatically create
                GitHub issues. The Service provides a platform for collecting,
                managing, and tracking feedback and bug reports for your
                projects.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                3. User Accounts
              </h2>
              <h3 className="text-xl font-semibold mt-4 mb-2">
                3.1 Account Creation
              </h3>
              <p>
                To use certain features of the Service, you must register for an
                account. You may register using OAuth providers such as GitHub
                or Google. You agree to provide accurate, current, and complete
                information during the registration process.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                3.2 Account Security
              </h3>
              <p>
                You are responsible for maintaining the confidentiality of your
                account credentials and for all activities that occur under your
                account. You agree to notify us immediately of any unauthorized
                use of your account.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                3.3 Account Termination
              </h3>
              <p>
                We reserve the right to suspend or terminate your account at any
                time, with or without notice, for conduct that we believe
                violates these Terms of Service or is harmful to other users,
                us, or third parties, or for any other reason.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                4. Acceptable Use
              </h2>
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Transmit any harmful, offensive, or illegal content</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>
                  Attempt to gain unauthorized access to any portion of the
                  Service
                </li>
                <li>
                  Use the Service to collect or store personal data about other
                  users without their consent
                </li>
                <li>
                  Use automated systems to access the Service in a manner that
                  sends more request messages than a human could reasonably
                  produce
                </li>
                <li>
                  Impersonate any person or entity or misrepresent your
                  affiliation with any person or entity
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                5. User Content
              </h2>
              <h3 className="text-xl font-semibold mt-4 mb-2">5.1 Ownership</h3>
              <p>
                You retain ownership of any content you submit, post, or display
                on or through the Service, including feedback, screenshots,
                annotations, and other materials (&quot;User Content&quot;).
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                5.2 License to Us
              </h3>
              <p>
                By submitting User Content, you grant us a worldwide,
                non-exclusive, royalty-free license to use, reproduce, modify,
                adapt, publish, translate, and distribute such User Content for
                the purpose of providing and improving the Service.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                5.3 Content Responsibility
              </h3>
              <p>
                You are solely responsible for your User Content and the
                consequences of posting or publishing it. You represent and
                warrant that you have all necessary rights to grant the license
                set forth above and that your User Content does not violate any
                third-party rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                6. GitHub Integration
              </h2>
              <p>
                The Service may integrate with GitHub to create issues
                automatically. By using this feature, you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Comply with GitHub&apos;s Terms of Service and applicable
                  policies
                </li>
                <li>
                  Grant us necessary permissions to create issues in your
                  repositories
                </li>
                <li>
                  Ensure you have the right to create issues in the repositories
                  you connect
                </li>
                <li>
                  Understand that we are not responsible for any issues created
                  in your GitHub repositories
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                7. Intellectual Property
              </h2>
              <p>
                The Service and its original content, features, and
                functionality are and will remain the exclusive property of Bug
                Buddy and its licensors. The Service is protected by copyright,
                trademark, and other laws. Our trademarks and trade dress may
                not be used in connection with any product or service without
                our prior written consent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                8. Payment and Billing
              </h2>
              <p>
                If the Service offers paid features, you agree to pay all fees
                associated with your use of such features. All fees are
                non-refundable unless otherwise stated. We reserve the right to
                change our pricing with reasonable notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                9. Service Availability
              </h2>
              <p>
                We strive to provide reliable service but do not guarantee that
                the Service will be available at all times. The Service may be
                unavailable due to maintenance, updates, or circumstances beyond
                our control. We are not liable for any loss or damage resulting
                from Service unavailability.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                10. Limitation of Liability
              </h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, BUG BUDDY SHALL NOT BE
                LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER
                INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE,
                GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF
                THE SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                11. Indemnification
              </h2>
              <p>
                You agree to indemnify and hold harmless Bug Buddy, its
                officers, directors, employees, and agents from any claims,
                damages, losses, liabilities, and expenses (including legal
                fees) arising out of or relating to your use of the Service,
                your User Content, or your violation of these Terms of Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                12. Modifications to Terms
              </h2>
              <p>
                We reserve the right to modify these Terms of Service at any
                time. We will notify users of any material changes by posting
                the new Terms of Service on this page and updating the
                &quot;Last updated&quot; date. Your continued use of the Service
                after such modifications constitutes your acceptance of the
                updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                13. Termination
              </h2>
              <p>
                We may terminate or suspend your account and access to the
                Service immediately, without prior notice or liability, for any
                reason, including if you breach these Terms of Service. Upon
                termination, your right to use the Service will cease
                immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                14. Governing Law
              </h2>
              <p>
                These Terms of Service shall be governed by and construed in
                accordance with the laws of the jurisdiction in which Bug Buddy
                operates, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                15. Contact Information
              </h2>
              <p>
                If you have any questions about these Terms of Service, please
                contact us through the support channels provided in the Service.
              </p>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
