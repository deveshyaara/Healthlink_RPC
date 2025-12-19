import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, FileText, Users, Lock, Heart, Stethoscope } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Features | HealthLink',
  description: 'Discover the powerful features of HealthLink - secure, blockchain-based healthcare management platform.',
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Powerful Features for
            <span className="text-blue-600 block">Modern Healthcare</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            HealthLink combines blockchain security with intuitive design to provide
            comprehensive healthcare management for patients, doctors, and administrators.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/signup">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Shield className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Blockchain Security</CardTitle>
              <CardDescription>
                Immutable, encrypted medical records stored on Ethereum blockchain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• AES-256-GCM encryption</li>
                <li>• SHA-256 content addressing</li>
                <li>• HIPAA compliant storage</li>
                <li>• Tamper-proof audit trails</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <FileText className="h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Medical Records</CardTitle>
              <CardDescription>
                Complete digital health record management with file uploads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Lab reports & prescriptions</li>
                <li>• X-rays, MRIs, CT scans</li>
                <li>• Consultation notes</li>
                <li>• Vaccination records</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Role-Based Access</CardTitle>
              <CardDescription>
                Secure access control for patients, doctors, and administrators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Patient data privacy</li>
                <li>• Doctor-patient consent</li>
                <li>• Admin oversight</li>
                <li>• Granular permissions</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Lock className="h-12 w-12 text-red-600 mb-4" />
              <CardTitle>Data Privacy</CardTitle>
              <CardDescription>
                Advanced privacy controls and consent management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Patient consent required</li>
                <li>• Data sharing controls</li>
                <li>• Privacy audit logs</li>
                <li>• GDPR compliant</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Heart className="h-12 w-12 text-pink-600 mb-4" />
              <CardTitle>Patient Portal</CardTitle>
              <CardDescription>
                Easy-to-use interface for managing personal health data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Upload medical documents</li>
                <li>• View health history</li>
                <li>• Manage appointments</li>
                <li>• Track prescriptions</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Stethoscope className="h-12 w-12 text-teal-600 mb-4" />
              <CardTitle>Doctor Dashboard</CardTitle>
              <CardDescription>
                Comprehensive tools for healthcare professionals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Patient record access</li>
                <li>• Prescription management</li>
                <li>• Appointment scheduling</li>
                <li>• Medical history review</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-lg p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Healthcare?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Join thousands of healthcare professionals and patients who trust HealthLink
            with their most sensitive medical data.
          </p>
          <Button size="lg" asChild>
            <Link href="/signup">Start Your Free Trial</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
