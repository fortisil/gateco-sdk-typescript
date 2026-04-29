/**
 * Onboarding resource -- status and dismiss.
 */

import type { GatecoClient } from "../client.js";
import type { OnboardingStatus } from "../types/onboarding.js";

/** Namespace for onboarding endpoints. Accessed as `client.onboarding`. */
export class OnboardingResource {
  constructor(private readonly client: GatecoClient) {}

  /**
   * Fetch the current onboarding status for the authenticated organization.
   *
   * The status is computed on-the-fly from existing data -- no persistent
   * step table. Returns 6 steps with status, evidence_count, and CTAs.
   */
  async status(): Promise<OnboardingStatus> {
    const data = await this.client._request("GET", "/api/onboarding/status");
    const raw = (data as Record<string, unknown>) ?? {};
    const inner = (raw["data"] as Record<string, unknown>) ?? raw;
    return {
      completed_count: (inner["completed_count"] as number) ?? 0,
      total_count: (inner["total_count"] as number) ?? 0,
      dismissed: (raw["dismissed"] as boolean) ?? (inner["dismissed"] as boolean) ?? false,
      steps: Array.isArray(inner["steps"])
        ? (inner["steps"] as Record<string, unknown>[]).map((s) => ({
            step_id: s["id"] as string ?? s["step_id"] as string,
            status: s["status"] as "not_started" | "in_progress" | "completed",
            evidence_count: s["evidence_count"] as number | undefined,
            blocking_reason: s["blocking_reason"] as string | undefined,
            cta_target: s["cta_target"] as string | undefined,
          }))
        : [],
    };
  }

  /**
   * Dismiss the onboarding checklist for the authenticated organization.
   *
   * Persists `onboarding_dismissed_at` on the org model. Idempotent.
   */
  async dismiss(): Promise<void> {
    await this.client._request("POST", "/api/onboarding/dismiss");
  }
}
