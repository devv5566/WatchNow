import { FourKHDHub } from './FourKHDHub';
import { HDHub4u } from './HDHub4u';
import { Showbox } from './Showbox';
import { Fetcher } from '../utils';
import { Source } from './Source';

export * from './Source';

export const createSources = (fetcher: Fetcher): Source[] => {


  return [
    new FourKHDHub(fetcher),
    new HDHub4u(fetcher),
    new Showbox(fetcher),
  ];
};
