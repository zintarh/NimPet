import Link from "next/link";

export const metadata = {
  title: "Terms of Service — NimPet",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-neutral-500 hover:text-black mb-10 inline-block">
          ← Back to NimPet
        </Link>

        <h1 className="text-4xl font-display uppercase mb-2">Terms of Service</h1>
        <p className="text-sm text-neutral-500 mb-10">Last updated: May 8, 2026</p>

        <div className="prose prose-neutral max-w-none text-[15px] leading-relaxed space-y-8">

          <section className="bg-neutral-100 rounded-lg p-4 text-sm">
            <p><strong>Operator:</strong> NimPet is independently operated by Oshioke Salaki. It is not operated by, affiliated with, endorsed by, or in any way connected to Nimiq or any of its subsidiaries or partners. Any use of the Nimiq Pay platform to access NimPet is subject to Nimiq's own terms and policies separately.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using NimPet ("the App"), you agree to be bound by these Terms of Service. If you do not agree, do not use the App.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">2. What NimPet Does</h2>
            <p>NimPet is a productivity application built on the Base blockchain, distributed as a Nimiq Pay mini app. Users complete timed focus sessions to earn experience points (XP), grow a virtual pet, and compete on a community leaderboard.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">3. Blockchain Transactions</h2>
            <p>NimPet records focus sessions and purchases as transactions on the Base blockchain. All on-chain transactions are irreversible. Network fees (gas) may apply. You are responsible for maintaining access to your wallet and private keys.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">4. Virtual Items and Shop</h2>
            <p>Items purchased in the NimPet shop (food, cosmetics, shields) are digital goods paid for in USDC and recorded on-chain. Purchases are final and non-refundable. Virtual items have no monetary value outside the App.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">5. User Conduct</h2>
            <p>You agree not to manipulate, exploit, or abuse the App's systems including session recording or leaderboard rankings. We reserve the right to disqualify accounts found engaging in fraudulent activity.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">6. Disclaimer of Warranties</h2>
            <p>The App is provided "as is" without warranty of any kind. We do not guarantee uptime, data persistence, or the availability of any specific feature. Blockchain networks may experience congestion or outages outside our control.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">7. Limitation of Liability</h2>
            <p>NimPet is not liable for any loss of funds, loss of access to your wallet, or loss of virtual items arising from your use of the App.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">8. Changes to Terms</h2>
            <p>We may update these Terms at any time. Continued use of the App after changes constitutes acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">9. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:salaki1902@gmail.com" className="underline">salaki1902@gmail.com</a>.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
