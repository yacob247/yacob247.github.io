// news-feeds.js — Multi-source RSS aggregator via rss2json
// All sources: BBC, Al Jazeera, Reuters, Guardian, AP, NPR, CNN, FT, WSJ, Bloomberg

const RSS2JSON = 'https://api.rss2json.com/v1/api.json?count=30&rss_url=';

export const SOURCES = [
  { id:'bbc',      name:'BBC News',      cls:'src-bbc',     url:'https://feeds.bbci.co.uk/news/rss.xml',                              cats:['World','General'] },
  { id:'bbc-w',    name:'BBC World',     cls:'src-bbc',     url:'https://feeds.bbci.co.uk/news/world/rss.xml',                       cats:['World'] },
  { id:'alj',      name:'Al Jazeera',   cls:'src-alj',     url:'https://www.aljazeera.com/xml/rss/all.xml',                         cats:['World','Middle East'] },
  { id:'reuters',  name:'Reuters',       cls:'src-reuters', url:'https://feeds.reuters.com/reuters/topNews',                         cats:['Business','Finance'] },
  { id:'guardian', name:'The Guardian', cls:'src-guardian', url:'https://www.theguardian.com/international/rss',                    cats:['World','Culture'] },
  { id:'guardian-tech',name:'Guardian Tech',cls:'src-guardian',url:'https://www.theguardian.com/technology/rss',                  cats:['Tech'] },
  { id:'ap',       name:'AP News',       cls:'src-ap',      url:'https://feeds.apnews.com/rss/apf-topnews',                         cats:['US','General'] },
  { id:'ap-world', name:'AP World',      cls:'src-ap',      url:'https://feeds.apnews.com/rss/apf-WorldNews',                      cats:['World'] },
  { id:'npr',      name:'NPR News',      cls:'src-npr',     url:'https://feeds.npr.org/1001/rss.xml',                               cats:['US','Culture'] },
  { id:'npr-pol',  name:'NPR Politics', cls:'src-npr',      url:'https://feeds.npr.org/1014/rss.xml',                              cats:['Politics'] },
  { id:'cnn',      name:'CNN',           cls:'src-cnn',     url:'http://rss.cnn.com/rss/edition.rss',                               cats:['General','US'] },
  { id:'ft',       name:'Financial Times',cls:'src-ft',     url:'https://www.ft.com/rss/home',                                     cats:['Finance','Business'] },
  { id:'wsj',      name:'WSJ',           cls:'src-wsj',     url:'https://feeds.a.dj.com/rss/RSSWorldNews.xml',                     cats:['Finance','World'] },
  { id:'wired',    name:'Wired',         cls:'src-other',   url:'https://www.wired.com/feed/rss',                                  cats:['Tech','Science'] },
  { id:'nature',   name:'Nature',        cls:'src-other',   url:'https://www.nature.com/nature.rss',                               cats:['Science'] },
  { id:'espn',     name:'ESPN',          cls:'src-other',   url:'https://www.espn.com/espn/rss/news',                              cats:['Sports'] },
  { id:'variety',  name:'Variety',       cls:'src-other',   url:'https://variety.com/feed/',                                       cats:['Entertainment'] },
  { id:'billboard',name:'Billboard',     cls:'src-other',   url:'https://www.billboard.com/feed/',                                 cats:['Music','Entertainment'] },
];

// Category → source IDs map for filtered loading
export const CAT_SOURCES = {
  'All':           SOURCES.map(s=>s.id),
  'World':         ['bbc','bbc-w','alj','reuters','guardian','ap-world'],
  'US Politics':   ['ap','npr-pol','cnn','guardian'],
  'Finance':       ['reuters','ft','wsj'],
  'Tech':          ['guardian-tech','wired'],
  'Science':       ['nature','wired'],
  'Sports':        ['espn','bbc'],
  'Entertainment': ['variety','billboard'],
  'Middle East':   ['alj','bbc-w','reuters'],
};

const cache = {};   // in-memory per session
const inFlight = {};// deduplicate concurrent fetches

export async function fetchSource(sourceId, forceFresh = false) {
  if (!forceFresh && cache[sourceId]) return cache[sourceId];
  if (inFlight[sourceId]) return inFlight[sourceId];

  const source = SOURCES.find(s => s.id === sourceId);
  if (!source) return [];

  const promise = (async () => {
    try {
      const url = RSS2JSON + encodeURIComponent(source.url);
      const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error('non-ok');
      const data = await res.json();
      if (data.status !== 'ok') throw new Error('rss2json error');

      const items = (data.items || []).map(item => ({
        id:          safeId(source.id + item.guid),
        title:       item.title || '',
        description: stripHtml(item.description || item.content || ''),
        link:        item.link || '',
        pubDate:     item.pubDate || new Date().toISOString(),
        thumbnail:   item.thumbnail || item.enclosure?.link || '',
        source:      source.name,
        sourceId:    source.id,
        sourceCls:   source.cls,
        categories:  source.cats,
      }));

      cache[sourceId] = items;
      return items;
    } catch(e) {
      console.warn(`Feed failed: ${source.name}`, e.message);
      return cache[sourceId] || [];
    } finally {
      delete inFlight[sourceId];
    }
  })();

  inFlight[sourceId] = promise;
  return promise;
}

export async function fetchSources(ids = [], forceFresh = false) {
  // stagger requests to respect rss2json rate limit (~1/sec free tier)
  const results = [];
  for (let i = 0; i < ids.length; i++) {
    const items = await fetchSource(ids[i], forceFresh);
    results.push(...items);
    if (i < ids.length - 1) await delay(350);
  }
  // deduplicate by link
  const seen = new Set();
  return results.filter(item => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  }).sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));
}

export async function fetchCategory(cat, maxPerSource = 12) {
  const ids = CAT_SOURCES[cat] || CAT_SOURCES['All'];
  const all  = await fetchSources(ids);
  return all.slice(0, maxPerSource * ids.length);
}

export async function fetchAll(maxItems = 80) {
  const majorIds = ['bbc','alj','reuters','guardian','ap','npr','cnn'];
  const all = await fetchSources(majorIds);
  return all.slice(0, maxItems);
}

export async function searchNews(query, items = []) {
  const q = query.toLowerCase().trim();
  if (!q) return items;
  return items.filter(item =>
    item.title.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    item.source.toLowerCase().includes(q)
  );
}

export function getTickerItems(items) {
  return items
    .filter(i => i.title.length > 20)
    .slice(0, 20)
    .map(i => ({ title: i.title, link: i.link, source: i.source }));
}

export function timeAgo(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400)return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().slice(0,280);
}

function safeId(str) {
  return btoa(str.slice(0,60)).replace(/[^a-zA-Z0-9]/g,'').slice(0,20);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Export CATEGORIES list for UI
export const CATEGORIES = Object.keys(CAT_SOURCES);

// People categories used in profiles
export const PEOPLE_CATEGORIES = {
  'Celebrities': ['Celebrity','Actor','Musician','Model','Influencer'],
  'Sports':      ['Athlete','Footballer','Basketball Player','Tennis Player'],
  'Tech & Business': ['CEO','Entrepreneur','Investor','Tech Leader'],
  'Politics':    ['Politician','World Leader','Activist'],
  'History':     ['Historical Figure','Philosopher','Scientist'],
  'Education':   ['Subject','Academic Topic','STEM','Humanities'],
  'Entertainment':['YouTuber','TikToker','Streamer','Podcaster'],
  'Science':     ['Scientist','Researcher','Inventor'],
};