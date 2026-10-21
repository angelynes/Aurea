import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, SupportEmail } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return <LegalPage title="Terms of Service">
    <p>These terms are an agreement between you and Aurea about using the Aurea planner, including the website, the app and its related services. By creating an account or using Aurea, you agree to them. If you do not agree, please do not use Aurea.</p>

    <h2>Who can use Aurea</h2>
    <p>You must be at least 13 years old to use Aurea. If you are under the age of adulthood where you live, a parent or guardian must agree to these terms on your behalf.</p>

    <h2>Your account</h2>
    <p>You sign in with your email address or with Google. Keep access to that email or Google account secure, since anyone who can reach it can sign in to your Aurea account. Tell us right away at <SupportEmail /> if you think someone else has used your account.</p>

    <h2>Your content</h2>
    <p>Everything you put in Aurea, such as tasks, notes, projects and routines, belongs to you. You give Aurea permission to store, copy, sync and display that content only as needed to run the service for you, for example to show it on your devices and send your reminders. This permission ends when you delete your content or your account, except for backups, which are deleted within 30 days. Our <Link href="/privacy">Privacy Policy</Link> explains how we handle your information.</p>

    <h2>Acceptable use</h2>
    <p>Please do not misuse Aurea. For example, do not:</p>
    <ul>
      <li>break the law or violate anyone else&apos;s rights using Aurea;</li>
      <li>try to access other people&apos;s accounts or data, or get around Aurea&apos;s security;</li>
      <li>overload, disrupt or reverse engineer the service, or use automated tools to access it in ways normal use would not;</li>
      <li>use Aurea to store or send malware, spam or illegal content.</li>
    </ul>

    <h2>Reminders and sync</h2>
    <p>Aurea works hard to keep your planner in sync and to deliver reminders on time, but delivery depends on your device, your browser or phone settings, your internet connection, and third-party push and email services. Do not rely on Aurea as your only reminder for anything where a missed or late reminder could cause harm, such as medication, medical care, safety or legal deadlines.</p>

    <h2>Third-party services</h2>
    <p>Some features connect to services run by others, such as Google sign-in and Google Calendar. Your use of those services is also governed by their own terms and policies.</p>

    <h2>Changes to Aurea</h2>
    <p>Aurea is currently free. We may add, change or remove features over time. If we ever introduce paid features, we will tell you clearly before you are charged anything.</p>

    <h2>Ending your use</h2>
    <p>You can stop using Aurea at any time, and you can delete your account in <em>Settings → Data &amp; backup → Delete my account</em>. We may suspend or close accounts that seriously or repeatedly break these terms, or where we are required to by law. Where reasonable, we will tell you first and give you a chance to export your planner.</p>

    <h2>Disclaimers</h2>
    <p>Aurea is provided &quot;as is&quot; and &quot;as available&quot;. To the extent the law allows, we make no warranties, whether express or implied, that Aurea will be uninterrupted, error-free or suited to a particular purpose. Please keep your own backups of anything important. You can export one at any time in Settings.</p>

    <h2>Limitation of liability</h2>
    <p>To the extent the law allows, Aurea is not liable for any indirect, incidental, special, consequential or punitive damages, or for lost data, profits or opportunities, arising from your use of Aurea. Our total liability for any claim relating to Aurea is limited to the greater of the amount you paid us in the 12 months before the claim or USD 50. Some places do not allow these limits, so they may not apply to you.</p>

    <h2>Governing law</h2>
    <p>These terms are governed by the laws of the State of California, USA, without regard to its conflict-of-law rules, and disputes will be handled in the state or federal courts located in California. If you live in Indonesia or another country whose consumer laws give you rights that cannot be waived by agreement, nothing in these terms takes away those rights, and you may also bring a claim in the courts where you live where local law allows.</p>

    <h2>Changes to these terms</h2>
    <p>If we make meaningful changes, we will update the date at the top of this page and let you know in the app or by email before they take effect. Continuing to use Aurea after that means you accept the updated terms.</p>

    <h2>Contact</h2>
    <p>Questions about these terms: <SupportEmail />.</p>
  </LegalPage>;
}
