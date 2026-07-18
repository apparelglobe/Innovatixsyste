import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy | Innovatix Systems',
  description:
    'How Innovatix Systems collects, uses, and protects personal information across our website, client portal, and services.',
  path: '/privacy',
  index: true,
});

export default function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      effectiveDate="July 18, 2026"
      intro="This policy explains what personal information Innovatix Systems collects, why we collect it, how we use and protect it, and the choices you have. We collect only what we need to respond to you and deliver our services."
    >
      <h2>Who we are</h2>
      <p>
        Innovatix Systems (“Innovatix,” “we,” “us,” or “our”) is an enterprise software company. This policy applies to
        our marketing website, our client portal, and the services we provide to clients. If you have any questions,
        contact us at <a href="mailto:hello@innovatixsystems.com">hello@innovatixsystems.com</a>.
      </p>

      <h2>Information we collect</h2>
      <h3>Information you provide</h3>
      <ul>
        <li>
          <strong>Contact and inquiry details</strong> — when you submit a form or book a consultation: your name,
          business email, phone number, company, job title, and the details you choose to share about your project
          (service interest, project description, budget range, and desired timeline).
        </li>
        <li>
          <strong>Client account information</strong> — if you are a client using our portal: your account email,
          organization, and the projects, files, messages, approvals, and invoices associated with your engagement.
        </li>
        <li>
          <strong>Communications</strong> — the content of emails, messages, and support requests you send us.
        </li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li>
          <strong>Usage and device data</strong> — pages viewed, referring URL, and general device/browser information,
          used to operate and improve the site.
        </li>
        <li>
          <strong>Marketing attribution</strong> — campaign parameters (for example UTM tags) and the landing page you
          arrived on, so we understand how people find us.
        </li>
        <li>
          <strong>Security signals</strong> — we derive a hashed identifier from your IP address to prevent spam and
          abuse of our forms. We do not use it to profile you.
        </li>
      </ul>
      <p>
        We do <strong>not</strong> store full payment-card numbers. Card payments are processed by our payment provider;
        we receive only the confirmation and status needed to manage your invoices.
      </p>

      <h2>How we use your information</h2>
      <ul>
        <li>Respond to your inquiry, schedule consultations, and provide quotes and proposals.</li>
        <li>Deliver, operate, secure, and support our services and client portal.</li>
        <li>Send service and transactional communications (for example project updates, approvals, and invoices).</li>
        <li>Measure and improve our website and marketing, and prevent fraud and abuse.</li>
        <li>Comply with legal obligations and enforce our agreements.</li>
      </ul>
      <p>
        Our legal bases (where applicable) are your consent, the performance of a contract with you, our legitimate
        interests in operating and securing our business, and compliance with law.
      </p>

      <h2>How we share information</h2>
      <p>
        We do not sell your personal information. We share it only with service providers that help us operate — such as
        cloud hosting, email delivery, payment processing, scheduling, and analytics — under agreements that limit their
        use of the data to providing those services. We may also disclose information where required by law, to protect
        our rights and safety, or in connection with a business transfer.
      </p>

      <h2>Cookies and analytics</h2>
      <p>
        We use cookies and similar technologies to run the site, remember preferences, and measure traffic. You can
        control cookies through your browser settings. For details, see our{' '}
        <a href="/cookie-policy">Cookie Policy</a>.
      </p>

      <h2>Data retention</h2>
      <p>
        We keep personal information only as long as needed for the purposes above — to respond to your inquiry, deliver
        services, meet legal and accounting requirements, and maintain security records — after which we delete or
        anonymize it.
      </p>

      <h2>Security</h2>
      <p>
        We protect information with measures appropriate to its sensitivity, including access controls, tenant
        isolation, audit logging, malware scanning of uploaded files, encrypted transport, and least-privilege access.
        No system is perfectly secure, but security is a core part of how we build.
      </p>

      <h2>Your rights and choices</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, delete, or port your personal information,
        or to object to or restrict certain processing. To exercise any of these, email{' '}
        <a href="mailto:hello@innovatixsystems.com">hello@innovatixsystems.com</a> and we will respond as required by
        applicable law. You can unsubscribe from marketing emails at any time using the link in the message.
      </p>

      <h2>International users</h2>
      <p>
        We are based in the United States and process information there. If you contact us from another country, you
        consent to that processing, and we apply the protections described in this policy.
      </p>

      <h2>Children’s privacy</h2>
      <p>
        Our website and services are intended for businesses and are not directed to children under 16. We do not
        knowingly collect information from children.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. When we do, we will revise the effective date above and, for
        material changes, provide a more prominent notice.
      </p>

      <h2>Contact us</h2>
      <p>
        Questions about this policy or your information? Email{' '}
        <a href="mailto:hello@innovatixsystems.com">hello@innovatixsystems.com</a>.
      </p>
    </LegalPage>
  );
}
