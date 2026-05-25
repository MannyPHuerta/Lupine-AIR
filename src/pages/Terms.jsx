export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Terms and Conditions</h1>
      <p className="text-sm text-gray-500 mb-8">AIR by Lupine — Terms and Conditions | Effective Date: April 25, 2025</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Program Description</h2>
        <p>The <strong>AIR Platform</strong> is operated by Lupine Technologies for rental businesses and their staff. Users receive notifications about rental operations, including orders, deliveries, repairs, and business intelligence insights through the AIR application.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. Who Can Participate</h2>
        <p>This platform is limited to authorized users of rental businesses with valid accounts. Users are registered by their account administrator.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. Message Frequency</h2>
        <p>Message frequency varies based on asset report activity. You may receive multiple messages per day during active periods, or none during slow periods. Typical usage is a few messages per week per employee.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. Message & Data Rates</h2>
        <p><strong>Message and data rates may apply.</strong> These charges are billed by your mobile carrier and are not controlled by Lupine Technologies.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Opt-Out Instructions</h2>
        <p>To stop receiving SMS notifications, reply <strong>STOP</strong> to any message. You will be removed from future notifications. To re-enroll, contact your system administrator.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">6. Help & Support</h2>
        <p>For help, contact your system administrator or email <a href="mailto:info@TheProjectAIR.com" className="text-blue-600 underline">info@TheProjectAIR.com</a>.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">7. No Third-Party Sharing</h2>
        <p>Your phone number and personal information will not be shared with third parties or used for marketing purposes.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">8. Changes to These Terms</h2>
        <p>Lupine Technologies reserves the right to modify these terms at any time. Continued use of the AIR platform constitutes acceptance of any updated terms.</p>
      </section>

      <p className="text-xs text-gray-400 mt-10">© {new Date().getFullYear()} Lupine Technologies. All rights reserved.</p>
    </div>
  );
}