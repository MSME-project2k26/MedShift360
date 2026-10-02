const env = require('./config/env');
const app = require('./app');
const logger = require('./utils/logger');

const server = app.listen(env.PORT, () => {
  logger.info(`MedShift360 API listening on http://localhost:${env.PORT}/api/v1`, { env: env.NODE_ENV });
});

function shutdown(signal) {
  logger.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { error: reason instanceof Error ? reason.message : String(reason) });
});
