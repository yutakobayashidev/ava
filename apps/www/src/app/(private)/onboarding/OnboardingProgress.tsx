type OnboardingStep = {
  id: 1 | 2 | 3;
  label: string;
  caption: string;
};

const STEPS: OnboardingStep[] = [
  { id: 1, label: "Slack連携", caption: "通知先を設定" },
  { id: 2, label: "MCP接続", caption: "ローカルを接続" },
  { id: 3, label: "完了", caption: "利用開始" },
];

type OnboardingProgressProps = {
  currentStep: OnboardingStep["id"];
};

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  const currentStepInfo = STEPS.find((step) => step.id === currentStep);

  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium">
              {currentStepInfo?.label}
            </span>
            <span className="text-sm text-muted-foreground">
              {currentStep} / {STEPS.length}
            </span>
          </div>
          <div className="flex flex-1 max-w-md items-center gap-1">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  step.id <= currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
