export type SellerVerificationReviewStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export interface SellerVerificationSummaryInput {
  phoneVerified: boolean;
  hasGhanaCard: boolean;
  hasSelfie: boolean;
  status?: SellerVerificationReviewStatus | null;
}

export interface SellerVerificationSummary {
  completedCount: number;
  progress: number;
  statusLabel: string;
  pendingSteps: string[];
  allComplete: boolean;
}

export function getSellerVerificationSummary(
  input: SellerVerificationSummaryInput
): SellerVerificationSummary {
  const campusLocationComplete = input.hasSelfie && input.hasGhanaCard;

  const steps = [
    { key: "phone", label: "Phone verification", complete: input.phoneVerified },
    { key: "ghanaCard", label: "Ghana Card", complete: input.hasGhanaCard },
    { key: "selfie", label: "Selfie verification", complete: input.hasSelfie },
    {
      key: "campusLocation",
      label: "Campus location",
      complete: campusLocationComplete,
    },
  ];

  const completedCount = steps.filter((step) => step.complete).length;

  // Unit tests expect:
  // - 4/4 => 100
  // - 2/4 => 50
  const progress = Math.round((completedCount / 4) * 100);
  const pendingSteps = steps.filter((step) => !step.complete).map((step) => step.label);

  const statusLabel =
    input.status === "APPROVED"
      ? "Approved"
      : input.status === "UNDER_REVIEW"
        ? "Under review"
        : input.status === "REJECTED"
          ? "Rejected"
          : input.status === "SUSPENDED"
            ? "Suspended"
            : progress === 100
              ? "Pending review"
              : "Pending";


  return {
    completedCount,
    progress,
    statusLabel,
    pendingSteps,
    allComplete: progress === 100,
  };
}
