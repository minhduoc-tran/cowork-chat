/**
 * Health service - Business logic for health check endpoints
 */
export class HealthService {
  getBasicHealth() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  getDetailedHealth() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
      memory: {
        used:
          Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) /
          100,
        total:
          Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) /
          100,
        unit: "MB"
      },
      cpu: {
        usage: process.cpuUsage()
      }
    };
  }
}

export const healthService = new HealthService();
