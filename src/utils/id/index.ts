import { Context } from '../../types';
import { Fetcher } from '../Fetcher';
import { getImdbIdFromTmdbId, getTmdbIdFromImdbId } from '../tmdb';
import { ImdbId } from './ImdbId';
import { TmdbId } from './TmdbId';
import { Tw4aId } from './Tw4aId';

export * from './ImdbId';
export * from './TmdbId';
export * from './Tw4aId';

export type Id = ImdbId | TmdbId | Tw4aId;

export const getImdbId = async (ctx: Context, fetcher: Fetcher, id: Id): Promise<ImdbId> => {
  if (id instanceof TmdbId) {
    return await getImdbIdFromTmdbId(ctx, fetcher, id);
  }
  if (id instanceof Tw4aId) {
    return new ImdbId('tt0000000', undefined, undefined); // dummy
  }

  return id;
};

export const getTmdbId = async (ctx: Context, fetcher: Fetcher, id: Id): Promise<TmdbId> => {
  if (id instanceof ImdbId) {
    return await getTmdbIdFromImdbId(ctx, fetcher, id);
  }
  if (id instanceof Tw4aId) {
    return { tmdbId: 0, season: id.season, episode: id.episode, id: 'tw4a', formatSeasonAndEpisode: () => '' } as unknown as TmdbId; // dummy
  }

  return id;
};
