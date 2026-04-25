export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Rental World Equipment — Asset Wolf | Effective Date: April 25, 2025</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Overview</h2>
        <p>This Privacy Policy describes how Rental World Equipment ("we," "us," or "our") collects, uses, and protects information through the Asset Wolf internal asset management application. This application is used exclusively by authorized Rental World staff.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. Information We Collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Employee email addresses and names for authentication and report routing</li>
          <li>Employee phone numbers for internal SMS notifications</li>
          <li>Asset report data including equipment details, condition notes, photos, and branch locations</li>
          <li>Report activity logs including timestamps of submissions and views</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. How We Use Information</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>To route internal asset reports to the appropriate staff members via email and SMS</li>
          <li>To notify staff of new asset reports, updates, and actions required</li>
          <li>To maintain an audit trail of asset dispositions (sell, repair, discard)</li>
          <li>To provide analytics on asset management activity within the organization</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. SMS Notifications</h2>
        <p>We send SMS messages to authorized staff phone numbers solely to deliver internal asset management notifications. Message frequency varies based on report activity. Standard message and data rates may apply. Staff may request removal from SMS notifications by contacting their supervisor.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Information Sharing</h2>
        <p className="font-semibold text-gray-900">We do not sell, rent, or share any collected information with third parties for marketing purposes.</p>
        <p className="mt-2">Information is shared only with:</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Authorized Rental World staff as part of normal business operations</li>
          <li>Service providers (Twilio for SMS, email delivery services) solely to facilitate internal notifications</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">6. Data Security</h2>
        <p>Access to the Asset Wolf application is restricted to authenticated Rental World employees. All data is stored securely and access is logged.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">7. Contact</h2>
        <p>For questions about this privacy policy, contact your system administrator or email <a href="mailto:manny@rentalworld.com" className="text-blue-600 underline">manny@rentalworld.com</a>.</p>
      </section>

      <p className="text-xs text-gray-400 mt-10">© {new Date().getFullYear()} Rental World Equipment. All rights reserved.</p>
    </div>
  );
}