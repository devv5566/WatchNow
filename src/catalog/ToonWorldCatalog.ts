import * as cheerio from 'cheerio';
import { MetaPreview } from 'stremio-addon-sdk';
import { Context } from '../types';
import { Fetcher } from '../utils';

export class ToonWorldCatalog {
  private readonly baseUrl = 'https://toonworld4all.me';
  private readonly fetcher: Fetcher;

  constructor(fetcher: Fetcher) {
    this.fetcher = fetcher;
  }

  public async getLatest(ctx: Context, page: number = 1): Promise<MetaPreview[]> {
    return this.scrapeCategory(ctx, '', page);
  }

  public async getAnimeMovies(ctx: Context, page: number = 1): Promise<MetaPreview[]> {
    return this.scrapeCategory(ctx, 'category/anime-movies/', page);
  }

  public async getLatestCartoons(ctx: Context, page: number = 1): Promise<MetaPreview[]> {
    return this.scrapeCategory(ctx, 'category/cartoon-series/', page);
  }

  private async scrapeCategory(ctx: Context, path: string, page: number = 1): Promise<MetaPreview[]> {
    const url = page > 1 ? `${this.baseUrl}/${path}page/${page}/` : `${this.baseUrl}/${path}`;
    const html = await this.fetcher.text(ctx, new URL(url));
    const $ = cheerio.load(html);

    const metas: MetaPreview[] = [];

    $('article.herald-post').each((_i, el) => {
      const titleLink = $(el).find('.entry-title a');
      const title = titleLink.text().trim();
      const href = titleLink.attr('href');
      const poster = $(el).find('.wp-post-image').attr('src');

      if (title && href) {
        try {
          const absoluteUrl = new URL(href, this.baseUrl);
          const slug = absoluteUrl.pathname.replace(/^\/|\/$/g, '');
        
          metas.push({
            id: `tw4a:${slug}`,
            type: title.toLowerCase().includes('movie') || path.includes('movies') ? 'movie' : 'series',
            name: title,
            poster: poster,
            description: `Watch ${title} on ToonWorld4All`,
          });
        } catch (e) {
          // Ignore malformed URLs
        }
      }
    });

    return metas;
  }
}
