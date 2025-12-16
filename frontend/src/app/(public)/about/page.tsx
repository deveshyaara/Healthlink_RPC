'use client';

import { UX4GCard, UX4GCardContent, UX4GCardHeader, UX4GCardTitle } from '@/components/ui/ux4g-card';
import { UX4GButton } from '@/components/ui/ux4g-button';
import { UX4GBadge } from '@/components/ui/ux4g-badge';
import { motion } from 'framer-motion';
import { Shield, Users, Target, Award, Heart, Zap, Globe, Lock } from 'lucide-react';
import Link from 'next/link';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

export default function AboutPage() {
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
              <UX4GBadge variant="primary" className="mb-4">
                <Shield className="h-3 w-3 mr-1" />
                About HealthLink Pro
              </UX4GBadge>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-5xl md:text-6xl font-bold tracking-tight">
              Empowering Healthcare Through{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Secure Data Exchange
              </span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-xl text-muted-foreground max-w-3xl mx-auto">
              HealthLink Pro is revolutionizing healthcare by putting patients in control of their health data
              while ensuring seamless, secure collaboration between healthcare providers.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <UX4GCard className="h-full border-2 border-primary/20">
                <UX4GCardHeader>
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <UX4GCardTitle className="text-3xl">Our Mission</UX4GCardTitle>
                </UX4GCardHeader>
                <UX4GCardContent>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    To create a patient-centric healthcare ecosystem where health data is secure, accessible,
                    and interoperable, enabling better healthcare outcomes through seamless information exchange
                    while maintaining the highest standards of privacy and security.
                  </p>
                </UX4GCardContent>
              </UX4GCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <UX4GCard className="h-full border-2 border-secondary/20">
                <UX4GCardHeader>
                  <div className="h-16 w-16 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4">
                    <Zap className="h-8 w-8 text-secondary" />
                  </div>
                  <UX4GCardTitle className="text-3xl">Our Vision</UX4GCardTitle>
                </UX4GCardHeader>
                <UX4GCardContent>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    To be the leading platform for secure health data exchange, where every patient has complete
                    control over their health information, and healthcare providers can deliver coordinated,
                    efficient care powered by accurate, real-time data.
                  </p>
                </UX4GCardContent>
              </UX4GCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Our Core Values</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do at HealthLink Pro
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {[
              {
                icon: Shield,
                title: 'Privacy First',
                desc: 'Patient data protection is our top priority, ensuring HIPAA compliance and end-to-end encryption.',
                color: 'text-blue-500',
                bg: 'bg-blue-500/10',
              },
              {
                icon: Heart,
                title: 'Patient-Centric',
                desc: 'We put patients in control of their health data with granular consent management.',
                color: 'text-red-500',
                bg: 'bg-red-500/10',
              },
              {
                icon: Globe,
                title: 'Interoperability',
                desc: 'Seamless integration with healthcare systems for efficient data exchange.',
                color: 'text-green-500',
                bg: 'bg-green-500/10',
              },
              {
                icon: Lock,
                title: 'Trust & Transparency',
                desc: 'Complete audit trails and transparent operations build trust with all stakeholders.',
                color: 'text-purple-500',
                bg: 'bg-purple-500/10',
              },
            ].map((value, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <UX4GCard className="h-full text-center group hover:shadow-xl transition-shadow">
                  <UX4GCardHeader>
                    <div className={`h-16 w-16 rounded-2xl ${value.bg} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                      <value.icon className={`h-8 w-8 ${value.color}`} />
                    </div>
                    <UX4GCardTitle className="text-xl">{value.title}</UX4GCardTitle>
                  </UX4GCardHeader>
                  <UX4GCardContent>
                    <p className="text-muted-foreground">{value.desc}</p>
                  </UX4GCardContent>
                </UX4GCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">What Makes Us Different</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Cutting-edge technology meets healthcare excellence
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                title: 'Blockchain Security',
                desc: 'Leveraging blockchain technology for immutable audit trails and tamper-proof records.',
                icon: Award,
              },
              {
                title: 'Smart Contracts',
                desc: 'Automated consent management and access control using smart contracts.',
                icon: Zap,
              },
              {
                title: 'Real-Time Access',
                desc: 'Instant access to health records for authorized providers, improving care coordination.',
                icon: Users,
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 hover:shadow-lg transition-shadow h-full">
                  <feature.icon className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground text-lg">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-secondary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Join Our Healthcare Revolution
            </h2>
            <p className="text-xl mb-10 text-white/90 max-w-2xl mx-auto">
              Be part of a platform that&apos;s transforming healthcare through secure, patient-controlled data exchange.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <UX4GButton size="lg" variant="warning" className="bg-white text-primary hover:bg-white/90" asChild>
                <Link href="/signup">Get Started Free</Link>
              </UX4GButton>
              <UX4GButton size="lg" variant="secondary" className="bg-transparent border-2 border-white text-white hover:bg-white/10" asChild>
                <Link href="/support">Contact Us</Link>
              </UX4GButton>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
