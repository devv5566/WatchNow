import * as cheerio from 'cheerio';
import levenshtein from 'fast-levenshtein';
import { ContentType } from 'stremio-addon-sdk';
import { NotFoundError } from '../error';
import { Context, CountryCode } from '../types';
import { Fetcher, getTmdbId, getTmdbNameAndYear, Id, TmdbId } from '../utils';
import { resolveRedirectUrl } from './hd-hub-helper';
import { Source, SourceResult } from './Source';

/**
 * ToonWorld4All source — fetches Hindi/multi-audio anime streams.
 *
 * Resolution chain:
 *   toonworld4all.me search → show page → archive.toonworld4all.me/episode/<slug>-<SxE>
 *     → /redirect/<hash> (reveals hubcloud.foo URL in plain text)
 *       → resolveRedirectUrl() → direct CDN .mkv/.mp4
 */
export class ToonWorld4All extends Source {
  public readonly id = 'toonworld4all';

  public readonly label = 'ToonWorld4All';

  public readonly contentTypes: ContentType[] = ['series'];

  public readonly countryCodes: CountryCode[] = [
    CountryCode.multi,
    CountryCode.hi,
    CountryCode.ta,
    CountryCode.te,
    CountryCode.ml,
    CountryCode.ja,
    CountryCode.en,
  ];

  public readonly baseUrl = 'https://toonworld4all.me';

  private readonly archiveBaseUrl = 'https://archive.toonworld4all.me';

  private readonly fetcher: Fetcher;

  public constructor(fetcher: Fetcher) {
    super();
    this.fetcher = fetcher;
  }

  public async handleInternal(ctx: Context, _type: ContentType, id: Id): Promise<SourceResult[]> {
    const tmdbId = await getTmdbId(ctx, this.fetcher, id);

    if (!tmdbId.season || !tmdbId.episode) {
      return [];
    }

    // 1. Resolve show name from TMDB
    const [name] = await getTmdbNameAndYear(ctx, this.fetcher, tmdbId);

    // 2. Search for the show on ToonWorld4All
    const showPageUrl = await this.findShowPageUrl(ctx, name, tmdbId);
    if (!showPageUrl) {
      return [];
    }

    // 3. Derive the archive episode slug and fetch the episode page
    const episodeSlug = this.buildEpisodeSlug(showPageUrl, name, tmdbId);
    const episodePageUrl = new URL(`/episode/${episodeSlug}`, this.archiveBaseUrl);

    let episodeHtml: string;
    try {
      episodeHtml = await this.fetcher.text(ctx, episodePageUrl);
    } catch {
      // Episode page not found — try alternate slug derived directly from name
      const fallbackSlug = this.buildFallbackSlug(name, tmdbId);
      if (fallbackSlug === episodeSlug) {
        return [];
      }
      const fallbackUrl = new URL(`/episode/${fallbackSlug}`, this.archiveBaseUrl);
      try {
        episodeHtml = await this.fetcher.text(ctx, fallbackUrl);
      } catch {
        return [];
      }
    }

    // 4. Extract redirect links from the episode page and resolve them
    return this.extractSourceResults(ctx, episodeHtml, episodePageUrl);
  }

  /**
   * Searches toonworld4all.me for the show and returns the WordPress post URL.
   * Uses Levenshtein distance (same approach as FourKHDHub) to match titles.
   */
  private readonly findShowPageUrl = async (ctx: Context, name: string, tmdbId: TmdbId): Promise<URL | undefined> => {
    const searchUrl = new URL(`/?s=${encodeURIComponent(name)}`, this.baseUrl);
    let html: string;
    try {
      html = await this.fetcher.text(ctx, searchUrl);
    } catch {
      return undefined;
    }

    const $ = cheerio.load(html);

    // WordPress blog — results are <article> or <h2> post titles with links
    // Match by title similarity (Levenshtein) and season number
    const seasonNum = tmdbId.season as number;

    const matched = $('h2.entry-title a, h3.entry-title a, .post-title a, article a[rel="bookmark"]')
      .toArray()
      .map(el => ({
        text: $(el).text().trim(),
        href: $(el).attr('href') as string,
      }))
      .filter(({ text, href }) => href && text)
      .filter(({ text }) => {
        // Must mention the season (e.g. "Season 3" or "S3" or "S03")
        const hasSeasonMatch =
          new RegExp(`Season\\s*${seasonNum}\\b`, 'i').test(text) ||
          new RegExp(`\\bS0?${seasonNum}\\b`, 'i').test(text);
        return hasSeasonMatch;
      })
      .sort((a, b) => {
        // Sort by Levenshtein distance to the TMDB name
        const clean = (s: string) => s.replace(/\[.*?]/g, '').replace(/\(.*?\)/g, '').trim();
        return levenshtein.get(clean(a.text), name, { useCollator: true }) -
          levenshtein.get(clean(b.text), name, { useCollator: true });
      });

    if (!matched.length) {
      return undefined;
    }

    const best = matched[0]!;
    this.fetcher.logger.info(`Found show page on ToonWorld4All: ${best.text} -> ${best.href}`, ctx);
    try {
      return new URL(best.href);
    } catch {
      return new URL(best.href, this.baseUrl);
    }
  };

