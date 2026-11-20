process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
process.argv = [
  process.execPath,
  require.resolve('@playwright/test/cli'),
  'test',
  ...process.argv.slice(2),
];
require('@playwright/test/cli');
