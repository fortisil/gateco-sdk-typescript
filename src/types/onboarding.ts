/**
 * Types for onboarding endpoints.
 */

/** A single step in the onboarding wizard. */
export interface OnboardingStep {
  step_id: string;
  status: "not_started" | "in_progress" | "completed";
  evidence_count?: number;
  blocking_reason?: string;
  cta_target?: string;
}

/** Full onboarding status returned by GET /api/onboarding/status. */
export interface OnboardingStatus {
  completed_count: number;
  total_count: number;
  dismissed: boolean;
  steps: OnboardingStep[];
}
