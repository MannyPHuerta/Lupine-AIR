export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Terms and Conditions</h1>
      <p className="text-sm text-gray-500 mb-8">Rental World Equipment — Asset Wolf SMS Program | Effective Date: April 25, 2025</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Program Description</h2>
        <p>The <strong>Asset Wolf SMS Notification Program</strong> is operated by Rental World Equipment for internal staff use only. Authorized employees receive SMS notifications about asset reports, including new equipment listings, repair requests, disposal notices, and quote requests submitted through the Asset Wolf application.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. Who Can Participate</h2>
        <p>This program is limited to authorized Rental World Equipment employees whose phone numbers have been registered by a system administrator. This is not a public-facing SMS program.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. Message Frequency</h2>
        <p>Message frequency varies based on asset report activity. You may receive multiple messages per day during active periods, or none during slow periods. Typical usage is a few messages per week per employee.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. Message & Data Rates</h2>
        <p><strong>Message and data rates may apply.</strong> These charges are billed by your mobile carrier and are not controlled by Rental World Equipment.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Opt-Out Instructions</h2>
        <p>To stop receiving SMS notifications, reply <strong>STOP</strong> to any message. You will be removed from future notifications. To re-enroll, contact your system administrator.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">6. Help & Support</h2>
        <p>For help, reply <strong>HELP</strong> to any message or contact your system administrator at <a href="mailto:manny@rentalworld.com" className="text-blue-600 underline">manny@rentalworld.com</a>.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">7. No Third-Party Sharing</h2>
        <p>Your phone number and personal information will not be shared with third parties or used for marketing purposes.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">8. Changes to These Terms</h2>
        <p>Rental World Equipment reserves the right to modify these terms at any time. Continued participation in the SMS program constitutes acceptance of any updated terms.</p>
      </section>

      <p className="text-xs text-gray-400 mt-10">© {new Date().getFullYear()} Rental World Equipment. All rights reserved.</p>
    </div>
  );
}