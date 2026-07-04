(function () {
  const AD_CLIENT = 'ca-pub-5812524294035974';
  const BASE_URL = 'https://envizion.work/tools2/';
  const CHATGPT_GREY_THEME = {
    '--toolkit-seo-accent': '#10a37f',
    '--toolkit-seo-accent-2': '#0d8f6f',
    '--toolkit-seo-bg': '#212121',
    '--toolkit-seo-accent-soft': 'rgba(16, 163, 127, 0.14)',
    '--toolkit-seo-accent-border': 'rgba(16, 163, 127, 0.28)',
    '--toolkit-seo-surface': '#2f2f2f',
    '--toolkit-seo-text': '#ececec',
    '--toolkit-seo-muted': '#b4b4b4',
    '--toolkit-seo-line': 'rgba(255, 255, 255, 0.12)'
  };

  function currentFile() {
    return decodeURIComponent((location.pathname.split('/').pop() || 'index.html').trim()) || 'index.html';
  }

  function ensureMeta(selector, attrs) {
    let el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      document.head.appendChild(el);
    }
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  }

  function ensureCanonical() {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = BASE_URL + encodeURIComponent(currentFile()).replace(/%2F/gi, '/');
  }

  function ensureAdsScript() {
    const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
    const exists = Array.from(document.scripts).some((script) => script.src.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'));
    if (exists) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }

  function pushAds() {
    document.querySelectorAll('.adsbygoogle').forEach((ad) => {
      if (ad.dataset.envizionPushed) return;
      ad.dataset.envizionPushed = 'true';
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.debug('AdSense slot deferred:', err);
      }
    });
  }

  function applyChatGptGreyTheme() {
    document.querySelectorAll('.envizion-static-seo, .envizion-ad-slot, .envizion-guide-popup').forEach((el) => {
      Object.entries(CHATGPT_GREY_THEME).forEach(([key, value]) => {
        el.style.setProperty(key, value);
      });
    });
  }

  function showGuideOnce() {
    applyChatGptGreyTheme();
    const guide = document.querySelector('.envizion-static-seo');
    if (!guide) return;
    const key = `envizion-guide-seen:${currentFile()}:v1`;
    try {
      if (localStorage.getItem(key) === 'yes') return;
    } catch (err) {
      console.debug('Guide storage unavailable:', err);
    }

    const title = guide.querySelector('h2')?.textContent?.trim() || document.title || 'Envizion Tool';
    const kicker = guide.querySelector('.envizion-static-seo__kicker')?.textContent?.trim() || 'Quick guide';
    const description = guide.querySelector('.envizion-static-seo__hero p:last-child')?.textContent?.trim()
      || guide.querySelector('.envizion-static-seo__article p')?.textContent?.trim()
      || '';
    const steps = Array.from(guide.querySelectorAll('.envizion-static-seo__panel:nth-child(2) li'))
      .slice(0, 3)
      .map((item) => item.textContent.trim());

    const popup = document.createElement('div');
    popup.className = 'envizion-guide-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-label', `${title} quick guide`);
    popup.setAttribute('style', guide.getAttribute('style') || '');
    popup.innerHTML = `
      <section class="envizion-guide-popup__card">
        <header class="envizion-guide-popup__head">
          <div>
            <p class="envizion-guide-popup__kicker">${kicker}</p>
            <h2>${title}</h2>
          </div>
          <button class="envizion-guide-popup__close" type="button" aria-label="Close guide">&times;</button>
        </header>
        <div class="envizion-guide-popup__body">
          <p>${description}</p>
          ${steps.length ? `<ol>${steps.map((step) => `<li>${step}</li>`).join('')}</ol>` : ''}
          <button class="envizion-guide-popup__action" type="button">Start using tool</button>
        </div>
      </section>
    `;

    const close = () => {
      popup.remove();
      try {
        localStorage.setItem(key, 'yes');
      } catch (err) {
        console.debug('Guide storage unavailable:', err);
      }
    };

    popup.querySelector('.envizion-guide-popup__close').addEventListener('click', close);
    popup.querySelector('.envizion-guide-popup__action').addEventListener('click', close);
    popup.addEventListener('click', (event) => {
      if (event.target === popup) close();
    });
    document.addEventListener('keydown', function onKeydown(event) {
      if (event.key !== 'Escape') return;
      document.removeEventListener('keydown', onKeydown);
      close();
    });
    setTimeout(() => document.body.appendChild(popup), 450);
  }

  function init() {
    const title = (document.title || 'Envizion Tools').trim();
    const existingDescription = document.head.querySelector('meta[name="description"]');
    const description = existingDescription && existingDescription.content
      ? existingDescription.content
      : `${title} is part of Envizion Tools, a browser-based toolkit for private local file conversion, editing, compression, previewing, and creative workflows.`;

    ensureMeta('meta[name="description"]', { name: 'description', content: description });
    ensureMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow, max-image-preview:large' });
    ensureMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    ensureMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    ensureMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    ensureCanonical();
    ensureAdsScript();
    applyChatGptGreyTheme();
    requestAnimationFrame(pushAds);
    requestIdleCallback ? requestIdleCallback(showGuideOnce, { timeout: 1600 }) : setTimeout(showGuideOnce, 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
