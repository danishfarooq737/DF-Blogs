import { Link } from 'react-router';
import Page from '../Page.jsx';
import { useSite } from '../context.js';

const NOTICE = 'This page is general template content and has not been legally reviewed. Replace it with reviewed text before real-world use.';

export function Privacy() {
  const { site } = useSite();
  return (
    <Page title="Privacy Policy" description={`How ${site.name} handles personal data.`}>
      <article className="article legal">
        <h1>Privacy Policy</h1>
        <p className="alert alert-warn">{NOTICE}</p>
        <h2>Who we are</h2>
        <p>{site.legalEntity || site.name} operates {site.name}. Contact: {site.contactEmail}.</p>
        <h2>What we collect</h2>
        <p>If you create an account we store your name, email address and a securely hashed password. Comments you post are stored with your name. We never store your password in readable form.</p>
        <h2>Cookies</h2>
        <p>We use essential HTTP-only cookies to keep you signed in. Optional analytics are only loaded after you accept them in the cookie banner, and are not loaded if analytics is not configured.</p>
        <h2>Your choices</h2>
        <p>You can decline analytics, sign out at any time, and ask us to delete your account and comments by emailing {site.contactEmail}.</p>
      </article>
    </Page>
  );
}

export function Terms() {
  const { site } = useSite();
  return (
    <Page title="Terms & Conditions" description={`Terms of use for ${site.name}.`}>
      <article className="article legal">
        <h1>Terms &amp; Conditions</h1>
        <p className="alert alert-warn">{NOTICE}</p>
        <h2>Using the site</h2>
        <p>You may read the content for personal use. Do not attempt to disrupt the service or access areas you are not authorised to use.</p>
        <h2>Comments</h2>
        <p>You are responsible for what you post. We may hide or remove comments that are abusive, spam or unlawful.</p>
        <h2>Content</h2>
        <p>Articles are provided for information only, without warranty. Content is owned by {site.legalEntity || site.name} or its authors.</p>
      </article>
    </Page>
  );
}

export function Contact() {
  const { site } = useSite();
  return (
    <Page title="Contact" description={`Get in touch with the ${site.name} team.`}>
      <article className="article">
        <h1>Contact</h1>
        <dl className="contact-list">
          <dt>Email</dt>
          <dd><a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></dd>
          {site.contactPhone && (
            <>
              <dt>Phone</dt>
              <dd>{site.contactPhone}</dd>
            </>
          )}
          <dt>Address</dt>
          <dd>{site.addressIsPlaceholder ? 'Placeholder: an official postal address has not been configured (set SITE_ADDRESS).' : site.address}</dd>
        </dl>
      </article>
    </Page>
  );
}

export function ThankYou() {
  return (
    <Page title="Thank you" noindex>
      <div className="empty">
        <h1>Thank you!</h1>
        <p>Your action was completed successfully.</p>
        <Link to="/" className="btn">Back to home</Link>
      </div>
    </Page>
  );
}

export function NotFound() {
  return (
    <Page title="Page not found" noindex>
      <div className="empty">
        <p className="eyebrow">Error 404</p>
        <h1>We couldn&apos;t find that page</h1>
        <p>The link may be broken, or the page may have been removed.</p>
        <Link to="/" className="btn">Back to home</Link>
      </div>
    </Page>
  );
}
