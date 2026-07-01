// runner UI 用の実行ハンドラ。RunnerView が useSessionRunner から実配線し、
// VRT stories では no-op を渡すことで db/api なしに描画できる。
export interface RunHandlers {
  onRun: (stepId: string, options?: { branchChoice?: string }) => void;
  onSkip: (stepId: string) => void;
}
