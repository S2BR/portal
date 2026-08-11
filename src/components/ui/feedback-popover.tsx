"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FeedbackState = "idle" | "loading" | "success";

export type FeedbackPopoverProps = Omit<
  React.ComponentPropsWithoutRef<"div">,
  "children" | "onSubmit"
> & {
  open?: boolean;
  defaultOpen?: boolean;
  /** Seeds the textarea each time the popover opens (e.g. the value already captured on a prior open). */
  defaultValue?: string;
  onOpenChange?: (open: boolean) => void;
  onSubmit?: (feedback: string) => void | Promise<void>;
  /** When set and there's an existing value, a "clear" link shows next to submit. */
  onClear?: () => void;
  clearLabel?: React.ReactNode;
  triggerLabel?: React.ReactNode;
  /** A small node rendered after the trigger label (e.g. a dot marking that a value is present). */
  indicator?: React.ReactNode;
  textareaLabel?: string;
  /** The descriptive placeholder shown inside the open popover (wraps, fades once the user types). */
  prompt?: string;
  placeholder?: string;
  submitLabel?: React.ReactNode;
  successTitle?: React.ReactNode;
  successDescription?: React.ReactNode;
  loadingAnnouncement?: string;
  loadingDuration?: number;
  successDuration?: number;
};

function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70",
        className,
      )}
    />
  );
}

