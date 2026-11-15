import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'response_message';

/**
 * Sets the "message" field of the response envelope for one route.
 *
 *   @Post()
 *   @ResponseMessage('Course created')
 *   create(@Body() dto: CreateCourseDto) { ... }
 */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
