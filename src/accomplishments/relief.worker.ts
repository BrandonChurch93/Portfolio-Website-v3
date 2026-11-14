import { compose, type Job } from './compose';

self.onmessage = (e: MessageEvent<{ id: number; job: Job }>) => {
  const out = compose(e.data.job);
  (self as unknown as Worker).postMessage({ id: e.data.id, out }, [out.data.buffer]);
};