function wait(duration: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

/**
 * A trigger button that morphs (via a shared `layoutId`) into a small popover holding a single
 * textarea and a submit button, then plays a loading → success flow. Adapted from ericts.com's
 * feedback-popover. `onSubmit` receives the trimmed text; the loading/success timing is cosmetic, so
 * a synchronous handler (e.g. stashing the value into a parent form) still gets the full animation.
 */
export function FeedbackPopover({
  open,
  defaultOpen = false,
  defaultValue = "",
  onOpenChange,
  onSubmit,
  onClear,
  clearLabel = "Remove",
  triggerLabel = "Feedback",
  indicator,
  textareaLabel = "Feedback",
  prompt,
  placeholder = "Feedback",
  submitLabel = "Send feedback",
  successTitle = "Feedback received!",
  successDescription = "Thanks for helping us improve.",
  loadingAnnouncement = "Sending feedback",
  loadingDuration = 1500,
  successDuration = 1800,
  className,
  ...props
}: FeedbackPopoverProps) {
  const reactId = React.useId();
  const titleId = `${reactId}-title`;
  const descriptionId = `${reactId}-description`;
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const timers = React.useRef<number[]>([]);
  const isMountedRef = React.useRef(true);
  const shouldReduceMotion = useReducedMotion();
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const [feedback, setFeedback] = React.useState(defaultValue);
  const [formState, setFormState] = React.useState<FeedbackState>("idle");
  const isOpen = isControlled ? open : uncontrolledOpen;
  const trimmedFeedback = feedback.trim();

  const clearTimers = React.useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  }, []);

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const closePopover = React.useCallback(() => {
    clearTimers();
    setOpen(false);
  }, [clearTimers, setOpen]);

  const openPopover = React.useCallback(() => {
    clearTimers();
    setFormState("idle");
    setFeedback(defaultValue);
    setOpen(true);
  }, [clearTimers, defaultValue, setOpen]);

  const submitFeedback = React.useCallback(async () => {
    if (!trimmedFeedback || formState !== "idle") return;

    clearTimers();
    setFormState("loading");

    try {
      await Promise.all([onSubmit?.(trimmedFeedback), wait(loadingDuration)]);
    } catch {
      if (!isMountedRef.current) return;
      setFormState("idle");
      return;
    }

    if (!isMountedRef.current) return;

    setFormState("success");
    timers.current = [
      window.setTimeout(() => {
        setOpen(false);
      }, successDuration),
    ];
  }, [
    clearTimers,
    formState,
    loadingDuration,
    onSubmit,
    setOpen,
    successDuration,
    trimmedFeedback,
  ]);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  // On open with a pre-filled value, drop the caret at the END of the text (not the start) so the
  // user can keep typing where they left off.
  React.useEffect(() => {
    if (!isOpen || formState !== "idle") return;
    const el = textareaRef.current;
    if (!el) return;
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [isOpen, formState]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const popover = popoverRef.current;

      if (!popover || popover.contains(event.target as Node)) return;

      closePopover();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [closePopover, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePopover();
        return;
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "Enter" &&
        formState === "idle"
      ) {
        event.preventDefault();
        void submitFeedback();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closePopover, formState, isOpen, submitFeedback]);

  const layoutTransition = shouldReduceMotion ? { duration: 0 } : undefined;
  const contentTransition = shouldReduceMotion
    ? { duration: 0 }
    : ({ type: "spring", duration: 0.4, bounce: 0 } as const);
  const submitTransition = shouldReduceMotion
    ? { duration: 0 }
    : ({ type: "spring", duration: 0.3, bounce: 0 } as const);

  return (
    <div
      data-slot="feedback-popover"
      className={cn(
        "relative inline-flex max-w-full [--feedback-popover-width:min(22rem,calc(100vw-2rem))]",
        className,
      )}
      {...props}
    >
      {/* A soft scrim behind the open popover: blurs the page so the box reads as the focused
          context. Sits under the popover (z-50) and closes it on click, like a modal backdrop. */}
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            key="scrim"
            aria-hidden
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onPointerDown={closePopover}
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[3px]"
          />
        ) : null}
      </AnimatePresence>

      <LayoutGroup id={reactId}>
        <motion.button
          type="button"
          layoutId="feedback-popover-wrapper"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? reactId : undefined}
          onClick={openPopover}
          transition={layoutTransition}
          style={{ borderRadius: 8 }}
          className={cn(
            buttonVariants({ variant: "outline", size: "default" }),
            "relative overflow-hidden transition-colors",
          )}
        >
          <motion.span
            layoutId="feedback-popover-title"
            transition={layoutTransition}
            className="leading-6"
          >
            {triggerLabel}
          </motion.span>
          {indicator}
        </motion.button>

        <AnimatePresence>
          {isOpen ? (
            <motion.div
              key="popover"
              id={reactId}
              ref={popoverRef}
              layoutId="feedback-popover-wrapper"
              role="dialog"
              aria-labelledby={titleId}
              aria-describedby={
                formState === "success" ? descriptionId : undefined
              }
              transition={layoutTransition}
              style={{ borderRadius: 12 }}
              className="bg-background text-foreground absolute top-1/2 left-1/2 z-50 h-48 w-(--feedback-popover-width) -translate-x-1/2 -translate-y-1/2 overflow-hidden border shadow-sm"
            >
              <motion.span
                id={titleId}
                layoutId="feedback-popover-title"
                transition={layoutTransition}
                data-state={formState}
                data-has-feedback={feedback ? "true" : "false"}
                className="text-muted-foreground pointer-events-none absolute top-3 right-3 left-3 text-sm leading-5 data-[has-feedback=true]:opacity-0! data-[state=success]:opacity-0!"
              >
                {prompt ?? textareaLabel}
              </motion.span>

              <AnimatePresence mode="popLayout" initial={false}>
                {formState === "success" ? (
                  <motion.div
                    key="success"
                    initial={
                      shouldReduceMotion
                        ? false
                        : { opacity: 0, y: -32, filter: "blur(4px)" }
                    }
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={
                      shouldReduceMotion
                        ? undefined
                        : { opacity: 0, y: 8, filter: "blur(4px)" }
                    }
                    transition={contentTransition}
                    className="flex h-full flex-col items-center justify-center gap-3 px-8 py-8 text-center"
                  >
                    <span
                      aria-hidden="true"
                      className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full"
                    >
                      <CheckCircle2 className="size-6" />
                    </span>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-base font-semibold">{successTitle}</h3>
                      <p
                        id={descriptionId}
                        className="text-muted-foreground text-sm leading-5"
                      >
                        {successDescription}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  // A div, not a <form>: this popover is often rendered inside another form (e.g. the
                  // business edit form), and a nested <form> is invalid HTML — the browser drops it and
                  // the submit button would submit the OUTER form. Submit is wired to the button's click
                  // and the Ctrl/Cmd+Enter handler instead.
                  <motion.div
                    key="form"
                    exit={
                      shouldReduceMotion
                        ? undefined
                        : { opacity: 0, y: 8, filter: "blur(4px)" }
                    }
                    transition={contentTransition}
                    className="flex h-full flex-col"
                  >
                    <label htmlFor={`${reactId}-textarea`} className="sr-only">
                      {textareaLabel}
                    </label>
                    <textarea
                      ref={textareaRef}
                      id={`${reactId}-textarea`}
                      autoFocus
                      required
                      value={feedback}
                      placeholder={placeholder}
                      disabled={formState === "loading"}
                      onChange={(event) => setFeedback(event.target.value)}
                      className="min-h-0 flex-1 resize-none bg-transparent px-3 pt-3 pb-3 text-sm leading-6 outline-none placeholder:text-transparent focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <div
                      className={cn(
                        "bg-muted/30 relative flex items-center border-t border-dashed px-3 py-2.5",
                        onClear && defaultValue.trim()
                          ? "justify-between"
                          : "justify-end",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="bg-background absolute top-1/2 -left-px size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border"
                      />
                      <span
                        aria-hidden="true"
                        className="bg-background absolute top-1/2 -right-px size-3 -translate-y-1/2 translate-x-1/2 rounded-full border"
                      />
                      {onClear && defaultValue.trim() ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={formState === "loading"}
                          onClick={() => {
                            onClear();
                            closePopover();
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {clearLabel}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void submitFeedback()}
                        disabled={!trimmedFeedback || formState === "loading"}
                        className="min-w-32 overflow-hidden"
                      >
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={formState}
                            initial={
                              shouldReduceMotion ? false : { opacity: 0, y: -25 }
                            }
                            animate={{ opacity: 1, y: 0 }}
                            exit={
                              shouldReduceMotion ? undefined : { opacity: 0, y: 25 }
                            }
                            transition={submitTransition}
                            className="inline-flex items-center justify-center gap-1.5"
                          >
                            {formState === "loading" ? (
                              <>
                                <Spinner />
                                <span className="sr-only">
                                  {loadingAnnouncement}
                                </span>
                              </>
                            ) : (
                              <span>{submitLabel}</span>
                            )}
                          </motion.span>
                        </AnimatePresence>
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}
