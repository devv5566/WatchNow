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
    return this.slug + (this.season !== undefined ? '/' + this.season : '') + (this.episode !== undefined ? ':' + this.episode : '');
  }

  public static fromString(id: string): Tw4aId {
    // Accept both "slug" and "slug/season:episode"
    const m = id.match(/^(?<slug>[\w-]+)(\/(?<season>\d+))?(:(?<episode>\d+))?$/);
    if (!m) {
      throw new Error(`Invalid Tw4aId string: ${id}`);
    }
    const { slug, season, episode } = m.groups!;
    return new Tw4aId(
      slug!,
      season ? parseInt(season) : undefined,
      episode ? parseInt(episode) : undefined,
    );
  }
}
