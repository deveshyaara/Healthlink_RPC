import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Accessibility Statement | HealthLink',
  description: 'HealthLink is committed to making our healthcare platform accessible to everyone, including users with disabilities.',
};

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Accessibility Statement</h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-600 mb-8">
              At HealthLink, we are committed to ensuring that our healthcare platform is accessible
              to everyone, including users with disabilities. We strive to provide an inclusive
              experience that meets or exceeds accessibility standards and guidelines.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Commitment</h2>
              <p className="mb-4">
                HealthLink is designed with accessibility in mind from the ground up. We adhere to
                the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards and are
                committed to:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Providing equal access to all users, regardless of ability</li>
                <li>Regular accessibility audits and testing</li>
                <li>Continuous improvement of our accessibility features</li>
                <li>Responding promptly to accessibility concerns and feedback</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Accessibility Features</h2>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Screen Reader Support</h3>
                  <ul className="list-disc pl-6 text-sm">
                    <li>Proper ARIA labels and descriptions</li>
                    <li>Semantic HTML structure</li>
                    <li>Screen reader announcements for dynamic content</li>
                    <li>Keyboard navigation support</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Visual Accessibility</h3>
                  <ul className="list-disc pl-6 text-sm">
                    <li>High contrast color schemes</li>
                    <li>Resizable text (up to 200%)</li>
                    <li>Focus indicators for keyboard navigation</li>
                    <li>Alternative text for images</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Motor Accessibility</h3>
                  <ul className="list-disc pl-6 text-sm">
                    <li>Keyboard-only navigation</li>
                    <li>Extended click targets</li>
                    <li>Reduced motion options</li>
                    <li>Voice control compatibility</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Cognitive Accessibility</h3>
                  <ul className="list-disc pl-6 text-sm">
                    <li>Clear, simple language</li>
                    <li>Consistent navigation patterns</li>
                    <li>Progressive disclosure of information</li>
                    <li>Error prevention and clear error messages</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Standards Compliance</h2>
              <p className="mb-4">
                HealthLink conforms to the following accessibility standards:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>WCAG 2.1 Level AA:</strong> Web Content Accessibility Guidelines</li>
                <li><strong>Section 508:</strong> U.S. federal accessibility standards</li>
                <li><strong>ADA Compliance:</strong> Americans with Disabilities Act</li>
                <li><strong>EN 301 549:</strong> European accessibility requirements</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Browser and Assistive Technology Support</h2>
              <p className="mb-4">
                HealthLink is tested with and supports the following combinations:
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Screen Readers</h3>
                  <ul className="list-disc pl-6 text-sm">
                    <li>NVDA (Windows)</li>
                    <li>JAWS (Windows)</li>
                    <li>VoiceOver (macOS/iOS)</li>
                    <li>TalkBack (Android)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Browsers</h3>
                  <ul className="list-disc pl-6 text-sm">
                    <li>Chrome (latest 2 versions)</li>
                    <li>Firefox (latest 2 versions)</li>
                    <li>Safari (latest 2 versions)</li>
                    <li>Edge (latest 2 versions)</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Keyboard Navigation</h2>
              <p className="mb-4">
                All functionality is available using only the keyboard:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Tab:</strong> Move forward through interactive elements</li>
                <li><strong>Shift + Tab:</strong> Move backward through interactive elements</li>
                <li><strong>Enter/Space:</strong> Activate buttons and links</li>
                <li><strong>Arrow Keys:</strong> Navigate within menus and lists</li>
                <li><strong>Escape:</strong> Close modals and dropdowns</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Medical Content Accessibility</h2>
              <p className="mb-4">
                Healthcare information requires special accessibility considerations:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Medical terminology explained in plain language</li>
                <li>Large print options for prescriptions and instructions</li>
                <li>Audio descriptions for medical imaging (when available)</li>
                <li>Simplified consent forms and medical information</li>
                <li>Multi-language support for diverse patient populations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Reporting Accessibility Issues</h2>
              <p className="mb-4">
                If you encounter accessibility barriers or have suggestions for improvement:
              </p>
              <div className="bg-blue-50 p-6 rounded-lg mb-4">
                <p className="mb-2"><strong>Accessibility Team:</strong> accessibility@healthlink.com</p>
                <p className="mb-2"><strong>Phone:</strong> 1-800-ACCESS-1</p>
                <p className="mb-4"><strong>Response Time:</strong> We aim to respond within 2 business days</p>
                <p>
                  <Link href="/support" className="text-blue-600 hover:underline">
                    Submit an accessibility report
                  </Link>
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Accessibility Training</h2>
              <p className="mb-4">
                Our team receives regular training on:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Accessibility best practices and standards</li>
                <li>Assistive technology usage and testing</li>
                <li>Inclusive design principles</li>
                <li>Legal requirements and compliance</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Content</h2>
              <p className="mb-4">
                While we strive to ensure accessibility across our entire platform, some third-party
                content or integrations may have different accessibility levels. We work with our
                partners to maintain high accessibility standards whenever possible.
              </p>
            </section>

            <div className="mt-12 p-6 bg-green-50 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Continuous Improvement</h3>
              <p className="text-green-700">
                Accessibility is an ongoing commitment. We regularly audit our platform,
                incorporate user feedback, and update our practices to ensure HealthLink
                remains accessible to all users.
              </p>
            </div>

            <div className="mt-8 p-6 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Last Updated:</strong> December 19, 2025<br />
                <strong>Accessibility Standards Version:</strong> WCAG 2.1 Level AA<br />
                This accessibility statement is reviewed quarterly and updated as needed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
