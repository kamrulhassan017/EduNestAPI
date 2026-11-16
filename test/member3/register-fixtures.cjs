// Loaded only by Member 3 tests. Redirect exact missing-team contracts in this
// process, without creating or modifying files in the teammate-owned folders.
const path = require('node:path');
const Module = require('node:module');
require('reflect-metadata');
require('ts-node/register/transpile-only');
const root = path.resolve(__dirname, '../..');
const contractPaths = new Set(
  [
    'src/users/enums/role.enum',
    'src/users/entities/user.entity',
    'src/users/users.service',
    'src/users/users.module',
    'src/common/decorators/roles.decorator',
    'src/common/decorators/current-user.decorator',
  ].map((file) => path.join(root, file)),
);
const original = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (parent?.filename && request.startsWith('.')) {
    const candidate = path
      .resolve(path.dirname(parent.filename), request)
      .replace(/\.ts$/, '');
    if (contractPaths.has(candidate))
      return path.join(__dirname, 'fixture-contracts.cjs');
  }
  return original.call(this, request, parent, ...rest);
};
