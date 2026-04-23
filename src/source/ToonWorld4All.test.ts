import { createTestContext } from '../test';
import { FetcherMock, TmdbId } from '../utils';
import { ToonWorld4All } from './ToonWorld4All';

const ctx = createTestContext();

describe('ToonWorld4All', () => {
  let source: ToonWorld4All;

  beforeEach(() => {
    source = new ToonWorld4All(new FetcherMock(`${__dirname}/__fixtures__/ToonWorld4All`));
  });

  test('handle jujutsu kaisen s03e01', async () => {
    const streams = await source.handle(ctx, 'series', new TmdbId(95479, 3, 1));
    expect(streams).toMatchSnapshot();
  });

  test('handle naruto s01e01', async () => {
    const streams = await source.handle(ctx, 'series', new TmdbId(119051, 1, 1));
    expect(streams).toMatchSnapshot();
  });
});
