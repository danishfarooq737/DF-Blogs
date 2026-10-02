import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSite } from './context.js';
import { absoluteUrl } from './utils.js';

/** Creates or updates a <meta>/<link> element in the document head. */
function setHeadTag(selector, tagName, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement(tagName);
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
}

/**
 * Route wrapper: sets per-page SEO metadata (title, description, canonical, Open Graph, Twitter)
 * and plays the shared page transition.
 */
export default function Page({ title, description, image, type = 'website', noindex = false, wide = false, children }) {
  const { site } = useSite();

  useEffect(() => {
    const fullTitle = title ? `${title} | ${site.name}` : site.name;
    const summary = description || site.description || '';
    const url = absoluteUrl(window.location.pathname);
    const picture = image ? new URL(image, window.location.origin).href : absoluteUrl('/og-image.png');

    document.title = fullTitle;
    setHeadTag('meta[name="description"]', 'meta', { name: 'description', content: summary });
    setHeadTag('meta[name="robots"]', 'meta', { name: 'robots', content: noindex ? 'noindex, nofollow' : 'index, follow' });
    setHeadTag('link[rel="canonical"]', 'link', { rel: 'canonical', href: url });
    setHeadTag('meta[property="og:title"]', 'meta', { property: 'og:title', content: fullTitle });
    setHeadTag('meta[property="og:description"]', 'meta', { property: 'og:description', content: summary });
    setHeadTag('meta[property="og:type"]', 'meta', { property: 'og:type', content: type });
    setHeadTag('meta[property="og:url"]', 'meta', { property: 'og:url', content: url });
    setHeadTag('meta[property="og:image"]', 'meta', { property: 'og:image', content: picture });
    setHeadTag('meta[name="twitter:card"]', 'meta', { name: 'twitter:card', content: 'summary_large_image' });
    setHeadTag('meta[name="twitter:title"]', 'meta', { name: 'twitter:title', content: fullTitle });
    setHeadTag('meta[name="twitter:description"]', 'meta', { name: 'twitter:description', content: summary });
    setHeadTag('meta[name="twitter:image"]', 'meta', { name: 'twitter:image', content: picture });
  }, [title, description, image, type, noindex, site]);

  return (
    <motion.main
      id="main"
      tabIndex={-1}
      className={wide ? 'container container-wide' : 'container'}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.main>
  );
}
