import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Disclaimer | HealthLink',
  description: 'Important legal disclaimers and terms for using the HealthLink healthcare platform.',
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Legal Disclaimer</h1>

          <div className="prose prose-lg max-w-none">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
              <p className="text-yellow-800 font-semibold">
                ⚠️ Important: Please read this disclaimer carefully before using HealthLink.
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Medical Disclaimer</h2>
              <p className="mb-4">
                <strong>HealthLink is not a substitute for professional medical advice, diagnosis, or treatment.</strong>
                The information and services provided through HealthLink are for informational purposes only
                and should not be considered medical advice.
              </p>
              <p className="mb-4">
                Always seek the advice of qualified healthcare providers with questions about medical conditions,
                treatments, or health concerns. Never disregard professional medical advice or delay seeking
                medical treatment because of information accessed through HealthLink.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Doctor-Patient Relationship</h2>
              <p className="mb-4">
                The use of HealthLink does not create a doctor-patient relationship between you and any
                healthcare provider. Communications through HealthLink are not confidential or privileged
                unless explicitly stated otherwise and required by law.
              </p>
              <p className="mb-4">
                HealthLink facilitates communication between patients and healthcare providers but does not
                guarantee the quality, accuracy, or timeliness of medical services provided.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Security & Privacy</h2>
              <p className="mb-4">
                While HealthLink employs industry-leading security measures including blockchain technology
                and encryption, no system is completely immune to security risks. Users acknowledge and
                accept that:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Data transmission over the internet is never completely secure</li>
                <li>HealthLink cannot guarantee absolute protection against unauthorized access</li>
                <li>Users are responsible for maintaining the confidentiality of their login credentials</li>
                <li>Blockchain transactions are irreversible once confirmed</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Service Availability</h2>
              <p className="mb-4">
                HealthLink strives to provide continuous service but cannot guarantee uninterrupted access.
                Service may be temporarily unavailable due to:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Scheduled maintenance and updates</li>
                <li>Technical issues or system failures</li>
                <li>Force majeure events (natural disasters, etc.)</li>
                <li>Third-party service provider issues</li>
                <li>Ethereum network congestion or outages</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Blockchain & Smart Contracts</h2>
              <p className="mb-4">
                HealthLink utilizes Ethereum blockchain and smart contracts. Users acknowledge that:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Blockchain transactions are irreversible</li>
                <li>Smart contract code may contain bugs or vulnerabilities</li>
                <li>Gas fees and network congestion may affect transaction processing</li>
                <li>Regulatory changes may impact blockchain functionality</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
              <p className="mb-4">
                HealthLink may integrate with third-party services including:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Wallet providers for blockchain transactions</li>
                <li>Cloud storage services for file hosting</li>
                <li>Payment processors for subscription services</li>
                <li>Analytics and monitoring tools</li>
              </ul>
              <p className="mb-4">
                HealthLink is not responsible for the privacy practices, security, or availability
                of these third-party services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">User Responsibilities</h2>
              <p className="mb-4">
                By using HealthLink, you agree to:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Provide accurate and complete information</li>
                <li>Maintain the confidentiality of your account credentials</li>
                <li>Use the service only for lawful purposes</li>
                <li>Not attempt to circumvent security measures</li>
                <li>Report any suspected security incidents immediately</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Limitation of Liability</h2>
              <p className="mb-4">
                To the maximum extent permitted by law, HealthLink and its affiliates, officers,
                directors, employees, and agents shall not be liable for:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Any direct, indirect, incidental, or consequential damages</li>
                <li>Loss of data, profits, or business opportunities</li>
                <li>Medical malpractice or treatment outcomes</li>
                <li>Delays in medical care or emergency response</li>
                <li>Third-party actions or omissions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Indemnification</h2>
              <p className="mb-4">
                You agree to indemnify and hold harmless HealthLink and its affiliates from any
                claims, damages, losses, or expenses arising from:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Your use of the HealthLink platform</li>
                <li>Your violation of these terms</li>
                <li>Your violation of applicable laws</li>
                <li>Any third-party claims related to your use of the service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Governing Law</h2>
              <p className="mb-4">
                This disclaimer and your use of HealthLink are governed by the laws of [Jurisdiction],
                without regard to conflict of law principles. Any disputes shall be resolved in the
                courts of [Jurisdiction].
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Updates to This Disclaimer</h2>
              <p className="mb-4">
                HealthLink reserves the right to update this disclaimer at any time. Users will be
                notified of material changes via email or platform notifications. Continued use of
                HealthLink after changes constitutes acceptance of the updated disclaimer.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Emergency Situations</h2>
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
                <p className="text-red-800 font-semibold mb-2">🚨 Medical Emergency</p>
                <p className="text-red-700">
                  If you are experiencing a medical emergency, call emergency services (911 in the US)
                  immediately. Do not rely on HealthLink for emergency medical situations.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <p className="mb-4">
                If you have questions about this disclaimer or HealthLink services:
              </p>
              <div className="bg-blue-50 p-6 rounded-lg">
                <p className="mb-2"><strong>Legal Department:</strong> legal@healthlink.com</p>
                <p className="mb-2"><strong>Phone:</strong> 1-800-HEALTH-1</p>
                <p className="mb-2"><strong>Address:</strong> 123 Healthcare Street, Medical City, MC 12345</p>
                <p>
                  <Link href="/support" className="text-blue-600 hover:underline">
                    Contact our support team
                  </Link>
                  {' '}for general inquiries.
                </p>
              </div>
            </section>

            <div className="mt-12 p-6 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600 text-center">
                <strong>Last Updated:</strong> December 19, 2025<br />
                By using HealthLink, you acknowledge that you have read, understood, and agree to this disclaimer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
