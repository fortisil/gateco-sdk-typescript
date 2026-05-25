/**
 * Dashboard resource -- aggregated stats.
 */

import type { GatecoClient } from "../client.js";
import type { DashboardStats } from "../types/dashboard.js";
import { parseDashboardStats } from "../types/dashboard.js";

/** Namespace for dashboard endpoints. Accessed as `client.dashboard`. */
export class DashboardResource {
  constructor(private readonly client: GatecoClient) {}

  /**
   * Fetch aggregated dashboard statistics.
   *
   * @param sparklines  When true, includes 24h hourly + 7d daily sparkline arrays
   *                    (requires `advanced_analytics` entitlement; silently degraded
   *                    to null for lower plans).
   */
  async getStats(sparklines = false): Promise<DashboardStats> {
    const data = await this.client._request("GET", "/api/dashboard/stats", {
      params: sparklines ? { sparklines: true } : undefined,
    });
    return parseDashboardStats(data as Record<string, unknown>);
  }
}
