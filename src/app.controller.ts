import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { ResponseMessage } from './common/decorators/response-message.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  @ResponseMessage('Service is running')
  @ApiOperation({ summary: 'Check that the API and the database are up' })
  @ApiOkResponse({ description: 'API status and database connection status' })
  getHealth() {
    return this.appService.getHealth();
  }
}
