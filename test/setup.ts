import { setMockedLogger } from '../src/logger';

// Disable logging
setMockedLogger({
  logPageFlushed: (_) => undefined,
  logWithColor: (_) => undefined,
});
