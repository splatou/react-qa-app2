// src/services/melissaApi.ts
console.log("*** MODIFIED MELISSA API VERSION FOR PHONE LOOKUP TESTING ***");

import { MelissaData } from '../types';

interface MelissaResponse {
  Records?: Array<{
    Results?: string;
    Address?: {
      AddressLine1?: string;
      City?: string;
      State?: string;
      PostalCode?: string;
    };
    AddressLine1?: string;
    AddressKey?: string;
    City?: string;
    State?: string;
    PostalCode?: string;
    Name?: {
      FirstName?: string;
      LastName?: string;
    };
    NameFull?: string;
    PhoneNumber?: string;
    EmailAddress?: string;
    // Add DOB fields that Melissa might return
    DateOfBirth?: string;
    DOB?: string;
    BirthDate?: string;
    BirthYear?: string;
    BirthMonth?: string;
    BirthDay?: string;
    Age?: string | number;
  }>;
  TotalRecords?: string;
  TransmissionReference?: string;
  TransmissionResults?: string;
  Version?: string;
}

interface VerificationResult {
  isAddressVerified: boolean;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  isNameVerified: boolean;
  firstName?: string;
  lastName?: string;
  originalFirstName?: string;
  originalLastName?: string;
  originalAddress?: string;
  resultCodes?: string;
  melissaAddressFound: boolean;
  melissaNameFound?: boolean;
  addressMatchesMelissa: boolean;
  melissaLookupAttempted: boolean;
  addressFromMelissa?: boolean;
  nameFromMelissa?: boolean;
  
  // New field to provide data in the preferred structure
  melissaData?: MelissaData;
}

// Normalize addresses for comparison (reused from your code)
function normalizeAddress(address: string): string {
  if (!address) return '';
  return address.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Simplified street number extraction for testing
function extractStreetNumber(address: string): string {
  if (!address) return '';
  const match = address.match(/^\d+/);
  return match ? match[0] : '';
}

// Simplified street number matching for testing
function streetNumbersMatch(address1: string, address2: string): boolean {
  const num1 = extractStreetNumber(address1);
  const num2 = extractStreetNumber(address2);
  return num1 === num2 && num1 !== '';
}

// Helper to format DOB in a consistent way if available in different formats
function formatDOB(record: any): string | undefined {
  // If there's no DateOfBirth, return undefined immediately
  if (!record.DateOfBirth && !record.DOB && !record.BirthDate && 
      !(record.BirthYear && record.BirthMonth)) {
    return undefined;
  }
  
  // Handle YYYYMM format (like "196601")
  if (record.DateOfBirth && record.DateOfBirth.length === 6 && 
      /^\d{6}$/.test(record.DateOfBirth)) {
    const year = record.DateOfBirth.substring(0, 4);
    const month = record.DateOfBirth.substring(4, 6);
    // Convert to MM/DD/YYYY format
    return `${month}/01/${year}`;
  }
  
  // Handle other date formats
  if (record.DateOfBirth) return record.DateOfBirth;
  if (record.DOB) return record.DOB;
  if (record.BirthDate) return record.BirthDate;
  
  // If we have year and month but no day
  if (record.BirthYear && record.BirthMonth) {
    return `${record.BirthMonth.padStart(2, '0')}/01/${record.BirthYear}`;
  }
  
  // If we only have year
  if (record.BirthYear) {
    return `01/01/${record.BirthYear}`;
  }
  
  return undefined; // Default case
}

export const verifyContact = async (
  params: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    address?: string;
    zip?: string;
  }
): Promise<VerificationResult> => {
  try {
    console.log("Verification started with params:", params);

    // Store original values
    const originalFirstName = params.firstName;
    const originalLastName = params.lastName;
    const originalAddress = params.address;

    // Default result
    let result: VerificationResult = {
      isAddressVerified: false,
      isNameVerified: false,
      melissaAddressFound: false,
      melissaNameFound: false,
      addressMatchesMelissa: false,
      melissaLookupAttempted: false,
      originalFirstName,
      originalLastName,
      originalAddress,
      melissaData: {
        isVerified: false
      }
    };

    // Require phone number for this test
    if (!params.phoneNumber) {
      console.log("Phone number required for this test");
      return result;
    }

    // Get API key from environment (or hardcode for testing)
    const apiKey = process.env.REACT_APP_MELISSA_API_KEY || "YOUR_API_KEY_HERE";
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
      console.error("Melissa API key not found or not set");
      return result;
    }

    result.melissaLookupAttempted = true;

    // Use Personator Consumer endpoint for phone lookup
    let apiUrl = "https://personator.melissadata.net/v3/WEB/ContactVerify/doContactVerify?";
    const queryParams = new URLSearchParams();
    queryParams.append("id", apiKey);
    queryParams.append("phone", params.phoneNumber.replace(/\D/g, "")); // Clean phone number
    queryParams.append("act", "Append"); // Focus on appending data
    // Add DOB to the requested columns
    queryParams.append("cols", "NameFull,AddressLine1,City,State,PostalCode,EmailAddress,DateOfBirth"); 
    queryParams.append("format", "JSON");

    apiUrl += queryParams.toString();

    console.log("Calling Melissa Personator API with:", {
      phoneNumber: params.phoneNumber,
    });
    console.log("API URL (key hidden):", apiUrl.replace(apiKey, "API_KEY_HIDDEN"));

    // Make the API request
    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.error(`API error: ${response.status} - ${response.statusText}`);
      console.error("Response:", await response.text());
      throw new Error(`Melissa API request failed: ${response.status}`);
    }

    const rawResponse = await response.text();
    console.log("Raw response:", rawResponse);

    const contactData: MelissaResponse = JSON.parse(rawResponse);
    console.log("Parsed response:", JSON.stringify(contactData, null, 2));

    // Process the response
    processContactVerifyResponse(result, contactData, params);

    return result;
  } catch (error) {
    console.error("Error verifying contact:", error);
    return {
      isAddressVerified: false,
      isNameVerified: false,
      melissaAddressFound: false,
      melissaNameFound: false,
      addressMatchesMelissa: false,
      melissaLookupAttempted: false, // Set to false if the API call fails
      originalFirstName: params.firstName,
      originalLastName: params.lastName,
      originalAddress: params.address,
      melissaData: undefined // Ensure melissaData is undefined if the API call fails
    };
  }
};

