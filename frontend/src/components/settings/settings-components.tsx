'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Lock, Bell, Shield, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { userApi } from '@/lib/api-client';

export function ProfileSettings() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: '',
        bio: '',
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            await userApi.updateProfile({
                fullName: profile.name,
                phone: profile.phone,
            });
            toast.success('Profile Updated', {
                description: 'Your profile has been updated successfully',
            });
        } catch (error: any) {
            toast.error('Update Failed', {
                description: error.message || 'Failed to update profile. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                </CardTitle>
                <CardDescription>
                    Update your personal information and profile details
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        placeholder="Enter your full name"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        placeholder="email@example.com"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                        id="phone"
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input
                        id="bio"
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="Tell us about yourself"
                    />
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export function SecuritySettings() {
    const [loading, setLoading] = useState(false);
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: '',
    });

    const handleChangePassword = async () => {
        if (passwords.new !== passwords.confirm) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await userApi.changePassword({
                currentPassword: passwords.current,
                newPassword: passwords.new,
            });
            toast.success('Password Changed', {
                description: 'Your password has been updated successfully',
            });
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (error: any) {
            toast.error('Change Failed', {
                description: error.message || 'Failed to change password. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Security
                </CardTitle>
                <CardDescription>
                    Manage your password and security settings
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                        id="current-password"
                        type="password"
                        value={passwords.current}
                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                        placeholder="Enter current password"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                        id="new-password"
                        type="password"
                        value={passwords.new}
                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                        placeholder="Enter new password"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                        id="confirm-password"
                        type="password"
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                        placeholder="Confirm new password"
                    />
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleChangePassword} disabled={loading}>
                        <Lock className="mr-2 h-4 w-4" />
                        {loading ? 'Changing...' : 'Change Password'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export function NotificationSettings() {
    const [notifications, setNotifications] = useState({
        email: true,
        push: false,
        appointments: true,
        prescriptions: true,
        labResults: true,
        marketing: false,
    });

    const handleSave = async () => {
        try {
            await userApi.updatePreferences({
                emailNotifications: notifications.email,
                pushNotifications: notifications.push,
                appointmentReminders: notifications.appointments,
                prescriptionAlerts: notifications.prescriptions,
            });
            toast.success('Preferences Saved', {
                description: 'Your notification preferences have been updated',
            });
        } catch (error: any) {
            toast.error('Save Failed', {
                description: error.message || 'Failed to save preferences',
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notifications
                </CardTitle>
                <CardDescription>
                    Choose what notifications you want to receive
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Email Notifications</p>
                            <p className="text-sm text-muted-foreground">
                                Receive notifications via email
                            </p>
                        </div>
                        <Switch
                            checked={notifications.email}
                            onCheckedChange={(checked) =>
                                setNotifications({ ...notifications, email: checked })
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Push Notifications</p>
                            <p className="text-sm text-muted-foreground">
                                Receive push notifications
                            </p>
                        </div>
                        <Switch
                            checked={notifications.push}
                            onCheckedChange={(checked) =>
                                setNotifications({ ...notifications, push: checked })
                            }
                        />
                    </div>

                    <div className="border-t pt-4 space-y-4">
                        <p className="font-medium">Notification Types</p>

                        <div className="flex items-center justify-between pl-4">
                            <div>
                                <p className="text-sm">Appointments</p>
                                <p className="text-xs text-muted-foreground">
                                    Reminders and updates about appointments
                                </p>
                            </div>
                            <Switch
                                checked={notifications.appointments}
                                onCheckedChange={(checked) =>
                                    setNotifications({ ...notifications, appointments: checked })
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between pl-4">
                            <div>
                                <p className="text-sm">Prescriptions</p>
                                <p className="text-xs text-muted-foreground">
                                    New prescriptions and refill reminders
                                </p>
                            </div>
                            <Switch
                                checked={notifications.prescriptions}
                                onCheckedChange={(checked) =>
                                    setNotifications({ ...notifications, prescriptions: checked })
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between pl-4">
                            <div>
                                <p className="text-sm">Lab Results</p>
                                <p className="text-xs text-muted-foreground">
                                    When lab results are available
                                </p>
                            </div>
                            <Switch
                                checked={notifications.labResults}
                                onCheckedChange={(checked) =>
                                    setNotifications({ ...notifications, labResults: checked })
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between pl-4">
                            <div>
                                <p className="text-sm">Marketing</p>
                                <p className="text-xs text-muted-foreground">
                                    News, updates, and promotional content
                                </p>
                            </div>
                            <Switch
                                checked={notifications.marketing}
                                onCheckedChange={(checked) =>
                                    setNotifications({ ...notifications, marketing: checked })
                                }
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Preferences
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export function PrivacySettings() {
    const [privacy, setPrivacy] = useState({
        profileVisibility: 'private',
        dataSharing: false,
        analyticsTracking: true,
    });

    const handleSave = async () => {
        try {
            await userApi.updatePrivacy({
                profileVisibility: privacy.profileVisibility,
                shareDataWithResearch: privacy.dataSharing,
                allowMarketing: privacy.analyticsTracking,
            });
            toast.success('Privacy Settings Saved');
        } catch (error: any) {
            toast.error('Save Failed', {
                description: error.message || 'Failed to save privacy settings',
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacy
                </CardTitle>
                <CardDescription>
                    Manage your privacy and data sharing preferences
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Data Sharing</p>
                        <p className="text-sm text-muted-foreground">
                            Share anonymized data for research
                        </p>
                    </div>
                    <Switch
                        checked={privacy.dataSharing}
                        onCheckedChange={(checked) =>
                            setPrivacy({ ...privacy, dataSharing: checked })
                        }
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Analytics Tracking</p>
                        <p className="text-sm text-muted-foreground">
                            Help us improve by tracking usage
                        </p>
                    </div>
                    <Switch
                        checked={privacy.analyticsTracking}
                        onCheckedChange={(checked) =>
                            setPrivacy({ ...privacy, analyticsTracking: checked })
                        }
                    />
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Settings
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
