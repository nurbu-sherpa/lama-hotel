"use client";

import { createContext, startTransition, useCallback, useActionState, useContext, useRef, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { ActionState } from "@/server/actions/admin/types";
import { useToast } from "./ToastProvider";
import { cn } from "@/lib/utils/format";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

const FormErrorsContext = createContext<ActionState["errors"]>(undefined);
const PendingContext = createContext(false);

/** Field errors from the nearest AdminForm. */
export function useFieldErrors() {
  return useContext(FormErrorsContext) ?? {};
}

/**
 * Standard admin form: Server Action + pending state + toast notification (via ToastProvider) + field errors.
 * `resetOnSuccess` clears the form (e.g. "add new" forms).
 * `closeOnSuccess` collapses the surrounding <details> after a successful save (inline edit panels).
 */
export function AdminForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  closeOnSuccess = false,
  onSuccess,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  closeOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const showToast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  // Side effects run inside the action (not an effect) so they still happen if this form
  // unmounts when the page refreshes — e.g. the row containing it was just deleted.
  const actionWithFeedback = useCallback(
    async (prev: ActionState, fd: FormData) => {
      const result = await action(prev, fd);
      if (result.message) showToast?.({ ok: result.ok, message: result.message });
      if (result.ok) {
        if (resetOnSuccess) formRef.current?.reset();
        if (closeOnSuccess) {
          // Reset drops the just-uploaded file (so reopening won't upload it again); fields then show
          // the saved values, since React refreshes their defaults from the server.
          formRef.current?.reset();
          formRef.current?.closest("details")?.removeAttribute("open");
        }
        onSuccess?.();
      }
      return result;
    },
    [action, showToast, resetOnSuccess, closeOnSuccess, onSuccess],
  );
  const [state, formAction, pending] = useActionState(actionWithFeedback, { ok: false, message: "" });

  return (
    <FormErrorsContext.Provider value={state.ok ? undefined : state.errors}>
      {/* Manual submit (instead of the action prop) so React does not reset the form and wipe unsaved edits on a validation error. */}
      <form
        ref={formRef}
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          const submitter = (e.nativeEvent as SubmitEvent).submitter;
          const fd = new FormData(e.currentTarget, submitter);
          startTransition(() => formAction(fd));
        }}
      >
        <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
      </form>
    </FormErrorsContext.Provider>
  );
}

export function SubmitButton({ children = "Save changes", className, variant = "primary" }: { children?: ReactNode; className?: string; variant?: "primary" | "danger" | "outline" }) {
  const pending = useContext(PendingContext);
  const styles = { primary: "btn-dark", danger: "btn-danger", outline: "btn-outline" };
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(styles[variant], "btn-sm", className)}
    >
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
