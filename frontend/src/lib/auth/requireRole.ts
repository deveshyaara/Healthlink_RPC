import { User } from '@/contexts/auth-context';

export function requireRole(user: User | null, requiredRole: string): boolean {
  if (!user) return false;

  const userRole = user.role;
  if (!userRole) return false;

  // Convert to uppercase for comparison
  const normalizedUserRole = userRole.toUpperCase();
  const normalizedRequiredRole = requiredRole.toUpperCase();

  return normalizedUserRole === normalizedRequiredRole;
}