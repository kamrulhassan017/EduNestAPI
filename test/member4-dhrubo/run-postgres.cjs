// Creates/removes only its own disposable, loopback-only PostgreSQL 17 container.
// Never reads .env. Existing databases/containers and production source are untouched.
const { execFileSync, spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');

async function main() {
  const name = `edunest-member4-${process.pid}-${Date.now()}`;
  const password = randomBytes(24).toString('hex');
  let created = false;
  try {
    execFileSync(
      'docker',
      [
        'run',
        '--rm',
        '-d',
        '--name',
        name,
        '-e',
        'POSTGRES_USER=member4',
        '-e',
        `POSTGRES_PASSWORD=${password}`,
        '-e',
        'POSTGRES_DB=member4_test',
        '-p',
        '127.0.0.1::5432',
        'postgres:17-alpine',
      ],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    );
    created = true;
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      const check = spawnSync(
        'docker',
        [
          'exec',
          name,
          'pg_isready',
          '-h',
          '127.0.0.1',
          '-U',
          'member4',
          '-d',
          'member4_test',
        ],
        { stdio: 'ignore' },
      );
      if (check.status === 0) {
        ready = true;
        break;
      }
      await delay(500);
    }
    if (!ready) throw Error('Temporary PostgreSQL failed to become ready');
    const port = execFileSync('docker', ['port', name, '5432/tcp'], {
      encoding: 'utf8',
    })
      .trim()
      .split(':')
      .at(-1);
    console.log(
      `Member 4 real PostgreSQL/HTTP tests on 127.0.0.1:${port}; Member 2 identities are fixtures, NOT JWT tests.`,
    );
    const result = spawnSync(
      process.execPath,
      ['--test', 'test/member4-dhrubo/workflows.integration.test.cjs'],
      {
        cwd: path.resolve(__dirname, '../..'),
        stdio: 'inherit',
        timeout: 180000,
        env: {
          ...process.env,
          MEMBER4_TEST_PORT: port,
          MEMBER4_TEST_PASSWORD: password,
        },
      },
    );
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally {
    if (created) {
      execFileSync('docker', ['rm', '-f', name], { stdio: 'ignore' });
      console.log('Removed the temporary PostgreSQL container and database.');
    }
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
