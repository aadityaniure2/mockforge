import { Command } from 'commander';

export interface CliOptions {
  spec: string;
  port: number;
  delay: number;
  chaos: number;
  stateless: boolean;
  watch: boolean;
}

export function parseCliArgs(argv: string[] = process.argv): CliOptions {
  const program = new Command();

  program
    .name('mockforge')
    .description('Instant, zero-setup OpenAPI 3.0/3.1 mock server CLI')
    .version('1.0.0', '-v, --version', 'Output the version number')
    .argument('<spec>', 'Path to local OpenAPI spec file (.yaml, .yml, .json) or remote URL')
    .option('-p, --port <number>', 'Port to bind server (auto-increments if port is busy)', '4000')
    .option('-d, --delay <ms>', 'Fixed artificial delay in milliseconds', '0')
    .option('-c, --chaos <rate>', 'Chaos monkey failure rate between 0.0 and 1.0', '0')
    .option('-s, --stateless', 'Disable stateful in-memory CRUD persistence', false)
    .option('-w, --watch', 'Watch local spec file for changes and hot-reload', false);

  program.parse(argv);

  const [spec] = program.args;
  const rawOpts = program.opts();

  const port = parseInt(rawOpts.port, 10) || 4000;
  const delay = parseInt(rawOpts.delay, 10) || 0;
  const chaos = parseFloat(rawOpts.chaos) || 0;
  const stateless = Boolean(rawOpts.stateless);
  const watch = Boolean(rawOpts.watch);

  return {
    spec,
    port,
    delay,
    chaos,
    stateless,
    watch,
  };
}
