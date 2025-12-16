'use client';

import { UX4GCard, UX4GCardContent } from '@/components/ui/ux4g-card';
import { UX4GBadge } from '@/components/ui/ux4g-badge';
import { motion } from 'framer-motion';
import { FileText, AlertTriangle, CheckCircle, Mail } from 'lucide-react';
import Link from 'next/link';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function TermsOfServicePage() {
  const lastUpdated = 'December 16, 2025';

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
            }}
            className="max-w-4xl mx-auto text-center space-y-6"
          >
            <motion.div variants={fadeInUp}>
              <UX4GBadge variant="warning" className="mb-4">
                <FileText className="h-3 w-3 mr-1" />
                Terms of Service
              </UX4GBadge>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-5xl md:text-6xl font-bold tracking-tight">
              Terms &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Conditions
              </span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-lg text-muted-foreground">
              Last Updated: {lastUpdated}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Acceptance */}
            <UX4GCard>
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-primary" />
                    1. Acceptance of Terms
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    By accessing and using HealthLink Pro (&quot;the Platform&quot;), you accept and agree to be bound by these
                    Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Platform.
                    These Terms apply to all users including patients, healthcare providers, and administrators.
                  </p>
                </div>
              </UX4GCardContent>
            </UX4GCard>

            {/* User Accounts */}
            <UX4GCard>
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-primary" />
                    2. User Accounts and Registration
                  </h2>

                  <h3 className="text-xl font-semibold mt-4 mb-2">2.1 Account Creation</h3>
                  <p className="text-muted-foreground">
                    You must register for an account to use the Platform. You agree to provide accurate, current, and
                    complete information during registration and to update such information as needed.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">2.2 Account Security</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>You are responsible for maintaining the confidentiality of your account credentials</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>You must immediately notify us of any unauthorized use of your account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>You are liable for all activities conducted through your account</span>
                    </li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">2.3 Healthcare Provider Verification</h3>
                  <p className="text-muted-foreground">
                    Healthcare providers must provide valid medical registration numbers and credentials. We reserve the
                    right to verify and validate all healthcare provider accounts.
                  </p>
                </div>
              </UX4GCardContent>
            </UX4GCard>

            {/* Platform Use */}
            <UX4GCard>
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-primary" />
                    3. Acceptable Use
                  </h2>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.1 Permitted Uses</h3>
                  <p className="text-muted-foreground mb-3">You may use the Platform to:</p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Store, manage, and share your health records securely</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Grant and revoke access to healthcare providers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>View prescriptions, lab results, and medical history</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Communicate with healthcare providers through the Platform</span>
                    </li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-6 mb-2">3.2 Prohibited Uses</h3>
                  <p className="text-muted-foreground mb-3">You must NOT:</p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>Upload false, misleading, or fraudulent health information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>Attempt to access other users&apos; data without authorization</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>Use the Platform for any illegal or unauthorized purpose</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>Interfere with or disrupt the Platform&apos;s operation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>Upload viruses, malware, or malicious code</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>Scrape, harvest, or collect user data</span>
                    </li>
                  </ul>
                </div>
              </UX4GCardContent>
            </UX4GCard>

            {/* Healthcare Services */}
            <UX4GCard>
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                    4. Healthcare Services Disclaimer
                  </h2>

                  <div className="bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500 p-4 mb-4">
                    <p className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2">
                      IMPORTANT MEDICAL DISCLAIMER
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-400">
                      HealthLink Pro is a health information management platform, NOT a medical advice or telemedicine
                      service. The Platform does not provide medical diagnoses, treatment recommendations, or emergency
                      medical services.
                    </p>
                  </div>

                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Always consult qualified healthcare professionals for medical advice</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>In case of medical emergency, call emergency services immediately</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>The Platform is not a substitute for professional medical care</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>We are not responsible for medical decisions made based on Platform data</span>
                    </li>
                  </ul>
                </div>
              </UX4GCardContent>
            </UX4GCard>

            {/* Data and Privacy */}
            <UX4GCard>
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-primary" />
                    5. Data and Privacy
                  </h2>
                  <p className="text-muted-foreground">
                    Your use of the Platform is also governed by our{' '}
                    <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.
                    By using the Platform, you consent to our data practices as described in the Privacy Policy.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">5.1 Your Responsibilities</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Ensure accuracy of health information you upload</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Manage consent permissions responsibly</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Review audit trails regularly for unauthorized access</span>
                    </li>
                  </ul>
                </div>
              </UX4GCardContent>
            </UX4GCard>

            {/* Blockchain */}
            <UX4GCard>
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-primary" />
                    6. Blockchain Technology
                  </h2>

                  <h3 className="text-xl font-semibold mt-4 mb-2">6.1 Blockchain Transactions</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Certain operations require blockchain transactions with associated gas fees</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>You are responsible for all gas fees incurred during Platform use</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Blockchain transactions are immutable and cannot be reversed</span>
                    </li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">6.2 MetaMask and Wallet</h3>
                  <p className="text-muted-foreground">
                    You are solely responsible for maintaining the security of your cryptocurrency wallet and private keys.
                    We cannot recover lost or compromised wallet credentials.
                  </p>
                </div>
              </UX4GCardContent>
            </UX4GCard>

            {/* Limitation of Liability */}
            <UX4GCard>
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                    7. Limitation of Liability
                  </h2>
                  <p className="text-muted-foreground">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, HEALTHLINK PRO SHALL NOT BE LIABLE FOR ANY INDIRECT,
                    INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES,
                    WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE
                    LOSSES RESULTING FROM:
                  </p>
                  <ul className="space-y-2 text-muted-foreground mt-3">
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Your use or inability to use the Platform</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Any unauthorized access to or use of your data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Any interruption or cessation of Platform services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Medical decisions or outcomes based on Platform data</span>
                    </li>
                  </ul>
                </div>
              </UX4GCardContent>
            </UX4GCard>

            {/* Termination */}
            <UX4GCard>
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-primary" />
                    8. Termination
                  </h2>
                  <p className="text-muted-foreground">
                    We reserve the right to suspend or terminate your account if you violate these Terms or engage in
                    fraudulent or illegal activities. You may terminate your account at any time through the Settings page.
                    Upon termination, certain data may be retained for legal compliance and audit purposes.
                  </p>
                </div>
              </UX4GCardContent>
            </UX4GCard>

            {/* Changes */}
            <UX4GCard>
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-primary" />
                    9. Changes to Terms
                  </h2>
                  <p className="text-muted-foreground">
                    We may modify these Terms at any time. We will notify you of significant changes via email or Platform
                    notification. Your continued use of the Platform after such changes constitutes acceptance of the updated
                    Terms.
                  </p>
                </div>
              </UX4GCardContent>
            </UX4GCard>

            {/* Contact */}
            <UX4GCard className="border-2 border-primary/20">
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Mail className="h-6 w-6 text-primary" />
                    10. Contact Information
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    For questions about these Terms of Service, please contact:
                  </p>
                  <div className="space-y-2 text-muted-foreground">
                    <p><strong>Email:</strong> <a href="mailto:legal@healthlinkpro.gov.in" className="text-primary hover:underline">legal@healthlinkpro.gov.in</a></p>
                    <p><strong>Phone:</strong> 1800-XXX-XXXX (Toll Free)</p>
                    <p><strong>Address:</strong> Ministry of Health & Family Welfare, Nirman Bhawan, New Delhi - 110011</p>
                  </div>
                  <div className="mt-6 pt-6 border-t">
                    <p className="text-sm text-muted-foreground">
                      For general inquiries, visit our{' '}
                      <Link href="/support" className="text-primary hover:underline">Support Center</Link>.
                    </p>
                  </div>
                </div>
              </UX4GCardContent>
            </UX4GCard>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