// Process Contact Verify API response
function processContactVerifyResponse(
  result: VerificationResult,
  contactData: MelissaResponse,
  params: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    address?: string;
    zip?: string;
  }
): void {
  if (!contactData.Records || contactData.Records.length === 0) {
    console.log("No records found in response");
    result.melissaData = undefined; // Ensure melissaData is undefined if no records are found
    return;
  }

  const record = contactData.Records[0];
  const resultCodes = record.Results || "";
  result.resultCodes = resultCodes;

  console.log("Result codes:", resultCodes);

  // Process name
  let firstNameFromApi = "";
  let lastNameFromApi = "";
  if (record.Name?.FirstName) firstNameFromApi = record.Name.FirstName;
  if (record.Name?.LastName) lastNameFromApi = record.Name.LastName;
  if (!firstNameFromApi && !lastNameFromApi && record.NameFull) {
    const nameParts = record.NameFull.trim().split(" ");
    firstNameFromApi = nameParts[0] || "";
    lastNameFromApi = nameParts.slice(1).join(" ") || "";
  }

  // Process address - prioritize record-level fields over Address object
  const addressFromApi = record.AddressLine1 || record.Address?.AddressLine1 || "";
  const cityFromApi = record.City || record.Address?.City || "";
  const stateFromApi = record.State || record.Address?.State || "";
  const zipFromApi = record.PostalCode || record.Address?.PostalCode || ""; // Prioritize record.PostalCode
  const emailFromApi = record.EmailAddress || "";
  
  // Process DOB - handle multiple potential formats
  const dobFromApi = formatDOB(record);
  console.log("Processed DOB from API:", dobFromApi); // Add debug logging

  // Process the phone number
  const phoneFromApi = record.PhoneNumber || params.phoneNumber || "";

  // Store flags for further processing
  result.melissaNameFound = Boolean(firstNameFromApi || lastNameFromApi);
  result.melissaAddressFound = Boolean(addressFromApi);

  // Set data in result object
  if (result.melissaNameFound) {
    result.firstName = firstNameFromApi;
    result.lastName = lastNameFromApi;
    result.isNameVerified = true; // Assume verified if returned
    result.nameFromMelissa = true;
    console.log("Name found:", { firstName: firstNameFromApi, lastName: lastNameFromApi });
  } else {
    result.firstName = params.firstName || "";
    result.lastName = params.lastName || "";
    console.log("No name found");
  }

  if (result.melissaAddressFound) {
    result.address = addressFromApi;
    result.city = cityFromApi;
    result.state = stateFromApi;
    result.zip = zipFromApi;
    result.addressFromMelissa = true;
    result.isAddressVerified = true; // Assume verified if returned

    if (params.address) {
      const normalizedOriginal = normalizeAddress(params.address);
      const normalizedMelissa = normalizeAddress(addressFromApi);
      result.addressMatchesMelissa = streetNumbersMatch(params.address, addressFromApi) || normalizedOriginal === normalizedMelissa;
    } else {
      result.addressMatchesMelissa = true; // No input to compare
    }

    console.log("Address found:", {
      address: addressFromApi,
      city: cityFromApi,
      state: stateFromApi,
      zip: zipFromApi,
    });
  } else {
    result.address = params.address || "";
    result.city = params.zip ? "" : undefined; // Minimal handling for test
    result.state = params.zip ? "" : undefined;
    result.zip = params.zip || "";
    console.log("No address found");
  }
  
  // Populate the MelissaData structure with the found values
  // Important: Use the actual values, not the Boolean checks for existence
  result.melissaData = {
    firstName: firstNameFromApi || undefined,
    lastName: lastNameFromApi || undefined,
    address: addressFromApi || undefined,
    city: cityFromApi || undefined, 
    state: stateFromApi || undefined,
    zip: zipFromApi || undefined,
    phoneNumber: phoneFromApi || undefined,
    // For email and DOB, make sure they're either a non-empty string or undefined
    email: emailFromApi && emailFromApi.trim() !== "" ? emailFromApi : undefined,
    dob: dobFromApi || undefined,
    isVerified: result.isNameVerified || result.isAddressVerified
  };

  // Log the populated melissa data for debugging
  console.log("Populated Melissa data:", JSON.stringify(result.melissaData, null, 2));
}