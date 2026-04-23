export class Tw4aId {
  public readonly slug: string;
  public readonly season?: number;
  public readonly episode?: number;

  constructor(slug: string, season?: number, episode?: number) {
    this.slug = slug;
    if (season !== undefined) this.season = season;
    if (episode !== undefined) this.episode = episode;
  }

  public toString(): string {
    if (this.season !== undefined && this.episode !== undefined) {
      return `tw4a:${this.slug}:${this.season}:${this.episode}`;
    }
    return `tw4a:${this.slug}`;
  }

  public static fromString(id: string): Tw4aId {
    const parts = id.split(':');
    const slug = parts[0] as string;
    const season = parts[1] ? parseInt(parts[1]) : undefined;
    const episode = parts[2] ? parseInt(parts[2]) : undefined;
    return new Tw4aId(slug, season, episode);
  }
}
