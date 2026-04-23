import { Request, Response, Router } from 'express';
import { Extractor } from '../extractor';
import { Source } from '../source';
import { Config } from '../types';
import { buildManifest, parseConfig } from '../utils';

export class ManifestController {
  public readonly router: Router;

  private readonly sources: Source[];
  private readonly extractors: Extractor[];

  public constructor(sources: Source[], extractors: Extractor[]) {
    this.router = Router();

    this.sources = sources;
    this.extractors = extractors;

    this.router.get('/manifest.json', this.getManifest.bind(this));
    this.router.get('/:config/manifest.json', this.getManifest.bind(this));
  }

  private getManifest(req: Request, res: Response) {
    const config: Config = parseConfig(req.params['config'] as string | undefined);

    const manifest = buildManifest(this.sources, this.extractors, config);

    res.setHeader('Content-Type', 'application/json');
    res.send(manifest);
  };
}
