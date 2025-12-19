import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Data Protection | HealthLink',
  description:
    'Learn about how HealthLink protects your sensitive medical data with blockchain security and HIPAA compliance.',
};

export default function DataProtectionPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Data Protection & Privacy</h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-600 mb-8">
              At HealthLink, protecting your sensitive medical data is our highest priority. We
              employ multiple layers of security to ensure your health information remains private,
              secure, and accessible only to authorized individuals.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Blockchain Security</h2>
              <p className="mb-4">
                All medical records are stored on the Ethereum blockchain, providing:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>
                  <strong>Immutability:</strong> Once recorded, data cannot be altered or deleted
                </li>
                <li>
                  <strong>Transparency:</strong> All access is logged and auditable
                </li>
                <li>
                  <strong>Decentralization:</strong> No single point of failure
                </li>
                <li>
                  <strong>Cryptographic Security:</strong> AES-256-GCM encryption at rest
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">HIPAA Compliance</h2>
              <p className="mb-4">HealthLink is fully compliant with HIPAA regulations:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Secure transmission and storage of protected health information (PHI)</li>
                <li>Role-based access control with patient consent requirements</li>
                <li>Comprehensive audit logging of all data access</li>
                <li>Business Associate Agreement (BAA) available for covered entities</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Encryption</h2>
              <p className="mb-4">Multiple encryption layers protect your data:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>
                  <strong>At Rest:</strong> AES-256-GCM encryption for stored files
                </li>
                <li>
                  <strong>In Transit:</strong> TLS 1.3 encryption for all network communications
                </li>
                <li>
                  <strong>Content Addressing:</strong> SHA-256 hashing for file integrity
                  verification
                </li>
                <li>
                  <strong>Key Management:</strong> Secure key derivation and rotation
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Patient Consent & Control
              </h2>
              <p className="mb-4">You maintain full control over your medical data:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Explicit consent required for doctor access to your records</li>
                <li>Granular permission settings for different data types</li>
                <li>Ability to revoke consent at any time</li>
                <li>Complete data portability and export options</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Access Control</h2>
              <p className="mb-4">Strict role-based access control ensures:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>
                  <strong>Patients:</strong> Can only access their own records
                </li>
                <li>
                  <strong>Doctors:</strong> Need patient consent to view records
                </li>
                <li>
                  <strong>Administrators:</strong> Limited oversight access for compliance
                </li>
                <li>
                  <strong>Audit Logging:</strong> Every access attempt is recorded
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Data Retention & Deletion
              </h2>
              <p className="mb-4">Your data privacy rights include:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Right to access your personal data</li>
                <li>Right to rectify inaccurate data</li>
                <li>Right to erase your data (&quot;right to be forgotten&quot;)</li>
                <li>Right to data portability</li>
                <li>Right to restrict processing</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Security Measures</h2>
              <p className="mb-4">We implement industry-leading security practices:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Regular security audits and penetration testing</li>
                <li>Multi-factor authentication for all accounts</li>
                <li>Automated threat detection and response</li>
                <li>Secure development lifecycle (SDL) practices</li>
                <li>Employee background checks and security training</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Incident Response</h2>
              <p className="mb-4">In the unlikely event of a security incident:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Immediate notification to affected users within 72 hours</li>
                <li>Transparent communication about the incident and remediation</li>
                <li>Free credit monitoring services for affected users</li>
                <li>Comprehensive post-incident analysis and improvements</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
              <p className="mb-4">
                If you have questions about our data protection practices or need to exercise your
                privacy rights:
              </p>
              <div className="bg-blue-50 p-6 rounded-lg">
                <p className="mb-2">
                  <strong>Data Protection Officer:</strong> privacy@healthlink.com
                </p>
                <p className="mb-2">
                  <strong>Phone:</strong> 1-800-HEALTH-1
                </p>
                <p className="mb-4">
                  <strong>Address:</strong> 123 Healthcare Street, Medical City, MC 12345
                </p>
                <p>
                  <Link href="/support" className="text-blue-600 hover:underline">
                    Contact our support team
                  </Link>{' '}
                  for additional assistance.
                </p>
              </div>
            </section>

            <div className="mt-12 p-6 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Last Updated:</strong> December 19, 2025
                <br />
                This data protection statement is reviewed and updated regularly to reflect changes
                in our practices and legal requirements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
