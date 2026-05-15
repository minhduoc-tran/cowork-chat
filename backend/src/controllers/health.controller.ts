import { Request, Response } from "express";
import { ApiResponse } from "../utils/api-response";
import { healthService } from "../services/health.service";

/**
 * Basic health check endpoint
 * GET /api/v1/health
 */
export const healthCheck = async (_req: Request, res: Response) => {
  const health = healthService.getBasicHealth();
  return ApiResponse.Success(res, "Service is healthy", health);
};

/**
 * Detailed health check with system information
 * GET /api/v1/health/detailed
 */
export const detailedHealthCheck = async (_req: Request, res: Response) => {
  const health = healthService.getDetailedHealth();
  return ApiResponse.Success(res, "Service is healthy", health);
};