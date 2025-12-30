'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Users,
    Flag,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Search,
    Shield,
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    isVerified: boolean;
    flagged: boolean;
    flaggedReason?: string;
    flaggedAt?: string;
    createdAt: string;
    lastLogin?: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [flagDialogOpen, setFlagDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [flagReason, setFlagReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/v1/admin/users');
            const data = await response.json();

            if (data.success) {
                setUsers(data.data || []);
            } else {
                toast.error('Failed to load users');
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleFlagUser = (user: User) => {
        setSelectedUser(user);
        setFlagReason('');
        setFlagDialogOpen(true);
    };

    const submitFlag = async () => {
        if (!selectedUser || !flagReason.trim()) {
            toast.error('Please provide a reason for flagging');
            return;
        }

        try {
            setSubmitting(true);
            const response = await fetch(`/api/v1/admin/users/${selectedUser.id}/flag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: flagReason }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success('User flagged successfully');
                setFlagDialogOpen(false);
                loadUsers(); // Reload users
            } else {
                toast.error(data.error || 'Failed to flag user');
            }
        } catch (error) {
            console.error('Failed to flag user:', error);
            toast.error('Failed to flag user');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUnflagUser = async (userId: string) => {
        if (!confirm('Are you sure you want to unflag this user?')) return;

        try {
            const response = await fetch(`/api/v1/admin/users/${userId}/unflag`, {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success) {
                toast.success('User unflagged successfully');
                loadUsers(); // Reload users
            } else {
                toast.error(data.error || 'Failed to unflag user');
            }
        } catch (error) {
            console.error('Failed to unflag user:', error);
            toast.error('Failed to unflag user');
        }
    };

    const filteredUsers = users.filter(user => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            user.email?.toLowerCase().includes(search) ||
            user.name?.toLowerCase().includes(search) ||
            user.role?.toLowerCase().includes(search)
        );
    });

    const stats = {
        total: users.length,
        active: users.filter(u => u.isActive).length,
        flagged: users.filter(u => u.flagged).length,
        verified: users.filter(u => u.isVerified).length,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Users className="h-8 w-8 text-blue-500" />
                    User Management
                </h1>
                <p className="text-muted-foreground mt-1">
                    Manage user accounts, permissions, and security flags
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Flagged</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.flagged}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Verified</CardTitle>
                        <Shield className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.verified}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>View and manage all user accounts</CardDescription>
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by email, name, or role..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Joined</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-muted/20">
                                            <td className="px-4 py-3 text-sm">
                                                <div className="font-medium">{user.name}</div>
                                                <div className="text-xs text-muted-foreground">{user.email}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <Badge variant="outline">{user.role}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex flex-col gap-1">
                                                    {user.isActive ? (
                                                        <Badge variant="secondary" className="text-green-600">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive">
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Inactive
                                                        </Badge>
                                                    )}
                                                    {user.flagged && (
                                                        <Badge variant="destructive">
                                                            <Flag className="h-3 w-3 mr-1" />
                                                            Flagged
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {user.flagged ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleUnflagUser(user.id)}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Unflag
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleFlagUser(user)}
                                                    >
                                                        <Flag className="h-4 w-4 mr-1" />
                                                        Flag
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Flag User Dialog */}
            <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Flag User Account</DialogTitle>
                        <DialogDescription>
                            Flag {selectedUser?.name} ({selectedUser?.email}) for suspicious activity
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Reason for flagging *</label>
                            <Textarea
                                placeholder="Describe why this account is being flagged..."
                                value={flagReason}
                                onChange={(e) => setFlagReason(e.target.value)}
                                rows={4}
                                className="mt-2"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setFlagDialogOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={submitFlag}
                            disabled={submitting || !flagReason.trim()}
                        >
                            {submitting ? 'Flagging...' : 'Flag User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
