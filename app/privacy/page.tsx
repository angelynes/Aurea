import type { Metadata } from "next";
import { LegalPage, SupportEmail } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy">
    <p>Aurea is a personal planner for your tasks, projects, routines and calendar. This policy explains what information Aurea collects, how it is used, and the choices you have. In short: your planner is yours, we only use it to run Aurea for you, and we never sell it or use it for advertising.</p>

    <h2>Information we collect</h2>
    <ul>
      <li><strong>Account information.</strong> Your email address. If you sign in with Google, we also receive the basic profile Google shares for sign-in (your name, email and profile picture).</li>
      <li><strong>Your planner.</strong> Everything you add to Aurea: tasks, notes, subtasks, projects and project updates, routines, categories, dates and times, locations, travel times and reminders, plus your display name, optional profile picture and settings such as your time zone.</li>
      <li><strong>Calendar events you bring in.</strong> If you connect Google Calendar, Aurea reads your events (read-only) and shows them in your planner. If you import an .ics file, its events are added the same way. Aurea never changes or deletes events in your Google Calendar.</li>
      <li><strong>Reminder devices.</strong> If you turn on reminders while Aurea is closed, we store a push address for that device, issued by your browser or phone maker, and the device&apos;s time zone, so reminders arrive on time.</li>
      <li><strong>Technical information.</strong> Our hosting provider keeps standard server logs, such as IP address, browser type and the time of a request, to keep the service running and secure.</li>
    </ul>
    <p>Aurea does not use advertising, analytics or tracking cookies. It uses your browser&apos;s storage to keep you signed in and to keep a copy of your planner on your device, so Aurea works quickly and offline.</p>

    <h2>How we use it</h2>
    <ul>
      <li>To provide Aurea: show and sync your planner across your devices, send your sign-in emails and send the reminders you set.</li>
      <li>To keep your data safe: version-checked saves, and backups so your planner can be restored if something goes wrong.</li>
      <li>To respond when you contact us, and to keep the service secure and prevent abuse.</li>
    </ul>
    <p>We do not sell or rent your personal information, and we do not share it for cross-context behavioral advertising.</p>

    <h2>Google user data</h2>
    <p>Aurea uses Google sign-in, and read-only Google Calendar access if you choose to connect it. Calendar data is used only to show your events inside your Aurea planner. Aurea&apos;s use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements. We do not use Google data for advertising, we do not sell it, and no person reads it unless you ask us to for support, it is needed for security, or the law requires it. You can disconnect Google Calendar in Settings at any time, and remove Aurea&apos;s access from your Google Account settings.</p>

    <h2>Who helps us run Aurea</h2>
    <p>We use a small number of service providers who process data only on our behalf:</p>
    <ul>
      <li><strong>Supabase</strong> stores accounts and planner data and handles sign-in.</li>
      <li><strong>Vercel</strong> hosts the Aurea website and app.</li>
      <li><strong>Resend</strong> delivers sign-in emails.</li>
      <li><strong>Google</strong> provides Google sign-in and Google Calendar, if you use them.</li>
      <li><strong>Push services</strong> run by Apple, Google or Mozilla deliver reminders to your device, if you turn them on.</li>
    </ul>
    <p>We may also disclose information if the law requires it, or to protect the rights and safety of our users or others.</p>

    <h2>Where your data is stored</h2>
    <p>Aurea&apos;s providers may store and process data in the United States and other countries. Where data moves across borders, including from Indonesia, we rely on our providers&apos; safeguards and only transfer what is needed to run Aurea.</p>

    <h2>How long we keep it</h2>
    <ul>
      <li>Your planner and account are kept until you delete them.</li>
      <li>Backups of your planner are kept for 30 days.</li>
      <li>Records of sent reminders are kept for about 3 days.</li>
      <li>When you delete your account, your account, planner, backups and reminder devices are deleted right away. Server logs kept by our hosting provider expire on their own schedule.</li>
    </ul>

    <h2>Your choices and rights</h2>
    <ul>
      <li><strong>Access and download:</strong> use <em>Settings → Data &amp; backup → Export Aurea backup</em> to download your planner.</li>
      <li><strong>Correct:</strong> edit anything in your planner or settings at any time.</li>
      <li><strong>Delete:</strong> use <em>Settings → Data &amp; backup → Delete my account</em>, or contact us.</li>
      <li><strong>Withdraw permissions:</strong> disconnect Google Calendar, or turn off reminders, in Settings at any time.</li>
    </ul>
    <p><strong>California residents</strong> have the right to know what personal information we collect and how it is used, to request deletion and correction, and to not be discriminated against for exercising these rights. We do not sell or share personal information as those terms are defined under California law.</p>
    <p><strong>Users in Indonesia</strong> have rights under Law No. 27 of 2022 on Personal Data Protection, including the right to get information about and access your data, to correct and update it, to delete it, to withdraw consent, to object to certain processing, and to obtain your data in a commonly used format.</p>
    <p>To make any request, use the options in Settings or contact us at <SupportEmail />. We may need to confirm it is you before acting on a request.</p>

    <h2>Security</h2>
    <p>Data travels over encrypted connections, and the database only lets each signed-in person read and change their own planner. No system is perfectly secure, so please keep your email account safe, since it is how you sign in.</p>

    <h2>Children</h2>
    <p>Aurea is not meant for children under 13, and we do not knowingly collect personal information from them. If you believe a child under 13 has created an account, contact us and we will delete it.</p>

    <h2>Changes to this policy</h2>
    <p>If we make meaningful changes, we will update the date at the top of this page and let you know in the app or by email before the changes take effect.</p>

    <h2>Contact</h2>
    <p>Questions or requests about your privacy: <SupportEmail />.</p>
  </LegalPage>;
}
