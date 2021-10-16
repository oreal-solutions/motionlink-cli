import { APIErrorCode } from '@notionhq/client/build/src';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const allowedNotionApiCallsPerSecond = 3;
const sleepTimeInMillis = 1000/allowedNotionApiCallsPerSecond;

export async function resultOf<T>(notionCall: () => Promise<T>): Promise<T> {
  try {
    return await notionCall();
  } catch (e) {
    if ((e as any).status === APIErrorCode.RateLimited) {
      await sleep(sleepTimeInMillis);
      return resultOf(notionCall);
    }

    throw e;
  }
}
