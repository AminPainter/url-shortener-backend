import { RequestMethod } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

export { Logger } from 'nestjs-pino';

export const PinoLoggerModule = LoggerModule.forRoot({
  exclude: [{ method: RequestMethod.GET, path: 'health' }],
  pinoHttp: {
    serializers: {
      req: (req: { id: unknown; method: string; url: string }) => ({
        id: req.id,
        method: req.method,
        url: req.url.split('?')[0],
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  },
});
