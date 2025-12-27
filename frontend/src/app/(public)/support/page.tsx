'use client';

import { UX4GCard, UX4GCardContent, UX4GCardHeader, UX4GCardTitle } from '@/components/ui/ux4g-card';
import { UX4GButton } from '@/components/ui/ux4g-button';
import { UX4GBadge } from '@/components/ui/ux4g-badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, MessageCircle, FileText, HelpCircle, Clock, Send } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

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

export default function SupportPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: 'Message Sent!',
      description: 'We\'ll get back to you within 24 hours.',
    });

    setFormData({
      name: '',
      email: '',
      subject: '',
      category: '',
      message: '',
    });
    setIsSubmitting(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
                <MessageCircle className="h-3 w-3 mr-1" />
                Support Center
              </UX4GBadge>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-5xl md:text-6xl font-bold tracking-tight">
              How Can We{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Help You?
              </span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our dedicated support team is here to assist you with any questions or concerns about HealthLink Pro.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-20"
          >
            {[
              {
                icon: Phone,
                title: 'Call Us',
                info: '1800-XXX-XXXX',
                subInfo: 'Toll Free',
                color: 'text-blue-500',
                bg: 'bg-blue-500/10',
                href: 'tel:1800-XXX-XXXX',
              },
              {
                icon: Mail,
                title: 'Email Us',
                info: 'support@healthlinkpro.gov.in',
                subInfo: '24h response time',
                color: 'text-green-500',
                bg: 'bg-green-500/10',
                href: 'mailto:support@healthlinkpro.gov.in',
              },
              {
                icon: MapPin,
                title: 'Visit Us',
                info: 'Ministry of Health',
                subInfo: 'New Delhi - 110011',
                color: 'text-purple-500',
                bg: 'bg-purple-500/10',
              },
              {
                icon: Clock,
                title: 'Working Hours',
                info: 'Mon - Fri: 9AM - 6PM',
                subInfo: 'Sat: 10AM - 2PM',
                color: 'text-orange-500',
                bg: 'bg-orange-500/10',
              },
            ].map((contact, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <UX4GCard className="h-full text-center group hover:shadow-xl transition-shadow">
                  <UX4GCardHeader>
                    <div className={`h-16 w-16 rounded-2xl ${contact.bg} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                      <contact.icon className={`h-8 w-8 ${contact.color}`} />
                    </div>
                    <UX4GCardTitle className="text-lg">{contact.title}</UX4GCardTitle>
                  </UX4GCardHeader>
                  <UX4GCardContent>
                    {contact.href ? (
                      <a href={contact.href} className="text-muted-foreground hover:text-primary transition-colors">
                        <div className="font-semibold mb-1">{contact.info}</div>
                        <div className="text-sm">{contact.subInfo}</div>
                      </a>
                    ) : (
                      <>
                        <div className="font-semibold mb-1 text-muted-foreground">{contact.info}</div>
                        <div className="text-sm text-muted-foreground">{contact.subInfo}</div>
                      </>
                    )}
                  </UX4GCardContent>
                </UX4GCard>
              </motion.div>
            ))}
          </motion.div>

          {/* Contact Form and FAQ */}
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <UX4GCard>
                <UX4GCardHeader>
                  <UX4GCardTitle className="text-2xl flex items-center gap-2">
                    <Send className="h-6 w-6 text-primary" />
                    Send Us a Message
                  </UX4GCardTitle>
                </UX4GCardHeader>
                <UX4GCardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="Rahul Sharma"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select value={formData.category} onValueChange={(value) => handleChange('category', value)} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">Technical Support</SelectItem>
                          <SelectItem value="account">Account Issues</SelectItem>
                          <SelectItem value="billing">Billing Questions</SelectItem>
                          <SelectItem value="feature">Feature Request</SelectItem>
                          <SelectItem value="feedback">General Feedback</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        placeholder="Brief description of your issue"
                        value={formData.subject}
                        onChange={(e) => handleChange('subject', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        placeholder="Please provide details about your question or concern..."
                        rows={6}
                        value={formData.message}
                        onChange={(e) => handleChange('message', e.target.value)}
                        required
                      />
                    </div>

                    <UX4GButton type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                      <Send className="ml-2 h-4 w-4" />
                    </UX4GButton>
                  </form>
                </UX4GCardContent>
              </UX4GCard>
            </motion.div>

            {/* FAQ Section */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <UX4GCard>
                <UX4GCardHeader>
                  <UX4GCardTitle className="text-2xl flex items-center gap-2">
                    <HelpCircle className="h-6 w-6 text-primary" />
                    Frequently Asked Questions
                  </UX4GCardTitle>
                </UX4GCardHeader>
                <UX4GCardContent className="space-y-6">
                  {[
                    {
                      q: 'How do I create an account?',
                      a: 'Click on "Sign Up" and follow the registration process. You\'ll need to verify your email and complete your profile.',
                    },
                    {
                      q: 'Is my health data secure?',
                      a: 'Yes! We use end-to-end encryption and blockchain technology to ensure your data is always secure and private.',
                    },
                    {
                      q: 'How do I share records with my doctor?',
                      a: 'Go to Consent Management, select the records you want to share, and send a consent request to your healthcare provider.',
                    },
                    {
                      q: 'Can I access my records from mobile?',
                      a: 'Yes, HealthLink Pro is fully responsive and works on all devices including smartphones and tablets.',
                    },
                    {
                      q: 'What if I forget my password?',
                      a: 'Click "Forgot Password" on the login page. We\'ll send you instructions to reset it via email.',
                    },
                  ].map((faq, index) => (
                    <div key={index} className="border-l-4 border-primary/30 pl-4 hover:border-primary transition-colors">
                      <h4 className="font-semibold mb-2 text-foreground">{faq.q}</h4>
                      <p className="text-sm text-muted-foreground">{faq.a}</p>
                    </div>
                  ))}

                  <div className="pt-4 border-t">
                    <Link href="/faq" className="text-primary hover:underline flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      View All FAQs
                    </Link>
                  </div>
                </UX4GCardContent>
              </UX4GCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Additional Resources */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Additional Resources</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find more information and helpful resources
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                title: 'Documentation',
                desc: 'Comprehensive guides and tutorials',
                icon: FileText,
                href: '/docs',
              },
              {
                title: 'FAQ',
                desc: 'Answers to common questions',
                icon: HelpCircle,
                href: '/faq',
              },
              {
                title: 'Privacy Policy',
                desc: 'Learn how we protect your data',
                icon: FileText,
                href: '/privacy-policy',
              },
            ].map((resource, index) => (
              <Link key={index} href={resource.href}>
                <UX4GCard className="h-full hover:shadow-lg transition-shadow group">
                  <UX4GCardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <resource.icon className="h-6 w-6 text-primary" />
                    </div>
                    <UX4GCardTitle className="text-lg">{resource.title}</UX4GCardTitle>
                  </UX4GCardHeader>
                  <UX4GCardContent>
                    <p className="text-sm text-muted-foreground">{resource.desc}</p>
                  </UX4GCardContent>
                </UX4GCard>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
