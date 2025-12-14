/* eslint-disable no-console */
/**
 * Role Helpers - RBAC Utilities
 *
 * Converts bytes32 role hashes from smart contract to human-readable strings
 * Used for debugging and proper role checking throughout the app
 *
 * @module roleHelpers
 */

import { ethers } from 'ethers';

/**
 * Role hash constants from OpenZeppelin AccessControl
 * These are keccak256 hashes of role names
 */
export const ROLE_HASHES = {
  // DEFAULT_ADMIN_ROLE is 0x0000000000000000000000000000000000000000000000000000000000000000
  ADMIN: ethers.keccak256(ethers.toUtf8Bytes('ADMIN_ROLE')),
  DOCTOR: ethers.keccak256(ethers.toUtf8Bytes('DOCTOR_ROLE')),
  PATIENT: ethers.keccak256(ethers.toUtf8Bytes('PATIENT_ROLE')),
} as const;

/**
 * Reverse mapping: hash -> role name
 */
export const HASH_TO_ROLE: Record<string, 'ADMIN' | 'DOCTOR' | 'PATIENT'> = {
  [ROLE_HASHES.ADMIN]: 'ADMIN',
  [ROLE_HASHES.DOCTOR]: 'DOCTOR',
  [ROLE_HASHES.PATIENT]: 'PATIENT',
};

/**
 * Convert bytes32 role hash to human-readable string
 *
 * @param roleHash - The bytes32 role hash from contract
 * @returns Human-readable role name or 'UNKNOWN'
 *
 * @example
 * ```ts
 * const hash = '0x71f3d55856e4058ed06ee057d79ada615f65cdf5f9ee88181b914225088f834f';
 * const role = decodeRoleHash(hash); // 'DOCTOR'
 * ```
 */
export function decodeRoleHash(roleHash: string): 'ADMIN' | 'DOCTOR' | 'PATIENT' | 'UNKNOWN' {
  // Normalize hash to lowercase for comparison
  const normalizedHash = roleHash.toLowerCase();

  // Check if hash matches any known role
  for (const [hash, role] of Object.entries(HASH_TO_ROLE)) {
    if (hash.toLowerCase() === normalizedHash) {
      return role;
    }
  }

  return 'UNKNOWN';
}

/**
 * Convert human-readable role name to bytes32 hash
 *
 * @param roleName - Human-readable role name
 * @returns bytes32 role hash
 *
 * @example
 * ```ts
 * const hash = encodeRole('DOCTOR');
 * // Returns: '0x71f3d55856e4058ed06ee057d79ada615f65cdf5f9ee88181b914225088f834f'
 * ```
 */
export function encodeRole(roleName: 'ADMIN' | 'DOCTOR' | 'PATIENT'): string {
  return ROLE_HASHES[roleName];
}

/**
 * Check if a user has a specific role
 *
 * @param contract - The HealthLink contract instance
 * @param address - User's wallet address
 * @param roleName - Role to check ('ADMIN', 'DOCTOR', or 'PATIENT')
 * @returns Promise<boolean> - True if user has the role
 *
 * @example
 * ```ts
 * const hasRole = await checkUserRole(contract, '0x123...', 'DOCTOR');
 * if (hasRole) {
 *   console.log('User is a doctor!');
 * }
 * ```
 */
export async function checkUserRole(
  contract: ethers.Contract,
  address: string,
  roleName: 'ADMIN' | 'DOCTOR' | 'PATIENT'
): Promise<boolean> {
  try {
    const roleHash = encodeRole(roleName);
    const hasRole = await contract.hasRole(roleHash, address);
    return Boolean(hasRole);
  } catch (error) {
    console.error(`Failed to check role ${roleName} for ${address}:`, error);
    return false;
  }
}

/**
 * Get all roles for a user
 *
 * @param contract - The HealthLink contract instance
 * @param address - User's wallet address
 * @returns Promise<string[]> - Array of role names user has
 *
 * @example
 * ```ts
 * const roles = await getAllUserRoles(contract, '0x123...');
 * console.log(roles); // ['DOCTOR', 'PATIENT']
 * ```
 */
export async function getAllUserRoles(
  contract: ethers.Contract,
  address: string
): Promise<('ADMIN' | 'DOCTOR' | 'PATIENT')[]> {
  try {
    const [isAdmin, isDoctor, isPatient] = await Promise.all([
      contract.hasRole(ROLE_HASHES.ADMIN, address),
      contract.hasRole(ROLE_HASHES.DOCTOR, address),
      contract.hasRole(ROLE_HASHES.PATIENT, address),
    ]);

    const roles: ('ADMIN' | 'DOCTOR' | 'PATIENT')[] = [];
    if (isAdmin) {
      roles.push('ADMIN');
    }
    if (isDoctor) {
      roles.push('DOCTOR');
    }
    if (isPatient) {
      roles.push('PATIENT');
    }

    return roles;
  } catch (error) {
    console.error(`Failed to fetch roles for ${address}:`, error);
    return [];
  }
}

/**
 * Format role name for display
 *
 * @param role - Role name
 * @returns Formatted role string
 *
 * @example
 * ```ts
 * formatRoleForDisplay('DOCTOR'); // 'Doctor'
 * formatRoleForDisplay('ADMIN'); // 'Administrator'
 * ```
 */
export function formatRoleForDisplay(role: 'ADMIN' | 'DOCTOR' | 'PATIENT' | 'UNKNOWN'): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrator';
    case 'DOCTOR':
      return 'Doctor';
    case 'PATIENT':
      return 'Patient';
    case 'UNKNOWN':
      return 'Unknown Role';
    default:
      return 'No Role';
  }
}

/**
 * Debug: Print all role hashes to console
 * Useful for comparing contract values with frontend expectations
 */
export function printRoleHashes(): void {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                        ROLE HASH REFERENCE                         ║');
  console.log('╠════════════════════════════════════════════════════════════════════╣');
  console.log(`║ ADMIN_ROLE:   ${ROLE_HASHES.ADMIN} ║`);
  console.log(`║ DOCTOR_ROLE:  ${ROLE_HASHES.DOCTOR} ║`);
  console.log(`║ PATIENT_ROLE: ${ROLE_HASHES.PATIENT} ║`);
  console.log('╚════════════════════════════════════════════════════════════════════╝');
}
