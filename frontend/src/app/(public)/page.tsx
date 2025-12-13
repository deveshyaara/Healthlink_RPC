'use client';

import { UX4GButton } from '@/components/ui/ux4g-button';
import { UX4GCard, UX4GCardContent, UX4GCardHeader, UX4GCardTitle } from '@/components/ui/ux4g-card';
import { UX4GBadge } from '@/components/ui/ux4g-badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowRight, Lock, Share2, Stethoscope, Shield, FileText, Activity, CheckCircle, Zap, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { motion, useScroll, useTransform, Variants } from 'framer-motion';

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero');

  // Scroll hooks for parallax
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  // Show loading or redirect if authenticated
  if (loading || isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      <AnimatedBackground />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden perspective-1000">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              style={{ y: heroY, opacity: heroOpacity }}
              className="space-y-8"
            >
              <motion.div variants={fadeInUp}>
                <UX4GBadge variant="primary" className="mb-4 bg-primary/10 text-primary border-primary/20 backdrop-blur-sm">
                  <Shield className="h-3 w-3 mr-1" />
                  HealthLink Pro
                </UX4GBadge>

                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
                  Your Health Data, <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent animate-gradient-x">
                    Secured & Connected.
                  </span>
                </h1>
              </motion.div>

              <motion.p variants={fadeInUp} className="max-w-xl text-xl text-muted-foreground">
                HealthLink Pro provides a secure, HIPAA-compliant platform for patients, providers, and insurers to exchange health data with confidence and control.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
                <UX4GButton size="lg" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-lg shadow-primary/25 rounded-full px-8 h-12 text-lg transition-transform hover:scale-105" asChild>
                  <Link href="/signup">
                    Get Started for Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </UX4GButton>
                <UX4GButton size="lg" variant="secondary" className="rounded-full px-8 h-12 text-lg border-2 hover:bg-primary/5 transition-transform hover:scale-105" asChild>
                  <Link href="#features">Learn More</Link>
                </UX4GButton>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div variants={fadeInUp} className="flex flex-wrap gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <div className="p-1 rounded-full bg-green-500/10">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <span>HIPAA Compliant</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <div className="p-1 rounded-full bg-blue-500/10">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                  </div>
                  <span>End-to-End Encrypted</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <div className="p-1 rounded-full bg-purple-500/10">
                    <CheckCircle className="h-4 w-4 text-purple-500" />
                  </div>
                  <span>Patient Controlled</span>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateY: -30 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 1, delay: 0.2, type: 'spring' }}
              className="relative perspective-1000"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary to-accent rounded-[2rem] blur-3xl opacity-30 animate-pulse" />
              <motion.div
                whileHover={{ scale: 1.02, rotateY: 5 }}
                className="relative aspect-[4/3] rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 backdrop-blur-sm bg-white/5 transform-style-3d"
              >
                {heroImage && (
                  <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="transition-transform duration-700"
                    priority
                  />
                )}

                {/* Floating Cards with Parallax */}
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  whileHover={{ y: -5 }}
                  className="absolute bottom-8 left-8 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/20 max-w-[200px]"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div className="text-sm font-bold text-green-600">Secure</div>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-full animate-pulse" />
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            className="text-center space-y-4 mb-16"
          >
            <UX4GBadge variant="info" className="mb-2 bg-blue-500/10 text-blue-600 border-blue-200">Features</UX4GBadge>
            <h2 className="text-3xl md:text-5xl font-bold">
              A New Standard in <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Health Data Exchange</span>
            </h2>
            <p className="max-w-3xl mx-auto text-lg text-muted-foreground">
              Empowering every user with tools for seamless, secure, and transparent healthcare interactions.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: Lock,
                color: 'text-blue-500',
                bg: 'bg-blue-500/10',
                title: 'Secure Record Management',
                desc: 'Easily upload, manage, and version your health records with end-to-end encryption. Your data is protected at all times.',
              },
              {
                icon: Share2,
                color: 'text-purple-500',
                bg: 'bg-purple-500/10',
                title: 'Granular Consent Control',
                desc: 'You decide who sees your data, for how long, and for what purpose. Grant and revoke access with a single click.',
              },
              {
                icon: Stethoscope,
                color: 'text-teal-500',
                bg: 'bg-teal-500/10',
                title: 'Seamless Collaboration',
                desc: 'Connect with your care team and insurance providers efficiently, reducing administrative burden and improving care coordination.',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -10 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <UX4GCard className="h-full border-none shadow-lg bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 group overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <UX4GCardHeader>
                    <div className={`${feature.bg} p-4 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:rotate-3`}>
                      <feature.icon className={`h-8 w-8 ${feature.color}`} />
                    </div>
                    <UX4GCardTitle className="text-xl relative z-10">{feature.title}</UX4GCardTitle>
                  </UX4GCardHeader>
                  <UX4GCardContent>
                    <p className="text-muted-foreground leading-relaxed relative z-10">
                      {feature.desc}
                    </p>
                  </UX4GCardContent>
                </UX4GCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/90"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          >
            {[
              { value: '10K+', label: 'Active Users', icon: Users },
              { value: '500+', label: 'Healthcare Providers', icon: Stethoscope },
              { value: '1M+', label: 'Records Secured', icon: FileText },
              { value: '99.9%', label: 'Uptime SLA', icon: Zap },
            ].map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ scale: 1.05 }}
                className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors cursor-default"
              >
                <stat.icon className="h-8 w-8 mx-auto mb-4 opacity-80" />
                <div className="text-4xl md:text-5xl font-bold mb-2 tracking-tight">{stat.value}</div>
                <div className="text-sm font-medium opacity-90">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold">
              Why Choose HealthLink Pro?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {[
              {
                icon: Shield,
                title: 'Privacy First',
                desc: 'Patient-controlled access with granular permissions and complete audit trails.',
                color: 'text-blue-500',
                bg: 'bg-blue-500/10',
              },
              {
                icon: FileText,
                title: 'HIPAA Compliant',
                desc: 'Built from the ground up to meet healthcare data protection standards.',
                color: 'text-green-500',
                bg: 'bg-green-500/10',
              },
              {
                icon: Activity,
                title: 'Real-Time Access',
                desc: 'Instant access to your health records anytime, anywhere, on any device.',
                color: 'text-orange-500',
                bg: 'bg-orange-500/10',
              },
              {
                icon: CheckCircle,
                title: 'Easy Integration',
                desc: 'Seamlessly connects with existing healthcare systems and EHRs.',
                color: 'text-purple-500',
                bg: 'bg-purple-500/10',
              },
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="flex gap-6 group p-6 rounded-2xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className={`h-16 w-16 rounded-2xl ${benefit.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <benefit.icon className={`h-8 w-8 ${benefit.color}`} />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">{benefit.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {benefit.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-90" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Ready to Take Control?
            </h2>
            <p className="text-xl mb-10 text-white/90 max-w-2xl mx-auto">
              Join thousands of users who trust HealthLink Pro for secure health data management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <UX4GButton size="lg" variant="warning" className="bg-white text-primary hover:bg-white/90 rounded-full px-8 h-14 text-lg font-bold shadow-xl transform transition-transform hover:scale-105" asChild>
                <Link href="/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </UX4GButton>
              <UX4GButton size="lg" variant="secondary" className="bg-transparent border-2 border-white text-white hover:bg-white/10 rounded-full px-8 h-14 text-lg font-bold transform transition-transform hover:scale-105" asChild>
                <Link href="/login">Sign In</Link>
              </UX4GButton>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
