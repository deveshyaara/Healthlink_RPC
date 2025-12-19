import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sitemap | HealthLink',
  description: 'Complete sitemap of HealthLink healthcare platform.',
};

const sitemapSections = [
  {
    title: 'Main Pages',
    links: [
      { href: '/', label: 'Home' },
      { href: '/features', label: 'Features' },
      { href: '/about', label: 'About' },
      { href: '/support', label: 'Support' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Legal & Compliance',
    links: [
      { href: '/privacy-policy', label: 'Privacy Policy' },
      { href: '/terms-of-service', label: 'Terms of Service' },
      { href: '/data-protection', label: 'Data Protection' },
      { href: '/accessibility', label: 'Accessibility' },
      { href: '/disclaimer', label: 'Disclaimer' },
    ],
  },
  {
    title: 'User Accounts',
    links: [
      { href: '/login', label: 'Login' },
      { href: '/signup', label: 'Sign Up' },
    ],
  },
  {
    title: 'Dashboard',
    links: [
      { href: '/dashboard', label: 'Dashboard Home' },
      { href: '/dashboard/patient', label: 'Patient Dashboard' },
      { href: '/dashboard/doctor', label: 'Doctor Dashboard' },
      { href: '/dashboard/records', label: 'Medical Records' },
      { href: '/dashboard/appointments', label: 'Appointments' },
      { href: '/dashboard/prescriptions', label: 'Prescriptions' },
      { href: '/dashboard/lab-tests', label: 'Lab Tests' },
      { href: '/dashboard/consent', label: 'Consent Management' },
      { href: '/dashboard/settings', label: 'Settings' },
    ],
  },
];

export default function SitemapPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Sitemap</h1>
          <p className="text-gray-600 mb-12">
            Navigate through all pages and sections of the HealthLink platform.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {sitemapSections.map((section) => (
              <div key={section.title} className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{section.title}</h2>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-500">
              Can&apos;t find what you&apos;re looking for?{' '}
              <Link href="/support" className="text-blue-600 hover:underline">
                Contact our support team
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
