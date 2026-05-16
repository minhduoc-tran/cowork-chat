import env from "./configs/env";
import { createHttpServer } from "./socket/socket.server";
import { logger } from "./utils/logger";
import { configureGracefulShutdown } from "./utils/shutdown";

const port = env.PORT || 9000;
const server = createHttpServer();

server.listen(port, () => {
  logger.info(`[server]: Server is running at http://localhost:${port}`);
  logger.info(`[server]: Environment: ${env.NODE_ENV}`);
  logger.info(
    `[server]: Swagger docs are available at http://localhost:${port}/api/docs`
  );
});

configureGracefulShutdown(server);