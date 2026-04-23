import * as cheerio from 'cheerio';
import { NotFoundError } from '../error';
import { Context, Format, InternalUrlResult, Meta } from '../types';
import { Extractor } from './Extractor';

export class GDFlix extends Extractor {
  public readonly id = 'gdflix';

  public readonly label = 'GDFlix';

  public override readonly ttl = 43200000; // 12h

  public supports(_ctx: Context, url: URL): boolean {
    return url.host.includes('gdflix.dev');
  }

  protected async extractInternal(ctx: Context, url: URL, meta: Meta): Promise<InternalUrlResult[]> {
    const headers = { Referer: meta.referer ?? url.href };

    const html = await this.fetcher.text(ctx, url, { headers });

    const $ = cheerio.load(html);
    const title = $('title').text().trim() || 'GDFlix';

    // 1. Try JS variable patterns
    const filePatterns = [
      /file\s*:\s*"(https?:\/\/[^"]+)"/i,
      /sources:\s*\[.*?file\s*:\s*"([^"]+)"/i,
      /var\s+file\s*=\s*"([^"]+)"/i,
    ];

    for (const pattern of filePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        try {
          const videoUrl = new URL(match[1]);
          return [{ url: videoUrl, format: Format.mp4, meta: { ...meta, title } }];
        } catch { /* ignore */ }
      }
    }

    // 2. <source> tags
    const sources: InternalUrlResult[] = [];
    $('source').each((_i, el) => {
      const src = $(el).attr('src');
      if (src) {
        try {
          const videoUrl = new URL(src, url.href);
          sources.push({
            url: videoUrl,
            format: Format.hls,
            meta: { ...meta, title: $(el).parent().text().trim() || title },
          });
        } catch { /* ignore */ }
      }
    });
    if (sources.length > 0) return sources;

    // 3. <a> with video extensions
    const videoLinks: InternalUrlResult[] = [];
    $('a').each((_i, el) => {
      const href = $(el).attr('href');
      if (href && /\.(mp4|mkv|avi|webm|m3u8)(\?|$)/i.test(href)) {
        try {
          const videoUrl = new URL(href, url.href);
          videoLinks.push({
            url: videoUrl,
            format: href.endsWith('.m3u8') ? Format.hls : Format.mp4,
            meta: { ...meta, title: $(el).text().trim() || title },
          });
        } catch { /* ignore */ }
      }
    });
    if (videoLinks.length > 0) return videoLinks;

    throw new NotFoundError('No video URL found on GDFlix page');
  }
}
