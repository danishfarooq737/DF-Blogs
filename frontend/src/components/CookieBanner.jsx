import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useSite } from '../context.js';

const STORAGE_KEY = 'cookie-consent';
const readConsent = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

/** Loads the configured analytics script, but only after the visitor accepts. */
function useAnalytics(consent) {
  const { analytics } = useSite();
  useEffect(() => {
    if (consent !== 'accepted' || !analytics || analytics.provider === 'none' || !analytics.id) return undefined;
    const script = document.createElement('script');
    script.defer = true;
    script.dataset.analytics = analytics.provider;
    if (analytics.provider === 'plausible') {
      script.src = analytics.scriptUrl;
      script.dataset.domain = analytics.id;
    } else if (analytics.provider === 'ga') {
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analytics.id)}`;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() {
        window.dataLayer.push(arguments); // eslint-disable-line prefer-rest-params
      };
      window.gtag('js', new Date());
      window.gtag('config', analytics.id, { anonymize_ip: true });
    } else {
      return undefined;
    }
    document.head.appendChild(script);
    return () => script.remove();
  }, [consent, analytics]);
}

export default function CookieBanner() {
  const [consent, setConsent] = useState(readConsent);
  useAnalytics(consent);

  const choose = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* storage unavailable: the choice simply applies to this visit */
    }
    setConsent(value);
  };

  return (
    <AnimatePresence>
      {!consent && (
        <motion.aside
          className="cookie-banner"
          role="region"
          aria-label="Cookie consent"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
        >
          <p>
            We use essential cookies to keep you signed in. With your consent we also load optional analytics.{' '}
            <Link to="/privacy">Read our privacy policy</Link>.
          </p>
          <div className="row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => choose('declined')}>
              Essential only
            </button>
            <button type="button" className="btn btn-sm" onClick={() => choose('accepted')}>
              Accept analytics
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
