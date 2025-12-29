import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Bug Buddy",
  description: "Privacy Policy for Bug Buddy",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          <CardDescription>
            Last updated: {new Date().toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-slate dark:prose-invert max-w-none">
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                1. Introduction
              </h2>
              <p>
                Bug Buddy (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;)
                is committed to protecting your privacy. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your
                information when you use our feedback widget system and related
                services (the &quot;Service&quot;).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                2. Information We Collect
              </h2>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                2.1 Information You Provide
              </h3>
              <p>
                We collect information that you provide directly to us,
                including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Account Information:</strong> When you create an
                  account, we collect information such as your name, email
                  address, and profile information from OAuth providers (GitHub,
                  Google)
                </li>
                <li>
                  <strong>Project Information:</strong> Information about your
                  projects, including project names, descriptions, and
                  configuration settings
                </li>
                <li>
                  <strong>Feedback Content:</strong> Screenshots, annotations,
                  descriptions, and other content you submit through the
                  feedback widget
                </li>
                <li>
                  <strong>Contact Information:</strong> If you provide your name
                  and email when submitting feedback
                </li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                2.2 Automatically Collected Information
              </h3>
              <p>
                When you use the Service, we automatically collect certain
                information, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Usage Data:</strong> Information about how you
                  interact with the Service, including pages visited, features
                  used, and time spent
                </li>
                <li>
                  <strong>Device Information:</strong> Browser type, operating
                  system, device type, and user agent information
                </li>
                <li>
                  <strong>Log Data:</strong> IP addresses, access times, and
                  error logs
                </li>
                <li>
                  <strong>URL Information:</strong> The URL where feedback was
                  submitted from
                </li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                2.3 Third-Party Authentication
              </h3>
              <p>
                When you sign in using OAuth providers (GitHub or Google), we
                receive information from these providers in accordance with
                their privacy policies and your account settings. This may
                include your name, email address, profile picture, and other
                information you have authorized to share.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                3. How We Use Your Information
              </h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process and manage your account and projects</li>
                <li>
                  Create and manage GitHub issues when you use the integration
                  feature
                </li>
                <li>
                  Send you notifications and updates about your feedback and
                  projects
                </li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Monitor and analyze usage patterns and trends</li>
                <li>
                  Detect, prevent, and address technical issues and security
                  threats
                </li>
                <li>
                  Comply with legal obligations and enforce our Terms of Service
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                4. How We Share Your Information
              </h2>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                4.1 Service Providers
              </h3>
              <p>
                We may share your information with third-party service providers
                who perform services on our behalf, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Hosting and Infrastructure:</strong> We use cloud
                  hosting services to store and process your data
                </li>
                <li>
                  <strong>Analytics:</strong> We use PostHog and similar
                  analytics services to understand how the Service is used
                </li>
                <li>
                  <strong>File Storage:</strong> We use Vercel Blob and similar
                  services to store screenshots and other files
                </li>
                <li>
                  <strong>Database Services:</strong> We use PostgreSQL
                  databases to store your data
                </li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                4.2 GitHub Integration
              </h3>
              <p>
                When you use the GitHub integration feature, we share feedback
                content with GitHub to create issues in your repositories. This
                information is subject to GitHub&apos;s Privacy Policy and Terms
                of Service.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                4.3 Legal Requirements
              </h3>
              <p>
                We may disclose your information if required to do so by law or
                in response to valid requests by public authorities (e.g., a
                court or government agency).
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                4.4 Business Transfers
              </h3>
              <p>
                In the event of a merger, acquisition, or sale of assets, your
                information may be transferred to the acquiring entity.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                4.5 With Your Consent
              </h3>
              <p>
                We may share your information with your explicit consent or at
                your direction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                5. Data Storage and Security
              </h2>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                5.1 Data Storage
              </h3>
              <p>
                Your data is stored on secure servers and cloud infrastructure.
                We use industry-standard security measures to protect your
                information, including encryption in transit and at rest.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                5.2 Security Measures
              </h3>
              <p>
                We implement appropriate technical and organizational measures
                to protect your personal information against unauthorized
                access, alteration, disclosure, or destruction. However, no
                method of transmission over the Internet or electronic storage
                is 100% secure, and we cannot guarantee absolute security.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                5.3 Data Retention
              </h3>
              <p>
                We retain your information for as long as necessary to provide
                the Service and fulfill the purposes outlined in this Privacy
                Policy, unless a longer retention period is required or
                permitted by law. When you delete your account, we will delete
                or anonymize your personal information, subject to applicable
                legal requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                6. Your Rights and Choices
              </h2>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                6.1 Access and Correction
              </h3>
              <p>
                You can access and update your account information at any time
                through your account settings in the Service.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                6.2 Data Deletion
              </h3>
              <p>
                You can request deletion of your account and associated data by
                contacting us or using the account deletion features in the
                Service.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">6.3 Opt-Out</h3>
              <p>
                You can opt out of certain communications from us by adjusting
                your notification preferences in your account settings.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                6.4 Cookies and Tracking
              </h3>
              <p>
                Most web browsers are set to accept cookies by default. You can
                usually modify your browser settings to decline cookies if you
                prefer. However, this may prevent you from taking full advantage
                of the Service.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">
                6.5 GDPR and CCPA Rights
              </h3>
              <p>
                If you are located in the European Economic Area (EEA) or
                California, you may have additional rights under the General
                Data Protection Regulation (GDPR) or California Consumer Privacy
                Act (CCPA), including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The right to access your personal data</li>
                <li>The right to rectify inaccurate data</li>
                <li>
                  The right to erasure (&quot;right to be forgotten&quot;)
                </li>
                <li>The right to restrict processing</li>
                <li>The right to data portability</li>
                <li>The right to object to processing</li>
                <li>The right to withdraw consent</li>
              </ul>
              <p>
                To exercise these rights, please contact us through the support
                channels provided in the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                7. Third-Party Services
              </h2>
              <p>
                The Service integrates with third-party services, including
                GitHub, Google, PostHog, and Vercel. These services have their
                own privacy policies, and we encourage you to review them. We
                are not responsible for the privacy practices of these
                third-party services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                8. Children&apos;s Privacy
              </h2>
              <p>
                The Service is not intended for children under the age of 13. We
                do not knowingly collect personal information from children
                under 13. If you believe we have collected information from a
                child under 13, please contact us immediately, and we will take
                steps to delete such information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                9. International Data Transfers
              </h2>
              <p>
                Your information may be transferred to and processed in
                countries other than your country of residence. These countries
                may have data protection laws that differ from those in your
                country. By using the Service, you consent to the transfer of
                your information to these countries.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                10. Changes to This Privacy Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. We will
                notify you of any material changes by posting the new Privacy
                Policy on this page and updating the &quot;Last updated&quot;
                date. Your continued use of the Service after such modifications
                constitutes your acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mt-6 mb-4">
                11. Contact Us
              </h2>
              <p>
                If you have any questions, concerns, or requests regarding this
                Privacy Policy or our data practices, please contact us through
                the support channels provided in the Service.
              </p>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
