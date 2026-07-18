import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Terms of Service | Innovatix Systems',
  description:
    'The terms that govern your use of the Innovatix Systems website and client portal. Project engagements are governed by a separate signed agreement.',
  path: '/terms',
  index: true,
});

export default function Page() {
  return (
    <LegalPage
      title="Terms of Service"
      effectiveDate="July 18, 2026"
      intro="These terms govern your use of the Innovatix Systems website and client portal. Paid engagements are governed by a separate written agreement — where it conflicts with these terms, that agreement controls."
    >
      <h2>Acceptance of these terms</h2>
      <p>
        By accessing or using the Innovatix Systems website (the “Site”) or client portal, you agree to these Terms of
        Service. If you do not agree, please do not use them. If you use them on behalf of an organization, you represent
        that you are authorized to bind that organization.
      </p>

      <h2>The relationship to your engagement</h2>
      <p>
        The Site and portal are informational and operational tools. Any project we perform for you — scope,
        deliverables, fees, timelines, warranties, intellectual-property ownership, and confidentiality — is defined in a
        separate written proposal, statement of work, or master services agreement (the “Engagement Agreement”). Nothing
        on the Site is an offer or a binding commitment to perform work, and no contract for services is formed until an
        Engagement Agreement is signed.
      </p>

      <h2>Use of the Site and portal</h2>
      <ul>
        <li>Use them only for lawful purposes and in accordance with these terms.</li>
        <li>Do not attempt to gain unauthorized access, disrupt, probe, or reverse-engineer the systems.</li>
        <li>Do not upload malware or content you do not have the right to share; uploaded files are scanned.</li>
        <li>Keep your portal credentials confidential; you are responsible for activity under your account.</li>
        <li>Provide accurate information when you contact us or use the portal.</li>
      </ul>

      <h2>Accounts</h2>
      <p>
        Portal access is provided to clients by invitation. You are responsible for maintaining the security of your
        account and for the actions of users you authorize within your organization. Notify us promptly of any
        unauthorized use. We may suspend or deactivate accounts that violate these terms or present a security risk.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The Site, its content, and the Innovatix Systems name and marks are owned by us or our licensors and are
        protected by law. These terms grant you no right to use them except to view the Site and use the portal as
        intended. Ownership of work product we create for you is governed by your Engagement Agreement.
      </p>

      <h2>Your content</h2>
      <p>
        You retain ownership of the information and files you submit. You grant us the limited right to host, process,
        and use that content to operate the Site and portal and to provide our services to you.
      </p>

      <h2>Third-party services and links</h2>
      <p>
        We rely on reputable third-party providers (for example hosting, payments, email, and scheduling) and may link
        to third-party sites. We are not responsible for the content or practices of services we do not control; their
        own terms and privacy policies apply.
      </p>

      <h2>Disclaimers</h2>
      <p>
        The Site and portal are provided “as is” and “as available,” without warranties of any kind, whether express or
        implied, including merchantability, fitness for a particular purpose, and non-infringement, to the fullest
        extent permitted by law. Warranties for services we perform are stated exclusively in your Engagement Agreement.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Innovatix Systems will not be liable for any indirect, incidental,
        special, consequential, or punitive damages, or for lost profits or data, arising out of or related to your use
        of the Site or portal. Liability arising from a paid engagement is governed and limited by the Engagement
        Agreement.
      </p>

      <h2>Indemnification</h2>
      <p>
        You agree to indemnify and hold Innovatix Systems harmless from claims arising out of your misuse of the Site or
        portal or your violation of these terms or applicable law.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the United States and the state in which Innovatix Systems is
        organized, without regard to conflict-of-laws rules. Disputes will be resolved in the courts located there,
        unless your Engagement Agreement specifies otherwise.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms from time to time. Changes take effect when posted, and we will update the effective
        date above. Your continued use after a change means you accept the updated terms.
      </p>

      <h2>Contact us</h2>
      <p>
        Questions about these terms? Email{' '}
        <a href="mailto:hello@innovatixsystems.com">hello@innovatixsystems.com</a>.
      </p>
    </LegalPage>
  );
}
