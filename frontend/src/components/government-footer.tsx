/**
 * Government Footer Component
 * Compliant with Indian Government UX guidelines
 */

'use client';

import Link from 'next/link';
import { Shield, FileText, Mail, Phone, MapPin } from 'lucide-react';

export function GovernmentFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-900 text-neutral-200 border-t-4 border-government-saffron">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">About HealthLink Pro</h3>
            <p className="text-sm text-neutral-300 mb-4">
              A secure, patient-controlled health data exchange platform ensuring privacy and seamless healthcare collaboration.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-government-green" />
              <span>HIPAA Compliant</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-government-blue transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-government-blue transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-government-blue transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-government-blue transition-colors">
                  Support
                </Link>
              </li>
              <li>
                <Link href="/sitemap" className="hover:text-government-blue transition-colors">
                  Sitemap
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Legal & Compliance</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy-policy" className="hover:text-government-blue transition-colors flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="hover:text-government-blue transition-colors flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/data-protection" className="hover:text-government-blue transition-colors flex items-center gap-2">
                  <Shield className="h-3 w-3" />
                  Data Protection
                </Link>
              </li>
              <li>
                <Link href="/accessibility" className="hover:text-government-blue transition-colors">
                  Accessibility Statement
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="hover:text-government-blue transition-colors">
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                <span>Ministry of Health & Family Welfare<br />Nirman Bhawan, New Delhi - 110011</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a href="tel:1800-XXX-XXXX" className="hover:text-government-blue transition-colors">
                  1800-XXX-XXXX (Toll Free)
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:support@healthlinkpro.gov.in" className="hover:text-government-blue transition-colors">
                  support@healthlinkpro.gov.in
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Government Links Bar */}
      <div className="bg-neutral-950 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-6 text-xs text-neutral-400">
            <a
              href="https://www.india.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-government-blue transition-colors"
            >
              India.gov.in
            </a>
            <a
              href="https://www.mygov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-government-blue transition-colors"
            >
              MyGov.in
            </a>
            <a
              href="https://www.digitalindia.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-government-blue transition-colors"
            >
              Digital India
            </a>
            <a
              href="https://www.data.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-government-blue transition-colors"
            >
              Data.gov.in
            </a>
            <a
              href="https://www.abdm.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-government-blue transition-colors"
            >
              Ayushman Bharat Digital Mission
            </a>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="bg-government-blue py-3">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-white">
            <p>
              © {currentYear} HealthLink Pro. All rights reserved. | A Government of India Initiative
            </p>
            <p>
              Last Updated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Accessibility Statement */}
      <div className="sr-only">
        This website is designed to be accessible to all users including those using assistive technologies.
        For any accessibility issues, please contact us at accessibility@healthlinkpro.gov.in
      </div>
    </footer>
  );
}
