export type Logger = {
  logPageFlushed: (pagePath: string) => void;
};

let defaultLogger: Logger = {
  logPageFlushed: (pagePath) => {
    console.log('Flushed: \x1b[36m%s ✔\x1b[0m', pagePath); // cyan
  },
};

export function setMockedLogger(logger: Logger) {
  defaultLogger = logger;
}

export function getLogger(): Logger {
  return defaultLogger;
}
