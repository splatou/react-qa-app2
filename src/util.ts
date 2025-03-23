// src/util.ts

/**
 * Validates if a string is a valid US ZIP code format
 * Valid formats: 5 digits (e.g., 12345) or ZIP+4 (e.g., 12345-6789)
 * 
 * @param zip The ZIP code string to validate
 * @returns boolean indicating if the ZIP code is valid
 */
export const isValidZipCode = (zip: string): boolean => {
    // Basic US ZIP code validation (5 digits or ZIP+4 format)
    return /^\d{5}(-\d{4})?$/.test(zip);
  };
  
  /**
   * Attempts to clean up a potentially invalid ZIP code
   * For example, converting "161680" to "16168"
   * 
   * @param zip The ZIP code string to clean
   * @returns A potentially cleaned ZIP code or the original if no cleaning was possible
   */
  export const cleanZipCode = (zip: string): string => {
    // If it's already valid, return as is
    if (isValidZipCode(zip)) {
      return zip;
    }
    
    // Remove all non-digits
    const digitsOnly = zip.replace(/\D/g, '');
    
    // Check if we have at least 5 digits
    if (digitsOnly.length >= 5) {
      // Take first 5 digits
      return digitsOnly.substring(0, 5);
    }
    
    // If we can't clean it, return original
    return zip;
  };