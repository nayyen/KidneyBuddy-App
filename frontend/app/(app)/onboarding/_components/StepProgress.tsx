"use client";

interface StepProgressProps {
  currentStep: number; // 1, 2, or 3
  totalSteps?: number;
}

const STEP_LABELS: Record<number, string> = {
  1: "Pilih Terapi",
  2: "Pengingat Pertama",
  3: "Selesai",
};

export default function StepProgress({ currentStep, totalSteps = 3 }: StepProgressProps) {
  return (
    <div className="w-full space-y-2">
      <div className="flex items-start">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="relative flex flex-1 flex-col items-center">
            {/* Connector line (drawn behind the circle, spanning to the next column) */}
            {step < totalSteps && (
              <div
                className={`absolute top-4 left-1/2 h-0.5 w-full rounded-full ${
                  step < currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
            {/* Step circle */}
            <div
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold font-heading transition-colors ${
                step < currentStep
                  ? "bg-primary text-primary-foreground"
                  : step === currentStep
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step < currentStep ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step
              )}
            </div>
            {/* Step label */}
            <span className="mt-2 text-center text-xs font-sans text-muted-foreground">
              {STEP_LABELS[step] ?? `Langkah ${step}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
