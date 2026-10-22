import { watch, type FSWatcher } from 'chokidar';
import path from 'node:path';
import pc from 'picocolors';
import { parseSpec, type OpenAPISpec } from './parser.js';

export interface WatcherOptions {
  onReload: (newSpec: OpenAPISpec) => void;
  debounceMs?: number;
}

export function setupSpecWatcher(
  specPath: string,
  options: WatcherOptions
): FSWatcher | null {
  // Remote URLs cannot be watched locally
  if (/^https?:\/\//i.test(specPath)) {
    return null;
  }

  const resolvedPath = path.isAbsolute(specPath)
    ? specPath
    : path.resolve(process.cwd(), specPath);

  const debounceMs = options.debounceMs ?? 200;
  let timer: NodeJS.Timeout | null = null;

  const watcher = watch(resolvedPath, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  const handleUpdate = () => {
    if (timer) clearTimeout(timer);

    timer = setTimeout(async () => {
      console.log(pc.cyan(`\n[mockforge] Detected change in ${path.basename(resolvedPath)}, reloading...`));
      try {
        const newSpec = await parseSpec(resolvedPath);
        options.onReload(newSpec);
        console.log(pc.green(`[mockforge] Hot-reloaded spec successfully without downtime.`));
      } catch (err: any) {
        console.error(pc.red(`[mockforge] Hot-reload failed: ${err.message}`));
        console.log(pc.yellow(`[mockforge] Keeping existing routes active.`));
      }
    }, debounceMs);
  };

  watcher.on('change', handleUpdate);
  watcher.on('add', handleUpdate);

  return watcher;
}
