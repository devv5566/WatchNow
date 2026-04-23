import { Request, Response, Router } from 'express';
import { MetaPreview } from 'stremio-addon-sdk';
import { ToonWorldCatalog } from '../catalog/ToonWorldCatalog';
import { contextFromRequestAndResponse, getDefaultConfig } from '../utils';

export class CatalogController {
  public readonly router: Router;
  private readonly catalog: ToonWorldCatalog;

  constructor(catalog: ToonWorldCatalog) {
    this.router = Router();
    this.catalog = catalog;

    this.router.get('/catalog/:type/:id.json', this.getCatalog.bind(this));
    this.router.get('/:config/catalog/:type/:id.json', this.getCatalog.bind(this));
  }

  private async getCatalog(req: Request, res: Response) {
    try {
      const id = req.params['id'];
      const config = req.params['config'] ? JSON.parse(req.params['config'] as string) : getDefaultConfig();
      const ctx = contextFromRequestAndResponse(req, res);
      ctx.config = config;

      let metas: MetaPreview[] = [];

      if (id === 'tw4a_latest') {
        const skip = parseInt(req.query['skip'] as string || '0');
        const page = Math.floor(skip / 10) + 1;
        metas = await this.catalog.getLatest(ctx, page);
      } else if (id === 'tw4a_movies') {
        const skip = parseInt(req.query['skip'] as string || '0');
        const page = Math.floor(skip / 10) + 1;
        metas = await this.catalog.getAnimeMovies(ctx, page);
      } else if (id === 'tw4a_cartoons') {
        const skip = parseInt(req.query['skip'] as string || '0');
        const page = Math.floor(skip / 10) + 1;
        metas = await this.catalog.getLatestCartoons(ctx, page);
      }

      res.setHeader('Content-Type', 'application/json');
      res.send({ metas });
    } catch (e) {
      console.error('Catalog error:', e);
      res.status(500).send({ metas: [], error: 'Internal Server Error' });
    }
  }
}
