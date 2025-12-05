'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ActionModalProps {
    title: string;
    description?: string;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    isSubmitting?: boolean;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

/**
 * ActionModal Component
 *
 * A reusable modal for action forms (Create, Edit, Upload, etc.)
 * Prevents closing while submitting to avoid data loss
 *
 * @example
 * <ActionModal
 *   title="Upload Health Record"
 *   description="Upload a new medical document to your health records"
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   isSubmitting={isSubmitting}
 * >
 *   <YourFormComponent />
 * </ActionModal>
 */
export function ActionModal({
  title,
  description,
  isOpen,
  onClose,
  children,
  isSubmitting = false,
  maxWidth = 'lg',
}: ActionModalProps) {
  const handleOpenChange = (open: boolean) => {
    // Prevent closing modal while submitting
    if (!open && isSubmitting) {
      return;
    }
    if (!open) {
      onClose();
    }
  };

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[90vh] overflow-y-auto',
          maxWidthClasses[maxWidth],
        )}
        onInteractOutside={(e) => {
          // Prevent closing when clicking outside during submission
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent ESC key closing during submission
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-government-navy dark:text-white">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-neutral-600 dark:text-neutral-400">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="mt-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
