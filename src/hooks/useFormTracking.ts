/**
 * useFormTracking - Simplified form analytics hook
 * 
 * Easy-to-use wrapper around useFormAnalytics for React Hook Form.
 * Just wrap your form fields with the tracking helpers.
 */

import { useCallback, useRef, useEffect } from 'react';
import { useFormAnalytics } from './useFormAnalytics';

interface UseFormTrackingOptions {
  formType: string;
  formInstanceId?: string;
  clientId?: string;
}

/**
 * Hook for tracking form field interactions
 * 
 * Usage:
 * const { getFieldProps, completeForm } = useFormTracking({ formType: 'client_create' });
 * 
 * <Input {...register('name')} {...getFieldProps('name')} />
 * 
 * const onSubmit = async (data) => {
 *   await saveData(data);
 *   completeForm();
 * };
 */
export function useFormTracking(options: UseFormTrackingOptions) {
  const analytics = useFormAnalytics(options);
  const fieldValuesRef = useRef<Record<string, boolean>>({});

  // Get props to spread on form fields
  // IMPORTANT: These should be used BEFORE {...field} spread to not override react-hook-form handlers
  // Or use the returned handlers to wrap original handlers
  const getFieldProps = useCallback((fieldName: string) => {
    return {
      onFocus: () => {
        analytics.trackFieldFocus(fieldName);
      },
      onBlurCapture: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        // Use capture phase to not interfere with form handlers
        const hasValue = e.target.value !== '' && e.target.value !== undefined;
        fieldValuesRef.current[fieldName] = hasValue;
        analytics.trackFieldBlur(fieldName, hasValue);
      },
      onChangeCapture: () => {
        // Use capture phase to not interfere with form handlers
        analytics.trackFieldChange(fieldName);
      },
    };
  }, [analytics]);

  // Track validation error for a field
  const trackError = useCallback((fieldName: string) => {
    analytics.trackValidationError(fieldName);
  }, [analytics]);

  // Track all validation errors from react-hook-form errors object
  const trackValidationErrors = useCallback((errors: Record<string, any>) => {
    Object.keys(errors).forEach(fieldName => {
      analytics.trackValidationError(fieldName);
    });
  }, [analytics]);

  return {
    getFieldProps,
    trackError,
    trackValidationErrors,
    completeForm: analytics.completeForm,
    abandonForm: analytics.abandonForm,
  };
}

/**
 * HOC to wrap form components with analytics
 * 
 * Usage with FormField from shadcn:
 * <FormField
 *   control={form.control}
 *   name="email"
 *   render={({ field }) => (
 *     <FormItem>
 *       <FormLabel>Email</FormLabel>
 *       <FormControl>
 *         <Input {...field} {...getFieldProps('email')} />
 *       </FormControl>
 *       <FormMessage />
 *     </FormItem>
 *   )}
 * />
 */
