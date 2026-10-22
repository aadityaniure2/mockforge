import { describe, it, expect } from 'vitest';
import { parseCliArgs } from '../src/cli/args.js';

describe('CLI Args Parser (cli-and-watcher)', () => {
  it('parses default CLI flags correctly', () => {
    const opts = parseCliArgs(['node', 'mockforge', 'spec.yaml']);
    expect(opts.spec).toBe('spec.yaml');
    expect(opts.port).toBe(4000);
    expect(opts.delay).toBe(0);
    expect(opts.chaos).toBe(0);
    expect(opts.stateless).toBe(false);
    expect(opts.watch).toBe(false);
  });

  it('parses custom flags correctly', () => {
    const opts = parseCliArgs([
      'node',
      'mockforge',
      'https://example.com/openapi.json',
      '-p',
      '8080',
      '-d',
      '500',
      '-c',
      '0.25',
      '--stateless',
      '--watch',
    ]);
    expect(opts.spec).toBe('https://example.com/openapi.json');
    expect(opts.port).toBe(8080);
    expect(opts.delay).toBe(500);
    expect(opts.chaos).toBe(0.25);
    expect(opts.stateless).toBe(true);
    expect(opts.watch).toBe(true);
  });
});
