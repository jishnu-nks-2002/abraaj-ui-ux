import { useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { LogOut, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";
import logo from "@/assets/logo-2.png";
import { formatPrice } from "@/lib/cart";
import type { SessionStatus } from "@/lib/auth";
import { SocialLinks } from "@/components/abraaj/SocialLinks";

/* ------------------------------------------------------------------ */
/* Confirm dialog shell                                                 */
/* ------------------------------------------------------------------ */

function ConfirmDialog({
  open,
  onOpenChange,
  Icon,
  danger,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  Icon: typeof LogOut;
  danger?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="animate-fade fixed inset-0 z-50 bg-foreground/45" />
        <AlertDialog.Content className="animate-rise fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-background p-5 shadow-[0_24px_60px_-20px_rgba(4,20,60,0.55)] focus:outline-none">
          <span
            className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${
              danger ? "bg-destructive/10 text-destructive" : "bg-brand-soft text-brand"
            }`}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <AlertDialog.Title className="mt-3 text-center text-f-lg font-extrabold text-foreground">
            {title}
          </AlertDialog.Title>
          {children}
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Log out + delete account + social icons                              */
/* ------------------------------------------------------------------ */

/**
 * The bottom of the profile menu: social icons, Log out, Delete account.
 * `onLogout` / `onDelete` do the real work (App owns the state); this only asks first.
 */
export function AccountSessionActions({
  walletBalance,
  points,
  onLogout,
  onDelete,
}: {
  walletBalance: number;
  points: number;
  onLogout: () => void;
  onDelete: () => void;
}) {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const canDelete = typed.trim().toUpperCase() === "DELETE";

  return (
    <>
      {/* Social */}
      <div className="card-soft mt-4 rounded-3xl p-3.5 xs:p-4">
        <h2 className="text-f-sm font-bold text-foreground">Follow Abraaj</h2>
        <p className="mt-0.5 text-f-xs text-muted-foreground">News, offers and the latest from our team.</p>
        <SocialLinks className="mt-3" />
      </div>

      {/* Session */}
      <div className="mt-4 space-y-2">
        <button
          onClick={() => setLogoutOpen(true)}
          className="card-soft flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3.5 text-f-sm font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <span className="flex min-w-0 items-center gap-3">
            <LogOut className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <span className="truncate">Log out</span>
          </span>
        </button>
        <button
          onClick={() => {
            setTyped("");
            setDeleteOpen(true);
          }}
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-f-sm font-semibold text-destructive focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none"
        >
          <span className="flex min-w-0 items-center gap-3">
            <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Delete account</span>
          </span>
        </button>
      </div>

      {/* Log out confirm */}
      <ConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} Icon={LogOut} title="Log out?">
        <AlertDialog.Description className="mt-1.5 text-center text-f-sm text-muted-foreground">
          Your cart will be cleared. Your orders, wallet and points stay saved for when you log back in.
        </AlertDialog.Description>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <AlertDialog.Cancel className="rounded-2xl bg-secondary py-3.5 text-f-sm font-bold text-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none">
            Stay
          </AlertDialog.Cancel>
          <AlertDialog.Action
            onClick={onLogout}
            className="rounded-2xl bg-brand py-3.5 text-f-sm font-bold text-primary-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Log out
          </AlertDialog.Action>
        </div>
      </ConfirmDialog>

      {/* Delete confirm */}
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} Icon={TriangleAlert} danger title="Delete your account?">
        <AlertDialog.Description className="mt-1.5 text-center text-f-sm text-muted-foreground">
          This permanently removes your account and can't be undone.
        </AlertDialog.Description>
        <ul className="mt-3 space-y-1.5 rounded-2xl bg-secondary px-4 py-3 text-f-xs text-foreground">
          <li>Your orders and subscriptions will be deleted</li>
          <li>Your e-coupon booklets will be deleted</li>
          <li>
            {walletBalance > 0 ? (
              <>
                Your wallet balance of <b>{formatPrice(walletBalance)}</b> will be lost
              </>
            ) : (
              "Your wallet and its history will be deleted"
            )}
          </li>
          <li>
            {points > 0 ? (
              <>
                Your <b>{points.toLocaleString("en-US")} points</b> will be lost
              </>
            ) : (
              "Your points history will be deleted"
            )}
          </li>
        </ul>
        <label htmlFor="delete-confirm" className="mt-4 block text-f-xs font-semibold text-muted-foreground">
          Type <b className="text-foreground">DELETE</b> to confirm
        </label>
        <input
          id="delete-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="DELETE"
          /* 16px minimum stops iOS Safari zooming in on focus. */
          className="mt-1 h-12 w-full rounded-2xl bg-secondary px-4 text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-destructive"
        />
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <AlertDialog.Cancel className="rounded-2xl bg-secondary py-3.5 text-f-sm font-bold text-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none">
            Keep account
          </AlertDialog.Cancel>
          <AlertDialog.Action
            disabled={!canDelete}
            onClick={onDelete}
            className="rounded-2xl bg-destructive py-3.5 text-f-sm font-bold text-destructive-foreground transition-opacity focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-40"
          >
            Delete
          </AlertDialog.Action>
        </div>
      </ConfirmDialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Signed-out screen                                                    */
/* ------------------------------------------------------------------ */

/** Shown in place of the whole app after logging out or deleting the account. */
export function SignedOutScreen({
  status,
  onContinue,
}: {
  status: Exclude<SessionStatus, "in">;
  onContinue: () => void;
}) {
  const deleted = status === "deleted";
  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center bg-background px-6 text-center">
      <img src={logo} alt="Abraaj Water" className="h-[clamp(3.25rem,14vw,4.5rem)] w-auto object-contain dark:brightness-0 dark:invert" />
      <div className="bg-aqua-soft mt-8 grid h-20 w-20 place-items-center rounded-full">
        {deleted ? (
          <Trash2 className="h-8 w-8 text-brand" aria-hidden="true" />
        ) : (
          <ShieldCheck className="h-8 w-8 text-brand" aria-hidden="true" />
        )}
      </div>
      <h1 className="mt-4 text-f-xl font-extrabold tracking-tight text-foreground">
        {deleted ? "Account deleted" : "You're logged out"}
      </h1>
      <p className="mt-1.5 max-w-[19rem] text-f-sm text-muted-foreground">
        {deleted
          ? "Your account and all its data have been removed. We're sorry to see you go."
          : "Your cart was cleared. Your orders, wallet and points are saved for when you log back in."}
      </p>
      <button
        onClick={onContinue}
        className="mt-6 w-full max-w-xs rounded-2xl bg-brand py-4 text-f-sm font-bold text-primary-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {deleted ? "Start fresh" : "Log in again"}
      </button>
    </div>
  );
}
