/**
 * Utility functions for form validation and auto-scrolling to invalid fields
 */

export interface ValidationError {
  field: string;
  message: string;
  elementId?: string;
}

/**
 * Scrolls to and focuses on the first invalid field
 * @param fieldName - Name of the field to scroll to
 * @param elementId - Optional specific element ID to target
 */
export const scrollToInvalidField = (fieldName: string, elementId?: string): void => {
  if (typeof window === 'undefined') return;

  // Try to find the field by ID first
  let element: HTMLElement | null = null;

  if (elementId) {
    element = document.getElementById(elementId);
  }

  // If not found by ID, try to find by name attribute
  if (!element) {
    element = document.querySelector(`[name="${fieldName}"]`) as HTMLElement;
  }

  // If still not found, try to find by data-field attribute
  if (!element) {
    element = document.querySelector(`[data-field="${fieldName}"]`) as HTMLElement;
  }

  // If still not found, try to find input/select/textarea with id containing fieldName
  if (!element) {
    const possibleSelectors = [
      `#${fieldName}`,
      `input[name="${fieldName}"]`,
      `select[name="${fieldName}"]`,
      `textarea[name="${fieldName}"]`,
      `[id*="${fieldName}"]`,
    ];
    
    for (const selector of possibleSelectors) {
      element = document.querySelector(selector) as HTMLElement;
      if (element) break;
    }
  }

  if (element) {
    // Scroll to element with smooth behavior
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    // Focus on the element after a short delay to ensure scroll completes
    setTimeout(() => {
      if (element) {
        // For button elements (like dropdowns), try to click to open
        if (element.tagName === 'BUTTON') {
          (element as HTMLButtonElement).click();
        } else {
          element.focus();
        }
        
        // For select elements, try to open the dropdown
        if (element.tagName === 'SELECT') {
          (element as HTMLSelectElement).click();
        }
        
        // Add a temporary highlight class
        element.classList.add('validation-error-highlight');
        setTimeout(() => {
          element?.classList.remove('validation-error-highlight');
        }, 2000);
      }
    }, 300);
  } else {
    // If element not found by ID, try to find by container ID (for dropdowns)
    if (elementId) {
      const container = document.getElementById(`${elementId}-container`);
      if (container) {
        container.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        const button = container.querySelector('button');
        if (button) {
          setTimeout(() => {
            button.click();
            button.classList.add('validation-error-highlight');
            setTimeout(() => {
              button.classList.remove('validation-error-highlight');
            }, 2000);
          }, 300);
        }
      }
    }
  }
};

/**
 * Validates form and scrolls to first invalid field
 * @param errors - Array of validation errors
 * @returns true if validation passed, false otherwise
 */
export const validateAndScroll = (errors: ValidationError[]): boolean => {
  if (errors.length === 0) return true;

  // Scroll to first error
  const firstError = errors[0];
  scrollToInvalidField(firstError.field, firstError.elementId);

  return false;
};

/**
 * Creates a validation error object
 */
export const createValidationError = (
  field: string,
  message: string,
  elementId?: string
): ValidationError => ({
  field,
  message,
  elementId,
});

