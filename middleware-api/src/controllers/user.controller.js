import crypto from 'crypto';
import { getSupabaseClient } from '../services/db.service.js';
import logger from '../utils/logger.js';

/**
 * UserController
 * Handles user invitation and management operations
 */
class UserController {
  /**
   * Send user invitation
   * POST /api/users/invite
   */
  async sendInvitation(req, res, next) {
    try {
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Email and role are required',
            statusCode: 400,
          },
        });
      }

      // Validate role
      const validRoles = ['patient', 'doctor'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid role. Must be patient or doctor',
            statusCode: 400,
          },
        });
      }

      const supabase = getSupabaseClient();

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('healthlink_users')
        .select('id, email')
        .eq('email', email)
        .single();

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            type: 'CONFLICT',
            message: 'User with this email already exists',
            statusCode: 409,
          },
        });
      }

      // Check if invitation already exists
      const { data: existingInvitation } = await supabase
        .from('user_invitations')
        .select('id, status')
        .eq('email', email)
        .eq('status', 'pending')
        .single();

      if (existingInvitation) {
        return res.status(409).json({
          success: false,
          error: {
            type: 'CONFLICT',
            message: 'Invitation already sent to this email',
            statusCode: 409,
          },
        });
      }

      // Generate invitation token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invitation record
      const { data: invitation, error } = await supabase
        .from('user_invitations')
        .insert({
          email,
          role,
          token,
          expires_at: expiresAt.toISOString(),
          invited_by: req.user.id,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create invitation:', error);
        return res.status(500).json({
          success: false,
          error: {
            type: 'DATABASE_ERROR',
            message: 'Failed to create invitation',
            statusCode: 500,
          },
        });
      }

      // TODO: Send email with invitation link
      // For now, just return the invitation details
      logger.info(`Invitation created for ${email} with role ${role}`);

      res.status(201).json({
        success: true,
        message: 'Invitation sent successfully',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expires_at: invitation.expires_at,
          token: token, // In production, this would be sent via email
        },
      });
    } catch (error) {
      logger.error('Send invitation error:', error);
      next(error);
    }
  }

  /**
   * List pending invitations
   * GET /api/users/invitations
   */
  async listInvitations(req, res, next) {
    try {
      const supabase = getSupabaseClient();

      const { data: invitations, error } = await supabase
        .from('user_invitations')
        .select(`
          id,
          email,
          role,
          status,
          expires_at,
          created_at,
          invited_by,
          users!user_invitations_invited_by_fkey (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to list invitations:', error);
        return res.status(500).json({
          success: false,
          error: {
            type: 'DATABASE_ERROR',
            message: 'Failed to retrieve invitations',
            statusCode: 500,
          },
        });
      }

      res.status(200).json({
        success: true,
        count: invitations.length,
        invitations,
      });
    } catch (error) {
      logger.error('List invitations error:', error);
      next(error);
    }
  }

  /**
   * Accept user invitation
   * POST /api/users/invitations/:token/accept
   */
  async acceptInvitation(req, res, next) {
    try {
      const { token } = req.params;
      const { name, password } = req.body;

      if (!name || !password) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Name and password are required',
            statusCode: 400,
          },
        });
      }

      const supabase = getSupabaseClient();

      // Find and validate invitation
      const { data: invitation, error: findError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (findError || !invitation) {
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Invalid or expired invitation',
            statusCode: 404,
          },
        });
      }

      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        return res.status(410).json({
          success: false,
          error: {
            type: 'EXPIRED',
            message: 'Invitation has expired',
            statusCode: 410,
          },
        });
      }

      // Create user account
      const { data: user, error: createError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            name,
            role: invitation.role,
          },
        },
      });

      if (createError) {
        logger.error('Failed to create user account:', createError);
        return res.status(500).json({
          success: false,
          error: {
            type: 'REGISTRATION_ERROR',
            message: 'Failed to create user account',
            statusCode: 500,
          },
        });
      }

      // Update invitation status
      await supabase
        .from('user_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      // Create user profile
      if (user.user) {
        await supabase
          .from('healthlink_users')
          .insert({
            id: user.user.id,
            email: invitation.email,
            full_name: name,
            role: invitation.role,
          });
      }

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        user: {
          id: user.user?.id,
          email: invitation.email,
          name,
          role: invitation.role,
        },
      });
    } catch (error) {
      logger.error('Accept invitation error:', error);
      next(error);
    }
  }

  /**
   * Cancel invitation
   * DELETE /api/users/invitations/:id
   */
  async cancelInvitation(req, res, next) {
    try {
      const { id } = req.params;
      const supabase = getSupabaseClient();

      const { data: invitation, error: findError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('id', id)
        .single();

      if (findError || !invitation) {
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Invitation not found',
            statusCode: 404,
          },
        });
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (updateError) {
        logger.error('Failed to cancel invitation:', updateError);
        return res.status(500).json({
          success: false,
          error: {
            type: 'DATABASE_ERROR',
            message: 'Failed to cancel invitation',
            statusCode: 500,
          },
        });
      }

      res.status(200).json({
        success: true,
        message: 'Invitation cancelled successfully',
      });
    } catch (error) {
      logger.error('Cancel invitation error:', error);
      next(error);
    }
  }
}

export default new UserController();
