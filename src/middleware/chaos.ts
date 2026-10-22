import type { Context, Next } from 'hono';
import pc from 'picocolors';

export interface ChaosOptions {
  delay?: number;
  chaos?: number;
  silent?: boolean;
}

export function createPipelineMiddleware(options: ChaosOptions = {}) {
  const globalDelay = options.delay ?? 0;
  const chaosRate = options.chaos ?? 0;

  return async (c: Context, next: Next) => {
    const start = Date.now();
    const preferHeader = c.req.header('prefer') || c.req.header('Prefer') || '';

    // 1. Prefer Header Overrides
    if (preferHeader) {
      // Check for code=XXX or status=XXX
      const statusCodeMatch = preferHeader.match(/(?:code|status)=(\d{3})/i);
      if (statusCodeMatch) {
        const code = parseInt(statusCodeMatch[1], 10);
        const duration = Date.now() - start;
        if (!options.silent) {
          console.log(
            `${pc.bold(c.req.method)} ${c.req.path} -> ${pc.red(code)} (${duration}ms)`
          );
        }
        return c.json(
          { message: 'Simulated error via Prefer header', status: code },
          code as any
        );
      }

      // Check for delay=XXX
      const delayMatch = preferHeader.match(/delay=(\d+)/i);
      if (delayMatch) {
        const delayMs = parseInt(delayMatch[1], 10);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // 2. Global Artificial Latency
    if (globalDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, globalDelay));
    }

    // 3. Chaos Monkey Injection
    if (chaosRate > 0 && Math.random() < chaosRate) {
      const chaosStatus = Math.random() < 0.5 ? 500 : 503;
      const duration = Date.now() - start;
      if (!options.silent) {
        console.log(
          `${pc.bold(c.req.method)} ${c.req.path} -> ${pc.red(chaosStatus)} [CHAOS] (${duration}ms)`
        );
      }
      return c.json(
        {
          error:
            chaosStatus === 500
              ? 'Internal Server Error'
              : 'Service Unavailable',
          chaos: true,
        },
        chaosStatus as any
      );
    }

    await next();

    // 5. Real-Time Request Logger
    const duration = Date.now() - start;
    const status = c.res.status;
    const colorStatus =
      status >= 500
        ? pc.red(status)
        : status >= 400
        ? pc.yellow(status)
        : status >= 300
        ? pc.cyan(status)
        : pc.green(status);

    if (!options.silent) {
      console.log(
        `${pc.bold(c.req.method)} ${c.req.path} -> ${colorStatus} (${duration}ms)`
      );
    }
  };
}
