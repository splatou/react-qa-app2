// src/services/melissaApi.ts
console.log("*** MODIFIED MELISSA API VERSION FOR PHONE LOOKUP TESTING ***");

interface MelissaResponse {
  Records?: Array<{
    Results?: string;
    Address?: {
      AddressLine1?: string;
      City?: string;
      State?: string;
      PostalCode?: string;
    };
    Name?: {
      FirstName?: string;
      LastName?: string;
    };
    NameFull?: string;
    PhoneNumber?: string;
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
    queryParams.append("cols", "NameFull,AddressLine1,City,State,PostalCode"); // Specific fields
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
      return result;
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
      melissaLookupAttempted: true,
      originalFirstName: params.firstName,
      originalLastName: params.lastName,
      originalAddress: params.address,
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

  result.melissaNameFound = Boolean(firstNameFromApi || lastNameFromApi);
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

  // Process address
  const addressFromApi = record.Address?.AddressLine1 || record.AddressLine1 || "";
  const cityFromApi = record.Address?.City || record.City || "";
  const stateFromApi = record.Address?.State || record.State || "";
  const zipFromApi = record.Address?.PostalCode || record.PostalCode || "";

  if (addressFromApi) {
    result.melissaAddressFound = true;
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
}