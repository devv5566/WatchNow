import { Request, Response, Router } from 'express';
import { ContentType } from 'stremio-addon-sdk';
import { Fetcher, Tw4aId } from '../utils';
import axios from 'axios';

export class MetaController {
  public readonly router: Router;

  constructor(_fetcher: Fetcher) {
    this.router = Router();

    this.router.get('/meta/:type/:id.json', this.getMeta.bind(this));
    this.router.get('/:config/meta/:type/:id.json', this.getMeta.bind(this));
  }

  private async getMeta(req: Request, res: Response) {
    const type = req.params['type'] as ContentType;
    const rawId = req.params['id'] as string;
    
    if (!rawId || !rawId.startsWith('tw4a:')) {
        // We don't handle TMDB/IMDB meta, Stremio does it or another addon
        return res.status(404).send('Not Found');
    }

    const tw4aId = Tw4aId.fromString(rawId.replace('tw4a:', ''));
    const name = tw4aId.slug.replace(/-/g, ' ');

    try {
        // Search TMDB to get rich metadata for this ToonWorld item
        const tmdbResults = await this.searchTmdb(name, type);
        if (tmdbResults && tmdbResults.length > 0) {
            const tmdbId = tmdbResults[0].id;
            const meta = await this.fetchTmdbMeta(tmdbId, type);
            
            if (meta) {
                // Return TMDB meta but overwrite the ID so Stremio routes back to us
                meta.id = rawId;
                return res.json({ meta });
            }
        }
    } catch (e) {
        console.error('Meta resolution error:', e);
    }

    // Fallback: minimal metadata if TMDB fails
    return res.json({
      meta: {
        id: rawId,
        type,
        name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        description: `Watch ${name} on ToonWorld4All`,
      }
    });
  }

  private async searchTmdb(query: string, type: string) {
    const apiKey = process.env['TMDB_ACCESS_TOKEN'];
    if (!apiKey) return null;

    const endpoint = type === 'movie' ? 'search/movie' : 'search/tv';
    const response = await axios.get(`https://api.themoviedb.org/3/${endpoint}`, {
      params: { query, api_key: apiKey },
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    return response.data.results;
  }

  private async fetchTmdbMeta(id: number, type: string) {
    const apiKey = process.env['TMDB_ACCESS_TOKEN'];
    if (!apiKey) return null;

    const endpoint = type === 'movie' ? `movie/${id}` : `tv/${id}`;
    const response = await axios.get(`https://api.themoviedb.org/3/${endpoint}`, {
      params: { append_to_response: 'external_ids,videos', api_key: apiKey },
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    
    const data = response.data;
    return {
        id: `tmdb:${id}`,
        type: type as ContentType,
        name: data.name || data.title,
        poster: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
        background: `https://image.tmdb.org/t/p/original${data.backdrop_path}`,
        description: data.overview,
        releaseInfo: data.first_air_date || data.release_date,
        // For series, Stremio will use this to show seasons/episodes
    };
  }
}
