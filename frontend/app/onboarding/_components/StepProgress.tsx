"use client";

interface StepProgressProps {
  currentStep: number; // 1, 2, or 3
  totalSteps?: number;
}

export default function StepProgress({ currentStep, totalSteps = 3 }: StepProgressProps) {
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center flex-1">
            {/* Step circle */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold font-heading transition-colors ${
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
            {/* Connector line */}
            {step < totalSteps && (
              <div
                className={`flex-1 h-0.5 mx-2 rounded-full ${
                  step < currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      {/* Step labels */}
      <div className="flex justify-between px-1">
        <span className="text-xs font-sans text-muted-foreground">
          {currentStep === 1 ? "Pilih Terapi" : "Selesai"}
        </span>
        <span className="text-xs font-sans text-muted-foreground">
          {currentStep === 2 ? "Pengingat Pertama" : currentStep < 2 ? "Langkah 2" : "Selesai"}
        </span>
        <span className="text-xs font-sans text-muted-foreground">
          {currentStep === 3 ? "Selesai" : "Langkah 3"}
        </span>
      </div>
    </div>
  );
}
