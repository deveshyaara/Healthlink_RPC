"use client";

import { useState, useEffect } from "react";
import { UX4GCard, UX4GCardContent, UX4GCardHeader, UX4GCardTitle } from "@/components/ui/ux4g-card";
import { UX4GBadge } from "@/components/ui/ux4g-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, UserPlus, Search, Filter, MoreHorizontal, Shield, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  createdAt: string;
  isActive: boolean;
}

export default function UserManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "patient" as 'patient' | 'doctor' | 'admin'
  });

  // Mock data for demonstration - in real app, this would come from API
  useEffect(() => {
    const mockUsers: User[] = [
      {
        id: "1",
        name: "John Doe",
        email: "john.doe@example.com",
        role: "patient",
        createdAt: "2024-01-15",
        isActive: true
      },
      {
        id: "2",
        name: "Dr. Sarah Johnson",
        email: "sarah.johnson@hospital.com",
        role: "doctor",
        createdAt: "2024-01-10",
        isActive: true
      },
      {
        id: "3",
        name: "Admin User",
        email: "admin@healthlink.com",
        role: "admin",
        createdAt: "2024-01-01",
        isActive: true
      }
    ];

    setTimeout(() => {
      setUsers(mockUsers);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // In real app, this would call an API
      const createdUser: User = {
        id: Date.now().toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: new Date().toISOString().split('T')[0],
        isActive: true
      };

      setUsers(prev => [...prev, createdUser]);
      setNewUser({ name: "", email: "", password: "", role: "patient" });
      setIsCreateDialogOpen(false);

      toast({
        title: "User Created",
        description: `${createdUser.name} has been added successfully`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'doctor': return 'primary';
      case 'patient': return 'info';
      default: return 'secondary';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Shield;
      case 'doctor': return UserCheck;
      case 'patient': return Users;
      default: return Users;
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-government-navy dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-government-navy/70 dark:text-neutral-300">
            You don&apos;t have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-government-navy dark:text-white">
            User Management
          </h1>
          <p className="text-government-navy/70 dark:text-neutral-300 mt-1">
            Manage users, roles, and permissions across the platform
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-government-blue hover:bg-government-blue/90">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the HealthLink Pro platform
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <Select value={newUser.role} onValueChange={(value: string) => setNewUser(prev => ({ ...prev, role: value as 'patient' | 'doctor' | 'admin' }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="doctor">Healthcare Professional</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} className="bg-government-blue hover:bg-government-blue/90">
                  Create User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UX4GCard>
          <UX4GCardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-government-blue" />
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </UX4GCardContent>
        </UX4GCard>

        <UX4GCard>
          <UX4GCardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'doctor').length}</p>
                <p className="text-sm text-muted-foreground">Doctors</p>
              </div>
            </div>
          </UX4GCardContent>
        </UX4GCard>

        <UX4GCard>
          <UX4GCardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'patient').length}</p>
                <p className="text-sm text-muted-foreground">Patients</p>
              </div>
            </div>
          </UX4GCardContent>
        </UX4GCard>

        <UX4GCard>
          <UX4GCardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </div>
          </UX4GCardContent>
        </UX4GCard>
      </div>

      {/* Filters and Search */}
      <UX4GCard>
        <UX4GCardHeader>
          <UX4GCardTitle>User Directory</UX4GCardTitle>
        </UX4GCardHeader>
        <UX4GCardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Administrators</SelectItem>
                <SelectItem value="doctor">Doctors</SelectItem>
                <SelectItem value="patient">Patients</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const RoleIcon = getRoleIcon(user.role);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <UX4GBadge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {user.role}
                        </UX4GBadge>
                      </TableCell>
                      <TableCell>
                        <UX4GBadge variant={user.isActive ? "success" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </UX4GBadge>
                      </TableCell>
                      <TableCell>{user.createdAt}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {filteredUsers.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your criteria.
            </div>
          )}
        </UX4GCardContent>
      </UX4GCard>
    </div>
  );
}