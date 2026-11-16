// Runs integration tests against a new, loopback-only disposable PostgreSQL 17.
// No .env is read and no existing database/container is used or deleted.
const { execFileSync, spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

async function main() {
  const name = `edunest-member3-${process.pid}-${Date.now()}`;
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
        'POSTGRES_USER=member3',
        '-e',
        `POSTGRES_PASSWORD=${password}`,
        '-e',
        'POSTGRES_DB=member3_test',
        '-p',
        '127.0.0.1::5432',
        'postgres:17-alpine',
      ],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    );
    created = true;
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      const result = spawnSync(
        'docker',
        [
          'exec',
          name,
          'pg_isready',
          '-h',
          '127.0.0.1',
          '-U',
          'member3',
          '-d',
          'member3_test',
        ],
        { stdio: 'ignore' },
      );
      if (result.status === 0) {
        ready = true;
        break;
      }
      await delay(500);
    }
    if (!ready)
      throw Error(
        'Temporary PostgreSQL did not become ready within 30 seconds',
      );
    const address = execFileSync('docker', ['port', name, '5432/tcp'], {
      encoding: 'utf8',
    }).trim();
    const port = address.split(':').at(-1);
    console.log(
      `Testing Member 3 against disposable PostgreSQL on 127.0.0.1:${port}`,
    );
    console.log(
      'Member 2 identity/role contracts are TEST FIXTURES, not real JWT authentication.',
    );
    const result = spawnSync(
      process.execPath,
      ['--test', 'test/member3-ismail/catalogue.integration.test.cjs'],
      {
        cwd: path.resolve(__dirname, '../..'),
        stdio: 'inherit',
        timeout: 180000,
        env: {
          ...process.env,
          MEMBER3_TEST_PORT: port,
          MEMBER3_TEST_PASSWORD: password,
        },
      },
    );
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally {
    if (created) {
      execFileSync('docker', ['rm', '-f', name], { stdio: 'ignore' });
      console.log(
        'Removed the temporary PostgreSQL container and its database.',
      );
    }
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
