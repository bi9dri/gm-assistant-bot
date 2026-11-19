export interface RunHandlers {
  onRun: (stepId: string, options?: { branchChoice?: string }) => void;
  onSkip: (stepId: string) => void;
}
