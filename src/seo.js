// Sets the page title and meta description dynamically for each route.
// Since SpreadRun is a client-side React SPA, meta tags are updated via JS
// as each page component mounts. This is the standard approach for SPAs
// without server-side rendering.

export function setPageMeta(title, description, canonicalPath = null) {
  // Update the document title
  document.title = title;

  // Update or create the meta description tag
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', description);

  // Update or create the OG title tag (used by social sharing)
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    document.head.appendChild(ogTitle);
  }
  ogTitle.setAttribute('content', title);

  // Update or create the OG description tag
  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (!ogDesc) {
    ogDesc = document.createElement('meta');
    ogDesc.setAttribute('property', 'og:description');
    document.head.appendChild(ogDesc);
  }
  ogDesc.setAttribute('content', description);

  // Update or create the canonical link tag: tells Google which URL is the
  // "real" one for this content, preventing duplicate content issues from
  // query strings, trailing slashes, or the www/non-www split.
  const canonicalUrl = `https://www.spreadrun.com${canonicalPath !== null ? canonicalPath : window.location.pathname}`;
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);

  // Update or create the OG url tag to match the canonical URL
  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement('meta');
    ogUrl.setAttribute('property', 'og:url');
    document.head.appendChild(ogUrl);
  }
  ogUrl.setAttribute('content', canonicalUrl);

  // Remove any previously injected FAQ schema since guide pages
  // now handle schema inline in JSX for better crawler compatibility
  const existingSchema = document.getElementById('sr-faq-schema');
  if (existingSchema) existingSchema.remove();
}
