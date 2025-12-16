'use client';

import { UX4GCard, UX4GCardContent, UX4GCardHeader, UX4GCardTitle } from '@/components/ui/ux4g-card';
import { UX4GBadge } from '@/components/ui/ux4g-badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion } from 'framer-motion';
import { HelpCircle, Shield, Users, FileText, Lock, Zap, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export default function FAQPage() {
  const categories = [
    {
      title: 'Getting Started',
      icon: Zap,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      faqs: [
        {
          question: 'How do I create an account on HealthLink Pro?',
          answer: 'Click on the "Sign Up" button on the homepage. Choose your role (Patient or Doctor), fill in your details, verify your email, and complete your profile. For doctors, you\'ll need to provide your medical registration number for verification.',
        },
        {
          question: 'What do I need to get started?',
          answer: 'You need a valid email address, MetaMask wallet extension installed in your browser, and your Aadhaar number for identity verification. Doctors additionally need their medical registration number.',
        },
        {
          question: 'Is HealthLink Pro free to use?',
          answer: 'Basic features are free for all users. Some advanced features may require subscription plans. Blockchain transaction fees (gas fees) apply for certain operations.',
        },
        {
          question: 'What browsers are supported?',
          answer: 'HealthLink Pro works best on modern browsers including Chrome, Firefox, Edge, and Safari. Make sure you have MetaMask extension installed for blockchain features.',
        },
      ],
    },
    {
      title: 'Security & Privacy',
      icon: Shield,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      faqs: [
        {
          question: 'How secure is my health data?',
          answer: 'Your data is secured using end-to-end encryption, blockchain technology for audit trails, and HIPAA-compliant storage. We use industry-standard security protocols and never share your data without your explicit consent.',
        },
        {
          question: 'Who can access my medical records?',
          answer: 'Only you and healthcare providers you explicitly grant consent to can access your records. You have complete control over who sees what information and for how long.',
        },
        {
          question: 'Can I revoke access to my records?',
          answer: 'Yes, absolutely. You can revoke consent at any time from the Consent Management section of your dashboard. Revocation is immediate and recorded on the blockchain.',
        },
        {
          question: 'Is HealthLink Pro HIPAA compliant?',
          answer: 'Yes, HealthLink Pro is fully HIPAA compliant. We follow all regulations regarding health information privacy and security, including data encryption, access controls, and audit logging.',
        },
        {
          question: 'What happens if I forget my password?',
          answer: 'Use the "Forgot Password" link on the login page. We\'ll send a password reset link to your registered email. Your health data remains secure throughout the process.',
        },
      ],
    },
    {
      title: 'Using the Platform',
      icon: Users,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      faqs: [
        {
          question: 'How do I share my records with a doctor?',
          answer: 'Go to Consent Management, click "Grant Consent", enter the doctor\'s wallet address or email, select which records to share, and set the expiry date. The doctor will receive a notification once approved.',
        },
        {
          question: 'How do I upload my medical records?',
          answer: 'Navigate to "My Records" in your dashboard, click "Upload Record", fill in the details, select the file, and submit. Supported formats include PDF, JPEG, PNG, and DICOM.',
        },
        {
          question: 'Can I view my prescription history?',
          answer: 'Yes, go to the "Prescriptions" section in your dashboard to view all prescriptions issued to you, including medication details, dosage, and prescribing doctor information.',
        },
        {
          question: 'How do doctors add new prescriptions?',
          answer: 'Doctors can create prescriptions from the "Prescriptions" page by selecting the patient, entering medication details, dosage, and instructions, then submitting to the blockchain.',
        },
        {
          question: 'What is the Audit Trail?',
          answer: 'The Audit Trail shows a complete history of all actions performed on your account, including record access, consent grants/revokes, and data modifications. All entries are blockchain-verified and tamper-proof.',
        },
      ],
    },
    {
      title: 'Technical Questions',
      icon: Lock,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      faqs: [
        {
          question: 'What is blockchain and why do you use it?',
          answer: 'Blockchain is a secure, distributed ledger technology that creates an immutable record of all transactions. We use it to ensure data integrity, create tamper-proof audit trails, and enable transparent consent management.',
        },
        {
          question: 'What is MetaMask and do I need it?',
          answer: 'MetaMask is a cryptocurrency wallet that enables blockchain interactions. Yes, you need it to use HealthLink Pro\'s blockchain features. It\'s free and can be installed as a browser extension.',
        },
        {
          question: 'What are gas fees?',
          answer: 'Gas fees are small transaction costs required for blockchain operations. They pay for the computational power needed to process and validate transactions on the network.',
        },
        {
          question: 'Can I use HealthLink Pro on mobile?',
          answer: 'Yes, HealthLink Pro is fully responsive and works on mobile browsers. We recommend using MetaMask\'s mobile app for the best blockchain experience on mobile devices.',
        },
        {
          question: 'What file formats are supported for records?',
          answer: 'We support PDF, JPEG, PNG, and DICOM files for medical records. Maximum file size is 10MB per file. For larger files, consider compressing or splitting them.',
        },
      ],
    },
    {
      title: 'Account & Billing',
      icon: FileText,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      faqs: [
        {
          question: 'How do I update my profile information?',
          answer: 'Go to Settings in your dashboard, update your information in the Profile section, and click Save. Changes to email or phone number require verification.',
        },
        {
          question: 'Can I delete my account?',
          answer: 'Yes, you can request account deletion from Settings. Note that some data may be retained for legal compliance and audit purposes. Blockchain records are permanent.',
        },
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept major credit/debit cards, UPI, net banking, and digital wallets. All payments are processed securely through our payment gateway partners.',
        },
        {
          question: 'Can I export my data?',
          answer: 'Yes, you can export all your health records and data at any time from the Settings page. We provide data in standard formats for easy portability.',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-4xl mx-auto text-center space-y-6"
          >
            <motion.div variants={fadeInUp}>
              <UX4GBadge variant="info" className="mb-4">
                <HelpCircle className="h-3 w-3 mr-1" />
                Frequently Asked Questions
              </UX4GBadge>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-5xl md:text-6xl font-bold tracking-tight">
              We&apos;re Here to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Help You
              </span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Find answers to common questions about HealthLink Pro. Can&apos;t find what you&apos;re looking for?{' '}
              <Link href="/support" className="text-primary hover:underline">
                Contact our support team
              </Link>
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="space-y-12">
            {categories.map((category, categoryIndex) => (
              <motion.div
                key={categoryIndex}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: categoryIndex * 0.1 }}
              >
                <UX4GCard>
                  <UX4GCardHeader>
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-xl ${category.bg} flex items-center justify-center`}>
                        <category.icon className={`h-6 w-6 ${category.color}`} />
                      </div>
                      <UX4GCardTitle className="text-2xl">{category.title}</UX4GCardTitle>
                    </div>
                  </UX4GCardHeader>
                  <UX4GCardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {category.faqs.map((faq, faqIndex) => (
                        <AccordionItem key={faqIndex} value={`item-${categoryIndex}-${faqIndex}`}>
                          <AccordionTrigger className="text-left hover:text-primary">
                            <span className="flex items-start gap-2">
                              <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                              <span>{faq.question}</span>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground pl-7">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </UX4GCardContent>
                </UX4GCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl font-bold mb-4">Still Have Questions?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Our support team is ready to help you with any questions or concerns.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/support"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <HelpCircle className="mr-2 h-5 w-5" />
                Contact Support
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center px-6 py-3 border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
              >
                <FileText className="mr-2 h-5 w-5" />
                Learn More About Us
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