  /**
   * Derives the archive episode slug from the WordPress show-page URL.
   *
   * The archive uses a consistent kebab-case format:
   *   <show-name-kebab>-<season>x<episode>
   *
   * We attempt to derive it from the WordPress slug (path segment between the
   * base URL and the trailing `/`), stripping known suffix patterns like
   * `-season-N-multi-audio-hindi`, `-season-N-bluray-...` etc.
   */
  private readonly buildEpisodeSlug = (showPageUrl: URL, _name: string, tmdbId: TmdbId): string => {
    const wpSlug = showPageUrl.pathname.replace(/^\/|\/$/g, '');
    // Strip common TW4ALL suffixes to get the bare show name slug
    const bareSlug = wpSlug
      .replace(/-season-\d+.*$/, '')         // e.g. -season-3-multi-audio-hindi
      .replace(/-s\d+.*$/, '')               // e.g. -s3-...
      .replace(/-\d{4}-.*$/, '')             // e.g. -2023-...
      .replace(/-multi-audio.*$/, '')
      .replace(/-dual-audio.*$/, '')
      .replace(/-bluray.*$/, '')
      .replace(/-hindi.*$/, '')
      .replace(/-episodes?.*$/, '');

    const season = tmdbId.season as number;
    const episode = tmdbId.episode as number;
    return `${bareSlug}-${season}x${episode}`;
  };

  /**
   * Fallback slug built purely from the TMDB name, without a WordPress slug.
   */
  private readonly buildFallbackSlug = (name: string, tmdbId: TmdbId): string => {
    const kebab = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    return `${kebab}-${tmdbId.season}x${tmdbId.episode}`;
  };

  /**
   * Parses the archive episode page and extracts SourceResults.
   *
   * The page contains a JSON block in a <script> tag:
   *   window.__PROPS__ = { "data": { "data": { "encodes": [...] } } };
   *
   * We extract this JSON and parse it to get all available qualities and redirect links.
   */
  private readonly extractSourceResults = async (ctx: Context, html: string, referer: URL): Promise<SourceResult[]> => {
    const propsMatch = html.match(/window\.__PROPS__\s*=\s*(\{[\s\S]*?\});/);
    if (!propsMatch) {
      throw new NotFoundError(`Could not find __PROPS__ on ToonWorld4All episode page: ${referer.href}`);
    }

    let props: any;
    try {
      props = JSON.parse(propsMatch[1] as string);
    } catch (e) {
      throw new Error(`Failed to parse __PROPS__ on ToonWorld4All episode page: ${referer.href}`);
    }

    const encodes = props?.data?.data?.encodes || [];
    if (!encodes.length) {
      throw new NotFoundError(`No encodes found on ToonWorld4All episode page: ${referer.href}`);
    }

    const tasks: { redirectHref: string, height: number, title: string }[] = [];

    for (const encode of encodes) {
      const resolution = encode.resolution || ''; // e.g. "480p"
      const codec = encode.readable?.codec || resolution; // e.g. "480p x264"
      const heightMatch = resolution.match(/(\d{3,4})p/);
      const height = heightMatch ? parseInt(heightMatch[1] as string) : (codec.match(/(\d{3,4})p/)?.[1] ? parseInt(codec.match(/(\d{3,4})p/)![1]) : undefined);

      if (!height) continue;

      const files = encode.files || [];
      for (const file of files) {
        // Support common hosts on ToonWorld4All
        const isSupported = /hubcloud|hubdrive|filepress|gdflix|filebee/i.test(file.host);
        if (isSupported) {
          tasks.push({
            redirectHref: file.link,
            height,
            title: codec,
          });
        }
      }
    }

    if (!tasks.length) {
      throw new NotFoundError(`No supported host links found on ToonWorld4All episode page: ${referer.href}`);
    }

    const countryCodes: CountryCode[] = [CountryCode.multi, CountryCode.hi];
    const resolvedResults: SourceResult[] = [];

    await Promise.all(tasks.map(async (task) => {
      try {
        const redirectUrl = new URL(task.redirectHref, this.archiveBaseUrl);
        const redirectHtml = await this.fetcher.text(ctx, redirectUrl, {
          headers: { Referer: referer.href },
        });

        const destUrl = this.extractDestUrlFromRedirectPage(redirectHtml);
        if (!destUrl) return;

        // If it's a known redirector (gadgetsweb, etc.), resolve it.
        // Otherwise, it's a direct hoster link (HubCloud, etc.)
        const resolvedUrl = await resolveRedirectUrl(ctx, this.fetcher, destUrl);

        resolvedResults.push({
          url: resolvedUrl,
          meta: {
            height: task.height,
            title: task.title,
            countryCodes,
            referer: redirectUrl.href, // Pass the redirect page as referer for the extractor
          },
        });
      } catch (error) {
        this.fetcher.logger.error(`Failed to resolve ToonWorld4All redirect: ${task.redirectHref}`, error);
      }
    }));

    return resolvedResults;
  };



  /**
   * Extracts the destination URL from the /redirect/<hash> page HTML.
   *
   * The page renders the URL inside a <code> block like:
   *   https://hubcloud.foo/video/<span class="blur-[3px] select-none">xnbkpwc13qhxed0</span>
   *
   * The video ID is visible in the DOM but blurred visually with CSS.
   * We strip all HTML tags from the <code> block to get the plain URL.
   */
  private readonly extractDestUrlFromRedirectPage = (html: string): URL | undefined => {
    // 1. Try __PROPS__ (most reliable)
    const propsMatch = html.match(/window\.__PROPS__\s*=\s*(\{[\s\S]*?\});/);
    if (propsMatch) {
      try {
        const props = JSON.parse(propsMatch[1] as string);
        if (props.link?.domain && props.link?.hidden) {
          return new URL(`${props.link.domain}${props.link.hidden}`);
        }
      } catch (e) {
        // ignore
      }
    }

    // 2. Fallback to <code> tag (obfuscated)
    const codeMatch = html.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
    if (codeMatch) {
      const plainText = (codeMatch[1] as string).replace(/<[^>]+>/g, '').trim();
      if (plainText.startsWith('http')) {
        try {
          return new URL(plainText);
        } catch {
          // ignore
        }
      }
    }

    return undefined;
  };
}
