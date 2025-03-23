// src/types.ts

// Types for vehicle information
export interface Vehicle {
  year?: string;
  make?: string;
  model?: string;
  corrected?: boolean;
  originalText?: string;
  potentialHallucination?: boolean;
  suggestedCorrection?: {
    year?: string;
    make?: string;
    model?: string;
    reason?: string;
  };
}

// Types for insurance information
export interface AutoInsurance {
  mainVehicle?: Vehicle;
  secondaryVehicle?: Vehicle;
  currentProvider?: string;
}

export interface HomeInsurance {
  interested?: boolean;
  ownership?: string;
  homeType?: string;
  currentProvider?: string;
}

export interface HealthInsurance {
  interested?: boolean;
  householdSize?: string;
  currentProvider?: string;
}

// Type for Melissa Data (source of truth)
export interface MelissaData {
  lookupAttempted: boolean;
  dataFound: boolean;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  resultCodes?: string;
}

// Type for data extracted from the transcript by OpenAI
export interface TranscriptData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  dob?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  autoInsurance?: AutoInsurance;
  homeInsurance?: HomeInsurance;
  healthInsurance?: HealthInsurance;
  manualReviewReasons?: string[];
  confidenceScore?: number;
}

// Type for final validation result
export type ValidationStatus = 'approved' | 'rejected' | 'needs_review';

export interface ValidationResult {
  status: ValidationStatus;
  confidenceScore?: number;
  needsManualReview: boolean;
  manualReviewReasons?: string[];
  reasons?: string[];
  
  // Extracted data (merged from Melissa and transcript)
  extractedData: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    dob: string;
    address: string;
    city?: string;
    state: string;
    zip: string;
    autoInsurance?: AutoInsurance;
    homeInsurance?: HomeInsurance;
    healthInsurance?: HealthInsurance;
  };
  
  // Melissa verification flags
  melissaLookupAttempted: boolean;
  melissaAddressFound: boolean;
  melissaNameFound?: boolean;
  nameVerified: boolean;
  addressVerified: boolean;
  addressMatchesMelissa?: boolean;
  
  // Original transcript values for comparison
  transcriptFirstName?: string;
  transcriptLastName?: string;
  transcriptAddress?: string;
  transcriptZip?: string;
  transcriptState?: string;
  
  // Origin flags
  nameFromMelissa?: boolean;
  addressFromMelissa?: boolean;
  
  // Validity flags
  invalidZip?: boolean;
  zipMismatch?: boolean;
  
  // Suggested corrections
  suggestedAddress?: string;
  suggestedName?: {
    firstName?: string;
    lastName?: string;
  };
}