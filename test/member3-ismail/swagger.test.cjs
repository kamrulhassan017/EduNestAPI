require('reflect-metadata');
require('ts-node/register/transpile-only');
const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { Controller, Get, Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const {
  SwaggerModule,
  DocumentBuilder,
  ApiProperty,
} = require('@nestjs/swagger');
const {
  ApiEnvelope,
} = require('../../src/common/swagger/api-envelope.decorator.ts');
const {
  ApiErrors,
} = require('../../src/common/swagger/api-errors.decorator.ts');

class Example {}
ApiProperty({ type: Number, example: 1 })(Example.prototype, 'id');
class ProbeController {
  single() {}
  array() {}
  paginated() {}
  empty() {}
}
Controller('probe')(ProbeController);
for (const [name, model, options] of [
  ['single', Example, { status: 201, description: 'Created' }],
  ['array', Example, { isArray: true }],
  ['paginated', Example, { paginated: true }],
  ['empty', null, {}],
]) {
  const descriptor = Object.getOwnPropertyDescriptor(
    ProbeController.prototype,
    name,
  );
  Get(name)(ProbeController.prototype, name, descriptor);
  ApiEnvelope(model, options)(ProbeController.prototype, name, descriptor);
  ApiErrors(
    400,
    401,
    403,
    404,
    409,
  )(ProbeController.prototype, name, descriptor);
}
class ProbeModule {}
Module({ controllers: [ProbeController] })(ProbeModule);
let app, document;
before(async () => {
  app = await NestFactory.create(ProbeModule, { logger: false });
  document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Test').setVersion('1').build(),
  );
});
after(async () => {
  if (app) await app.close();
});
const response = (path, status = 200) =>
  document.paths[`/probe/${path}`].get.responses[status];
const schema = (path, status = 200) =>
  response(path, status).content['application/json'].schema;

test('ApiEnvelope supports single models, custom status/description and nullable meta', () => {
  assert.equal(response('single', 201).description, 'Created');
  assert.equal(
    schema('single', 201).properties.data.$ref,
    '#/components/schemas/Example',
  );
  assert.equal(schema('single', 201).properties.meta.nullable, true);
});
test('ApiEnvelope supports plain arrays for offering grades and paginated arrays for lists', () => {
  assert.equal(schema('array').properties.data.type, 'array');
  assert.equal(
    schema('array').properties.data.items.$ref,
    '#/components/schemas/Example',
  );
  assert.equal(schema('array').properties.meta.nullable, true);
  assert.equal(
    schema('paginated').properties.meta.$ref,
    '#/components/schemas/PaginationMetaDto',
  );
});
test('ApiEnvelope documents null delete/change-password responses', () => {
  assert.equal(schema('empty').properties.data.nullable, true);
  assert.equal(schema('empty').properties.data.example, null);
});
test('ApiErrors supplies all five error responses with string-or-array messages', () => {
  for (const status of [400, 401, 403, 404, 409]) {
    assert.equal(
      response('single', status).content['application/json'].schema.$ref,
      '#/components/schemas/ErrorResponseDto',
    );
  }
  assert.deepEqual(
    document.components.schemas.ErrorResponseDto.properties.message.oneOf,
    [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  );
});
