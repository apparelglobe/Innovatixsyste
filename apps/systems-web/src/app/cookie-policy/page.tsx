import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Cookie Policy | Innovatix Systems',
  description:
    'What cookies and similar technologies Innovatix Systems uses, why we use them, and how you can control them.',
  path: '/cookie-policy',
  index: true,
});

export default function Page() {
  return (
    <LegalPage
      title="Cookie Policy"
      effectiveDate="July 18, 2026"
      intro="This policy explains how Innovatix Systems uses cookies and similar technologies on our website, the categories we use, and how you can control them."
    >
      <h2>What cookies are</h2>
      <p>
        Cookies are small text files stored on your device when you visit a website. Similar technologies — such as
        local storage and pixels — work in comparable ways. They let a site remember your actions and preferences and
        help us understand how the site is used.
      </p>

      <h2>How we use cookies</h2>
      <p>We use a small number of cookies, grouped into the categories below.</p>
      <ul>
        <li>
          <strong>Strictly necessary</strong> — required for the site and client portal to function, including keeping
          you signed in and protecting forms against abuse. These cannot be switched off in our systems.
        </li>
        <li>
          <strong>Preferences</strong> — remember choices you make (such as display settings) to improve your
          experience.
        </li>
        <li>
          <strong>Analytics</strong> — help us measure traffic and understand how visitors use the site so we can
          improve it. Where enabled, these are set only in aggregate to measure performance, not to identify you
          personally.
        </li>
      </ul>
      <p>
        We do not use cookies to sell your personal information. Analytics are enabled only when the corresponding
        integration is configured; when it is not, those cookies are not set.
      </p>

      <h2>Third-party cookies</h2>
      <p>
        Some cookies may be set by third-party providers we use to operate the site — for example analytics or
        scheduling tools. Those providers process data under their own privacy policies. We limit third-party cookies to
        what is needed to run and measure the site.
      </p>

      <h2>Managing cookies</h2>
      <p>
        You can control and delete cookies through your browser settings, and set your browser to warn you before
        accepting them. Blocking strictly necessary cookies may cause parts of the site or portal to stop working.
        Browser help pages explain how to manage cookies for Chrome, Safari, Firefox, and Edge.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy as our use of cookies changes. We will revise the effective date above when we do.
      </p>

      <h2>Related policies</h2>
      <p>
        For how we handle personal information generally, see our <a href="/privacy">Privacy Policy</a>. Questions? Email{' '}
        <a href="mailto:hello@innovatixsystems.com">hello@innovatixsystems.com</a>.
      </p>
    </LegalPage>
  );
}
