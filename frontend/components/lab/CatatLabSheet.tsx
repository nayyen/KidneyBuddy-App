"use client";

/**
 * CatatLabSheet.tsx — Two-tab bottom sheet for lab result entry
 *
 * Tab 1: "Input Manual" — form to type lab parameter values
 * Tab 2: "Upload File" — upload PDF/JPG/PNG of lab document
 *
 * Pattern: follows CatatCairanSheet.tsx with added tabs.
 */

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import InputManualForm, { type CreatedLabEntry } from "./InputManualForm";
import UploadFileForm from "./UploadFileForm";

type TabId = "manual" | "upload";

interface CatatLabSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string | null;
  // `created` is only populated for the manual-entry tab (AI-03/D-14 lab
  // analysis is only triggered by labResult.service.ts::createEntry, not
  // the upload flow) — undefined otherwise.
  onSaved?: (created?: CreatedLabEntry) => void;
}

export default function CatatLabSheet({
  isOpen,
  onOpenChange,
  accessToken,
  onSaved,
}: CatatLabSheetProps) {
  const [activeTab, setActiveTab] = useState<TabId>("manual");

  if (!accessToken) return null;

  const handleSaved = (created?: CreatedLabEntry) => {
    onOpenChange(false);
    onSaved?.(created);
  };

  const tabStyle = (tab: TabId): React.CSSProperties => {
    const isActive = activeTab === tab;
    return {
      flex: 1,
      height: 36,
      borderRadius: 18,
      fontSize: 12,
      fontWeight: 600,
      border: "none",
      cursor: "pointer",
      backgroundColor: isActive ? "#2a9d8f" : "#f0faf9",
      color: isActive ? "#ffffff" : "#1a2e2c",
      fontFamily: "var(--font-sans, ui-sans-serif, system-ui)",
    };
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] rounded-t-2xl sm:max-w-md sm:rounded-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[85dvh]"
      >
        <SheetHeader className="pb-2 sm:px-6 sm:pt-5 sm:pb-3 shrink-0">
          <SheetTitle className="font-heading text-base font-bold text-foreground text-left">
            Catat Hasil Lab
          </SheetTitle>
        </SheetHeader>

        {/* Tab pills */}
        <div className="flex gap-2 px-4 pb-3">
          <button
            onClick={() => setActiveTab("manual")}
            style={tabStyle("manual")}
          >
            Input Manual
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            style={tabStyle("upload")}
          >
            Upload File
          </button>
        </div>

        {/* Tab content */}
        <div className="pl-4 pb-4 pr-2 sm:pl-6 sm:pb-6 sm:pr-4 overflow-y-auto flex-1 min-h-0">
          {activeTab === "manual" && (
            <InputManualForm
              accessToken={accessToken}
              onSuccess={handleSaved}
            />
          )}
          {activeTab === "upload" && (
            <UploadFileForm
              accessToken={accessToken}
              onSuccess={handleSaved}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
