import { register } from 'node:module';

register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);

const { NodeSDK } = await import('@opentelemetry/sdk-node');
const { HttpInstrumentation } =
  await import('@opentelemetry/instrumentation-http');
const { FastifyOtelInstrumentation } = await import('@fastify/otel');
const { PgInstrumentation } = await import('@opentelemetry/instrumentation-pg');
const { RedisInstrumentation } =
  await import('@opentelemetry/instrumentation-redis');
const { PinoInstrumentation } =
  await import('@opentelemetry/instrumentation-pino');

const isHealth = (url) => url?.endsWith('/health') ?? false;
const stripQuery = (url) => url.split('?')[0];

const sdk = new NodeSDK({
  instrumentations: [
    new HttpInstrumentation({
      ignoreIncomingRequestHook: (req) => isHealth(req.url),
      requestHook: (span, req) => {
        if (req.url?.includes('?')) span.setAttribute('url.query', 'REDACTED');
      },
    }),
    new FastifyOtelInstrumentation({
      registerOnInitialization: true,
      instrumentHooks: false,
      ignorePaths: ({ url }) => isHealth(url),
      requestHook: (span, request) =>
        span.setAttribute('url.path', stripQuery(request.url)),
    }),
    new PgInstrumentation({ ignoreConnectSpans: true }),
    new RedisInstrumentation({
      dbStatementSerializer: (cmd, args) => `${cmd} ${args[0] ?? ''}`.trim(),
    }),
    new PinoInstrumentation(),
  ],
});

sdk.start();

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => sdk.shutdown());
}
