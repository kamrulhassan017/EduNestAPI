import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiResponse,
  getSchemaPath,
  ReferenceObject,
  SchemaObject,
} from '@nestjs/swagger';
import { PaginationMetaDto } from './swagger.dto';

export interface ApiEnvelopeOptions {
  status?: HttpStatus;
  description?: string;
  isArray?: boolean;
  paginated?: boolean;
}

export function ApiEnvelope(
  model: Type<unknown> | null,
  options: ApiEnvelopeOptions = {},
) {
  const {
    status = HttpStatus.OK,
    description,
    isArray = false,
    paginated = false,
  } = options;

  let data: SchemaObject | ReferenceObject;
  if (model === null) {
    data = { type: 'object', nullable: true, example: null };
  } else if (isArray || paginated) {
    data = { type: 'array', items: { $ref: getSchemaPath(model) } };
  } else {
    data = { $ref: getSchemaPath(model) };
  }

  const extraModels: Type<unknown>[] = [PaginationMetaDto];
  if (model) extraModels.push(model);

  return applyDecorators(
    ApiExtraModels(...extraModels),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['success', 'message', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'OK' },
          data,
          meta: paginated
            ? { $ref: getSchemaPath(PaginationMetaDto) }
            : { type: 'object', nullable: true, example: null },
        },
      },
    }),
  );
}
