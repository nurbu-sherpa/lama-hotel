import { BellRing, CheckCircle2, Mail, XCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { storageMode } from "@/lib/storage";
import { emailProvider } from "@/lib/notify";
import { changePassword, sendTestNotification, updateAccount, updateNotificationSettings } from "@/server/actions/admin/account";
import { AdminForm, SubmitButton } from "@/components/admin/AdminForm";
import { ACheckbox, AText } from "@/components/admin/Fields";
import { AdminPageTitle, Panel } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils/format";

export const metadata = { title: "Settings" };

function Status({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex gap-3">
      {ok ? <CheckCircle2 size={20} className="shrink-0 text-forest-600" aria-hidden /> : <XCircle size={20} className="shrink-0 text-clay-600" aria-hidden />}
      <div>
        <p className="font-medium text-ink">
          {label}: {ok ? "ready" : "not configured"}
        </p>
        <p className="text-sm text-muted">{detail}</p>
      </div>
    </li>
  );
}

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const [hotel, logs] = await Promise.all([
    prisma.hotelSettings.findUniqueOrThrow({
      where: { id: "default" },
      select: { email: true, notificationEmail: true, notifyEmail: true },
    }),
    prisma.notificationLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const storage = storageMode();
  const mail = emailProvider();

  return (
    <>
      <AdminPageTitle title="Settings" description="Your account, password, and how you are notified about new bookings." />

      {/* ── Notifications ── */}
      <Panel
        title="Notifications"
        description="When a guest sends a booking inquiry or message from the website you get an alert in this dashboard (no refresh needed), plus an email if switched on below."
        className="mb-6"
      >
        <ul className="mb-6 grid gap-4 rounded-md bg-cream-50 p-4 sm:grid-cols-2">
          <li className="flex gap-3">
            <BellRing size={20} className="mt-0.5 shrink-0 text-forest-600" aria-hidden />
            <div>
              <p className="font-medium text-ink">Dashboard alerts: on</p>
              <p className="text-sm text-muted">Checks every 15 seconds. Use the bell at the top to enable sound and desktop alerts.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <Mail size={20} className={`mt-0.5 shrink-0 ${mail.name ? "text-forest-600" : "text-clay-600"}`} aria-hidden />
            <div>
              <p className="font-medium text-ink">Email: {mail.name ? "Gmail / SMTP connected" : "not connected"}</p>
              <p className="text-sm text-muted">{mail.name ? `Sending from ${mail.from}` : "Ask your developer to add SMTP_USER and SMTP_PASS (Gmail App Password) to the server settings."}</p>
            </div>
          </li>
        </ul>

        <AdminForm action={updateNotificationSettings} className="grid max-w-xl gap-6">
          <fieldset className="space-y-4">
            <legend className="mb-1 font-semibold text-forest-900">Email (Gmail)</legend>
            <ACheckbox label="Send an email for every new booking inquiry and message" name="notifyEmail" defaultChecked={hotel.notifyEmail} />
            <AText
              label="Send notifications to"
              name="notificationEmail"
              type="email"
              defaultValue={hotel.notificationEmail}
              placeholder={hotel.email}
              optional
              hint={`Leave empty to use the hotel email (${hotel.email}).`}
            />
          </fieldset>
          <div>
            <SubmitButton>Save notification settings</SubmitButton>
          </div>
        </AdminForm>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-cream-200 pt-5">
          <AdminForm action={sendTestNotification}>
            <SubmitButton variant="outline">
              <Mail size={16} aria-hidden /> Send test email
            </SubmitButton>
          </AdminForm>
          <p className="self-center text-sm text-muted">Save your changes first — the test uses the saved address.</p>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold text-forest-900">Recent deliveries</h3>
          {logs.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No emails sent yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-cream-100 rounded-md border border-cream-200 text-sm">
              {logs.map((l) => (
                <li key={l.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-4 py-2.5">
                  <span className={`font-semibold ${l.success ? "text-forest-700" : "text-red-700"}`}>{l.success ? "Sent" : "Failed"}</span>
                  <span className="text-ink">
                    Email · {l.event.replace(/_/g, " ")} · {l.recipient}
                  </span>
                  <span className="text-muted">{formatDateTime(l.createdAt)}</span>
                  {!l.success && <span className="w-full text-red-700">{l.detail}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Account">
          <AdminForm action={updateAccount} className="space-y-5">
            <AText label="Your name" name="name" defaultValue={admin.name} required />
            <AText label="Login email" name="loginEmail" defaultValue={admin.email} disabled hint="Contact your developer to change the login email." />
            <SubmitButton>Save</SubmitButton>
          </AdminForm>
        </Panel>

        <Panel title="Change password">
          <AdminForm action={changePassword} className="space-y-5" resetOnSuccess>
            <AText label="Current password" name="currentPassword" type="password" autoComplete="current-password" required />
            <AText label="New password" name="newPassword" type="password" autoComplete="new-password" minLength={12} required hint="At least 12 characters." />
            <AText label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required />
            <SubmitButton>Change password</SubmitButton>
          </AdminForm>
        </Panel>

        <Panel title="System status" className="lg:col-span-2">
          <ul className="space-y-4">
            <Status
              ok={storage !== "unconfigured"}
              label="Image uploads"
              detail={
                storage === "cloudinary"
                  ? "Photos are stored on Cloudinary."
                  : storage === "local"
                    ? "Photos are stored on this server's disk (fine for development; use Cloudinary in production)."
                    : "Set the Cloudinary environment variables to enable photo uploads."
              }
            />
            <Status ok={Boolean(mail.name)} label="Email notifications" detail={mail.name ? `Emails go to ${hotel.notificationEmail || hotel.email}.` : "Inquiries are always saved here in the dashboard. Add SMTP settings to also receive emails."} />
          </ul>
        </Panel>
      </div>
    </>
  );
}
