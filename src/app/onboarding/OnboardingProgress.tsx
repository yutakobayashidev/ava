import { Check } from "lucide-react";

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
  const progressPercent = (currentStep / STEPS.length) * 100;

  return (
    <div className="bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="container mx-auto px-4 py-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <span className="uppercase tracking-[0.18em] text-[11px] font-semibold text-slate-500">
                Onboarding
              </span>
              <span className="text-sm text-slate-500">Step {currentStep} / 3</span>
            </div>
            <span className="text-xs text-slate-500">
              進捗をクリアに、セットアップをスムーズに。
            </span>
          </div>

          <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {STEPS.map((step) => {
              const status =
                step.id < currentStep ? "done" : step.id === currentStep ? "current" : "upcoming";

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                    status === "current"
                      ? "border-blue-200 bg-blue-50 shadow-sm"
                      : status === "done"
                        ? "border-green-200 bg-green-50"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                      status === "done"
                        ? "bg-green-600 text-white"
                        : status === "current"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {status === "done" ? <Check className="h-4 w-4" /> : step.id}
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`text-sm font-semibold ${
                        status === "current"
                          ? "text-blue-900"
                          : status === "done"
                            ? "text-green-900"
                            : "text-slate-800"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-xs text-slate-500">{step.caption}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
