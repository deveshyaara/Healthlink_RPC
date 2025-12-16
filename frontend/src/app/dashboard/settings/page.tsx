'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from '@/components/theme-provider';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { safeStorage } from '@/lib/safe-storage';

export default function SettingsPage() {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState({
    name: 'Current User',
    email: 'user@example.com',
  });
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    auditAlerts: true,
    consentRequests: true,
  });
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    sessionTimeout: '30',
  });
  const [saving, setSaving] = useState(false);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      safeStorage.setJSON('userProfile', profileData);
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationsSave = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      safeStorage.setJSON('notificationSettings', notifications);
      toast({
        title: 'Notifications Updated',
        description: 'Your notification preferences have been saved.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update notifications. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSecuritySave = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      safeStorage.setJSON('securitySettings', security);
      toast({
        title: 'Security Settings Updated',
        description: 'Your security preferences have been saved.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update security settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Load saved settings on component mount with safe JSON parsing
  useEffect(() => {
    const defaultProfile = { name: 'Current User', email: 'user@example.com' };
    const defaultNotifications = {
      emailNotifications: true,
      smsNotifications: false,
      auditAlerts: true,
      consentRequests: true,
    };
    const defaultSecurity = { twoFactorEnabled: false, sessionTimeout: '30' };

    const savedProfile = safeStorage.getJSON('userProfile', defaultProfile);
    const savedNotifications = safeStorage.getJSON('notificationSettings', defaultNotifications);
    const savedSecurity = safeStorage.getJSON('securitySettings', defaultSecurity);

    setProfileData(savedProfile);
    setNotifications(savedNotifications);
    setSecurity(savedSecurity);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                This is how others will see you on the site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  disabled
                />
                <p className="text-sm text-muted-foreground">Email cannot be changed. Contact support if needed.</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleProfileSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Manage your account&apos;s security settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  value={security.sessionTimeout}
                  onChange={(e) => setSecurity(prev => ({ ...prev, sessionTimeout: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <h3 className="font-medium">Two-Factor Authentication (2FA)</h3>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                </div>
                <Switch
                  id="two-factor"
                  checked={security.twoFactorEnabled}
                  onCheckedChange={(checked) =>
                    setSecurity(prev => ({ ...prev, twoFactorEnabled: checked }))
                  }
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSecuritySave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Security Settings'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Manage how you receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                <div>
                  <h3 className="font-medium">Access Requests</h3>
                  <p className="text-sm text-muted-foreground">
                        Notify me when someone requests access to my records.
                  </p>
                </div>
                <Switch id="access-requests" defaultChecked />
              </div>
              <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                <div>
                  <h3 className="font-medium">Consent Updates</h3>
                  <p className="text-sm text-muted-foreground">
                        Notify me when a consent is granted, revoked, or expires.
                  </p>
                </div>
                <Switch id="consent-updates" defaultChecked />
              </div>
              <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                <div>
                  <h3 className="font-medium">Security Alerts</h3>
                  <p className="text-sm text-muted-foreground">
                        Receive alerts for unusual account activity.
                  </p>
                </div>
                <Switch id="security-alerts" defaultChecked />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleNotificationsSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">Select the theme for the dashboard.</p>
                <div className="flex items-center space-x-2 rounded-lg border p-4">
                  <ThemeToggle/>
                  <p className="font-medium capitalize">Current theme: {theme}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
