import { Controller, Post, Body } from '@nestjs/common';

@Controller('test')
export class TestController {
  @Post()
  test(@Body() body: any) {
    console.log('Request body:', body);
    return { message: 'OK', data: body };
  }
}
