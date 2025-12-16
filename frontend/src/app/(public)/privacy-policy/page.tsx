'use client';

import { UX4GCard, UX4GCardContent } from '@/components/ui/ux4g-card';
import { UX4GBadge } from '@/components/ui/ux4g-badge';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, FileText, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import Link from 'next/link';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function PrivacyPolicyPage() {
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
              <UX4GBadge variant="info" className="mb-4">
                <Shield className="h-3 w-3 mr-1" />
                Privacy Policy
              </UX4GBadge>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-5xl md:text-6xl font-bold tracking-tight">
              Your Privacy is{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Our Priority
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
            {/* Introduction */}
            <UX4GCard>
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    Introduction
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    HealthLink Pro (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy and ensuring the security
                    of your personal health information. This Privacy Policy explains how we collect, use, disclose, and
                    safeguard your information when you use our platform. By using HealthLink Pro, you agree to the terms
                    outlined in this policy.
                  </p>
                </div>
              </UX4GCardContent>
            </UX4GCard>

            {/* Information We Collect */}
            <UX4GCard>
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Eye className="h-6 w-6 text-primary" />
                    Information We Collect
                  </h2>
                  <h3 className="text-xl font-semibold mt-6 mb-3">Personal Information</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Identity Information:</strong> Name, date of birth, Aadhaar number, email address, phone number</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Professional Information:</strong> Medical registration number (for healthcare providers), specialization, qualifications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Blockchain Information:</strong> Wallet addresses, transaction hashes, smart contract interactions</span>
                    </li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-6 mb-3">Health Information</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Medical records, test results, and diagnostic reports</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Prescriptions, treatment plans, and medication history</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Appointment history and consultation notes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Lab test results and imaging reports</span>
                    </li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-6 mb-3">Technical Information</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>IP address, browser type, device information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Usage data, access times, pages viewed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Cookies and similar tracking technologies</span>
                    </li>
                  </ul>
                </div>
              </UX4GCardContent>
            </UX4GCard>

            {/* How We Use Your Information */}
            <UX4GCard>
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Lock className="h-6 w-6 text-primary" />
                    How We Use Your Information
                  </h2>
                  <p className="text-muted-foreground mb-4">We use your information for the following purposes:</p>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Healthcare Services:</strong> To facilitate medical consultations, prescriptions, and health record management</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Authentication:</strong> To verify your identity and maintain account security</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Consent Management:</strong> To manage and enforce your data sharing permissions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Audit & Compliance:</strong> To maintain blockchain-verified audit trails and comply with regulations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Platform Improvement:</strong> To analyze usage patterns and enhance user experience</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Communication:</strong> To send important updates, security alerts, and notifications</span>
                    </li>
                  </ul>
                </div>
              </UX4GCardContent>
            </UX4GCard>

            {/* Data Security */}
            <UX4GCard>
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Shield className="h-6 w-6 text-primary" />
                    Data Security
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    We implement comprehensive security measures to protect your information:
                  </p>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Encryption:</strong> End-to-end encryption for all data transmissions and storage</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Blockchain:</strong> Immutable audit trails and tamper-proof record keeping</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Access Controls:</strong> Role-based permissions and multi-factor authentication</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Regular Audits:</strong> Periodic security assessments and vulnerability testing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>HIPAA Compliance:</strong> Full adherence to health information privacy regulations</span>
                    </li>
                  </ul>
                </div>
              </UX4GCardContent>
            </UX4GCard>

            {/* Your Rights */}
            <UX4GCard>
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-primary" />
                    Your Rights
                  </h2>
                  <p className="text-muted-foreground mb-4">You have the following rights regarding your data:</p>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Access:</strong> View all your personal and health information at any time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Correction:</strong> Update or correct inaccurate information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Portability:</strong> Export your data in standard formats</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Consent Control:</strong> Manage who can access your health records</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Audit Visibility:</strong> View complete history of data access and modifications</span>
                    </li>
                  </ul>
                </div>
              </UX4GCardContent>
            </UX4GCard>

            {/* Data Sharing */}
            <UX4GCard>
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <AlertCircle className="h-6 w-6 text-primary" />
                    Data Sharing
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    We do NOT sell your personal or health information. We only share your data in the following circumstances:
                  </p>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>With Your Consent:</strong> Healthcare providers you explicitly authorize</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Legal Requirements:</strong> When required by law or court order</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Service Providers:</strong> Trusted partners who help operate our platform (under strict confidentiality)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Emergency Situations:</strong> To protect your health in life-threatening situations</span>
                    </li>
                  </ul>
                </div>
              </UX4GCardContent>
            </UX4GCard>

            {/* Contact */}
            <UX4GCard className="border-2 border-primary/20">
              <UX4GCardContent className="pt-6">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Mail className="h-6 w-6 text-primary" />
                    Contact Us
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    If you have questions about this Privacy Policy or your data rights, please contact us:
                  </p>
                  <div className="space-y-2 text-muted-foreground">
                    <p><strong>Email:</strong> <a href="mailto:privacy@healthlinkpro.gov.in" className="text-primary hover:underline">privacy@healthlinkpro.gov.in</a></p>
                    <p><strong>Phone:</strong> 1800-XXX-XXXX (Toll Free)</p>
                    <p><strong>Address:</strong> Ministry of Health & Family Welfare, Nirman Bhawan, New Delhi - 110011</p>
                  </div>
                  <div className="mt-6 pt-6 border-t">
                    <p className="text-sm text-muted-foreground">
                      For general support inquiries, please visit our{' '}
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
