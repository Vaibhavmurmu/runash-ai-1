"use client";

import React from "react";
import { ArrowRight, Check, Copy, Sparkles, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type OnboardingSlideView = {
  title: string;
  description: string;
  media: { label: string; value: string };
};

type FeedbackRatingOption = {
  value: number;
  label: string;
  iconLabel: string;
};

type UpgradePlanView = {
  id: string;
  label: string;
  price: string;
  billingPeriod?: string;
  description: string;
  features: string[];
  ctaLabel: string;
};

type ReferralUiDataView = {
  headline: string;
  referralLink: string;
  progressValue: number;
  rewardCap: number;
  steps: string[];
};

type CreditSummaryRowView = {
  key: string;
  label: string;
};

type CreditMetricsView = Record<string, number>;

export function OnboardingDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogClassName: string;
  onCloseAutoFocus: (event: Event) => void;
  currentSlide: OnboardingSlideView;
  stepIndex: number;
  steps: OnboardingSlideView[];
  onStepSelect: (index: number) => void;
  onNext: () => void;
  isLastStep: boolean;
}) {
  const {
    open,
    onOpenChange,
    dialogClassName,
    onCloseAutoFocus,
    currentSlide,
    stepIndex,
    steps,
    onStepSelect,
    onNext,
    isLastStep,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent
        className={dialogClassName}
        aria-label="RunAsh chat updates"
        onEscapeKeyDown={() => onOpenChange(false)}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          onClick={() => onOpenChange(false)}
          aria-label="Close updates dialog"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="max-h-[min(88vh,42rem)] overflow-y-auto rounded-lg">
          <div className="h-44 bg-gradient-to-br from-cyan-500/30 via-blue-500/20 to-zinc-900 p-4 sm:p-6">
            <div
              className="flex h-full items-center justify-center rounded-lg border border-white/10 bg-black/20 text-6xl transition-transform duration-300 motion-reduce:transition-none"
              key={currentSlide.title}
            >
              <span role="img" aria-label={currentSlide.media.label}>
                {currentSlide.media.value}
              </span>
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <DialogHeader className="space-y-2 text-left">
              <p className="text-xs font-medium uppercase tracking-wide text-cyan-300">
                Step {stepIndex + 1} of {steps.length}
              </p>
              <DialogTitle>{currentSlide.title}</DialogTitle>
              <DialogDescription className="text-zinc-300">
                {currentSlide.description}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between gap-3">
              <div
                className="flex items-center gap-2"
                aria-label="Onboarding progress"
                role="group"
              >
                {steps.map((slide, index) => (
                  <button
                    key={slide.title}
                    type="button"
                    onClick={() => onStepSelect(index)}
                    className={`h-2.5 w-2.5 rounded-full transition-colors duration-200 motion-reduce:transition-none ${
                      index === stepIndex
                        ? "bg-cyan-400"
                        : "bg-zinc-600 hover:bg-zinc-500"
                    }`}
                    aria-label={`Go to onboarding step ${index + 1}`}
                    aria-current={index === stepIndex ? "step" : undefined}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-zinc-300 hover:bg-zinc-900"
                  onClick={() => onOpenChange(false)}
                >
                  Dismiss
                </Button>
                <Button
                  className="bg-cyan-600 text-white hover:bg-cyan-500"
                  onClick={onNext}
                >
                  {isLastStep ? "Get started" : "Next"}
                  {!isLastStep ? <ArrowRight className="ml-1 h-4 w-4" /> : null}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FeedbackDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogClassName: string;
  onCloseAutoFocus: (event: Event) => void;
  isSubmitting: boolean;
  feedbackText: string;
  feedbackRating: number | null;
  feedbackRatingOptions: FeedbackRatingOption[];
  onFeedbackTextChange: (value: string) => void;
  onFeedbackRatingChange: (value: number) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const {
    open,
    onOpenChange,
    dialogClassName,
    onCloseAutoFocus,
    isSubmitting,
    feedbackText,
    feedbackRating,
    feedbackRatingOptions,
    onFeedbackTextChange,
    onFeedbackRatingChange,
    onSubmit,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClassName} onCloseAutoFocus={onCloseAutoFocus}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 h-8 w-8 rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          onClick={() => onOpenChange(false)}
          aria-label="Close feedback dialog"
          disabled={isSubmitting}
        >
          <X className="h-4 w-4" />
        </Button>

        <DialogHeader className="space-y-2 text-left">
          <DialogTitle>Give feedback</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Tell us what worked well and what we can improve in your RunAsh Chat
            experience.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" aria-label="Feedback form">
          <div className="space-y-2">
            <label htmlFor="feedback-text" className="text-sm font-medium text-zinc-200">
              Your feedback
            </label>
            <Textarea
              id="feedback-text"
              value={feedbackText}
              onChange={(event) => onFeedbackTextChange(event.target.value)}
              placeholder="Share your feedback"
              rows={5}
              className="border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
              disabled={isSubmitting}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  (event.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-200">How would you rate this experience?</p>
            <div className="flex flex-wrap gap-2">
              {feedbackRatingOptions.map((option) => {
                const isSelected = feedbackRating === option.value;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    className={`h-9 gap-1.5 ${
                      isSelected
                        ? "bg-cyan-600 text-zinc-950 hover:bg-cyan-500"
                        : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                    }`}
                    onClick={() => onFeedbackRatingChange(option.value)}
                    disabled={isSubmitting}
                    aria-label={option.iconLabel}
                  >
                    <Star className="h-3.5 w-3.5" />
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-cyan-600 text-zinc-950 hover:bg-cyan-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReferDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogClassName: string;
  onCloseAutoFocus: (event: Event) => void;
  referralUiData: ReferralUiDataView;
  referralProgressPercent: number;
  isReferralLoading: boolean;
  referralLoadError: string | null;
  isCopyingLink: boolean;
  onCopyLink: () => void;
  onRunNumbers: () => void;
}) {
  const {
    open,
    onOpenChange,
    dialogClassName,
    onCloseAutoFocus,
    referralUiData,
    referralProgressPercent,
    isReferralLoading,
    referralLoadError,
    isCopyingLink,
    onCopyLink,
    onRunNumbers,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClassName} onCloseAutoFocus={onCloseAutoFocus}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 h-8 w-8 rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          onClick={() => onOpenChange(false)}
          aria-label="Close refer dialog"
        >
          <X className="h-4 w-4" />
        </Button>

        <DialogHeader className="space-y-2 border-b border-zinc-800/80 px-6 pb-4 pt-6 text-left">
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Sparkles className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            {referralUiData.headline}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Share your referral link and unlock monthly credits for every verified
            signup.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-0 overflow-y-auto px-6 py-4">
          <section className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-zinc-400">
              <span>Monthly progress</span>
              <span>
                {referralUiData.progressValue} / {referralUiData.rewardCap} invites
              </span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full border border-zinc-700/70 bg-zinc-900"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={referralUiData.rewardCap}
              aria-valuenow={referralUiData.progressValue}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-400"
                style={{ width: `${referralProgressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] uppercase tracking-wide text-zinc-500">
              <span>Start · 0 invites</span>
              <span>Goal · {referralUiData.rewardCap} invites</span>
            </div>
          </section>

          <section className="space-y-3 border-t border-zinc-800/80 py-4">
            <p className="text-sm font-medium text-zinc-200">Referral link</p>
            {isReferralLoading ? (
              <p className="text-xs text-zinc-500">Refreshing referral link…</p>
            ) : null}
            {referralLoadError ? (
              <p className="text-xs text-amber-300">{referralLoadError}</p>
            ) : null}
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-2">
              <code className="flex-1 truncate rounded bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
                {referralUiData.referralLink}
              </code>
              <Button
                type="button"
                className="h-10 px-4"
                onClick={onCopyLink}
                disabled={isCopyingLink || isReferralLoading}
              >
                {isCopyingLink ? (
                  <>
                    <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </section>

          <section className="space-y-2 border-t border-zinc-800/80 py-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-sm font-medium text-zinc-200">How it works</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-400">
                {referralUiData.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2 border-t border-zinc-800/80 px-6 py-4 sm:justify-between">
          <Button type="button" variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button type="button" className="h-10 px-4" onClick={onRunNumbers}>
            Run the numbers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UpgradeDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogClassName: string;
  onCloseAutoFocus: (event: Event) => void;
  plans: UpgradePlanView[];
  selectedPlanId: string;
  onSelectPlan: (planId: string) => void;
  selectedUpgradePlan: UpgradePlanView;
  formatPlanPriceLabel: (plan: UpgradePlanView) => string;
  isPlanActionLoading: boolean;
  onPlanCtaClick: () => void;
  onViewPricing: () => void;
}) {
  const {
    open,
    onOpenChange,
    dialogClassName,
    onCloseAutoFocus,
    plans,
    selectedPlanId,
    onSelectPlan,
    selectedUpgradePlan,
    formatPlanPriceLabel,
    isPlanActionLoading,
    onPlanCtaClick,
    onViewPricing,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClassName} onCloseAutoFocus={onCloseAutoFocus}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 h-8 w-8 rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          onClick={() => onOpenChange(false)}
          aria-label="Close upgrade dialog"
        >
          <X className="h-4 w-4" />
        </Button>

        <DialogHeader className="space-y-2 text-left">
          <DialogTitle>Explore More Plans</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Pick a plan to preview pricing and key benefits for your current stage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1 sm:grid-cols-5"
            role="tablist"
            aria-label="Select plan tier"
          >
            {plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              return (
                <Button
                  key={plan.id}
                  type="button"
                  variant={isSelected ? "default" : "ghost"}
                  className={`h-9 px-2 text-xs sm:text-sm ${
                    isSelected
                      ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                      : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                  }`}
                  onClick={() => onSelectPlan(plan.id)}
                  role="tab"
                  aria-selected={isSelected}
                >
                  {plan.label}
                </Button>
              );
            })}
          </div>

          <Card className="border-zinc-800 bg-zinc-900/60 p-5">
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">
                  {selectedUpgradePlan.label} plan
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-100">
                  {formatPlanPriceLabel(selectedUpgradePlan)}
                </p>
              </div>
              <p className="text-sm text-zinc-300">{selectedUpgradePlan.description}</p>
              <ul className="space-y-2">
                {selectedUpgradePlan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-zinc-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={onPlanCtaClick}
                disabled={isPlanActionLoading}
              >
                {isPlanActionLoading ? "Opening…" : selectedUpgradePlan.ctaLabel}
              </Button>
            </div>
          </Card>
        </div>

        <DialogFooter className="sm:justify-between">
          <button
            type="button"
            className="text-sm text-cyan-300 underline-offset-4 hover:underline"
            onClick={onViewPricing}
          >
            See full plan comparison on pricing page
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RedeemCodeDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogClassName: string;
  onCloseAutoFocus: (event: Event) => void;
  inputId: string;
  redeemCodeInput: string;
  redeemCodeError: string | null;
  isRedeemingCode: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const {
    open,
    onOpenChange,
    dialogClassName,
    onCloseAutoFocus,
    inputId,
    redeemCodeInput,
    redeemCodeError,
    isRedeemingCode,
    onInputChange,
    onSubmit,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClassName} onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle>Redeem Credit Code</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Enter your code to apply credits in billing.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <label
              htmlFor={inputId}
              className="text-xs font-medium uppercase tracking-wide text-zinc-300"
            >
              Code
            </label>
            <Input
              id={inputId}
              value={redeemCodeInput}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder="RUNASH-2026"
              autoComplete="off"
              maxLength={32}
              className="border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
            />
            {redeemCodeError ? <p className="text-xs text-rose-300">{redeemCodeError}</p> : null}
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isRedeemingCode}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-cyan-600 text-zinc-950 hover:bg-cyan-500"
              disabled={isRedeemingCode}
            >
              {isRedeemingCode ? "Redeeming..." : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreditsBalanceControl(props: {
  isCreditsOpen: boolean;
  creditsBalanceLabel: string;
  creditsPanelId: string;
  popoverOverlayClassName: string;
  isCreditsLoading: boolean;
  creditsLoadError: string | null;
  creditSummaryRows: CreditSummaryRowView[];
  creditMetrics: CreditMetricsView;
  formatCreditValue: (value?: number | null) => string;
  onToggle: (trigger: HTMLButtonElement) => void;
  onClose: (restoreFocus: boolean) => void;
  onOpenRedeem: (trigger: HTMLButtonElement) => void;
  onBuyCredits: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  panelRef: React.RefObject<HTMLDivElement | null>;
}) {
  const {
    isCreditsOpen,
    creditsBalanceLabel,
    creditsPanelId,
    popoverOverlayClassName,
    isCreditsLoading,
    creditsLoadError,
    creditSummaryRows,
    creditMetrics,
    formatCreditValue,
    onToggle,
    onClose,
    onOpenRedeem,
    onBuyCredits,
    triggerRef,
    panelRef,
  } = props;

  return (
    <div className="relative hidden md:block">
      {isCreditsOpen && (
        <button
          type="button"
          aria-label="Close credit balance panel"
          className="fixed inset-0 z-40 hidden bg-black/40 md:block"
          onClick={() => onClose(true)}
        />
      )}

      <Button
        ref={triggerRef}
        type="button"
        size="sm"
        variant="outline"
        className="h-8 rounded-full border-zinc-700 bg-zinc-950 px-2.5 text-xs font-medium text-zinc-100 hover:bg-zinc-900"
        onClick={(event) => onToggle(event.currentTarget)}
        aria-label="View credit balance details"
        aria-expanded={isCreditsOpen}
        aria-controls={creditsPanelId}
      >
        <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
        <span>{creditsBalanceLabel}</span>
      </Button>

      {isCreditsOpen && (
        <div
          ref={panelRef}
          id={creditsPanelId}
          role="dialog"
          aria-label="Credit balance"
          className={`${popoverOverlayClassName} absolute right-0 top-full mt-2.5 w-72 rounded-xl border border-zinc-800 bg-zinc-950/95 p-3 text-sm text-zinc-100 shadow-2xl shadow-black/40 backdrop-blur`}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Credit Balance
            </p>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              onClick={() => onClose(true)}
              aria-label="Close credit balance panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {isCreditsLoading ? <p className="mb-2 text-xs text-zinc-500">Refreshing credits…</p> : null}
          {creditsLoadError ? <p className="mb-2 text-xs text-amber-300">{creditsLoadError}</p> : null}
          <div className="space-y-1.5">
            {creditSummaryRows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between rounded-md bg-zinc-900/80 px-2 py-1.5"
              >
                <span className="text-zinc-300">{row.label}</span>
                <span className="font-medium text-zinc-100">
                  {formatCreditValue(creditMetrics[row.key])}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
              onClick={(event) => onOpenRedeem(event.currentTarget)}
            >
              Redeem Code
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 bg-cyan-600 text-zinc-950 hover:bg-cyan-500"
              onClick={onBuyCredits}
            >
              Buy Credits
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
