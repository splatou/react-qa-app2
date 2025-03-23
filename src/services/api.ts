// src/services/api.ts
import { LeadData, ValidationResult, ValidationStatus } from '../types';
import config from '../config';

// Function to transcribe audio using Deepgram API with diarization enabled
export const transcribeAudio = async (audioFile: File): Promise<string> => {
  try {
    console.log("Starting Deepgram transcription for file:", audioFile.name, "size:", audioFile.size, "type:", audioFile.type);
    
    // Convert the file to an ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();
    
    // Set up Deepgram API request configuration with diarization enabled
    const response = await fetch('https://api.deepgram.com/v1/listen?detect_language=true&punctuate=true&diarize=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REACT_APP_DEEPGRAM_API_KEY || ''}`,
        'Content-Type': audioFile.type || 'audio/wav' // Use file's type or default to audio/wav
      },
      body: arrayBuffer // Send the raw file data
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepgram API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Deepgram response:", data);
    
    // Process the response to include speaker information
    let formattedTranscript = '';
    
    // Check if utterances are available in the response
    if (data.results?.utterances) {
      // Format using utterances with speaker information
      formattedTranscript = data.results.utterances.map((utterance: any) => 
        `[Speaker:${utterance.speaker}] ${utterance.transcript}`
      ).join('\n\n');
    } else {
      // Alternative: Process the transcript and add speaker information manually
      const alternatives = data.results?.channels[0]?.alternatives[0];
      
      if (alternatives?.words && alternatives.words.length > 0) {
        let currentSpeaker = null;
        let currentUtterance = '';
        
        alternatives.words.forEach((word: any) => {
          // If speaker changes or this is the first word
          if (currentSpeaker !== word.speaker) {
            // Add the previous utterance to the formatted transcript if it exists
            if (currentUtterance) {
              formattedTranscript += `[Speaker:${currentSpeaker}] ${currentUtterance.trim()}\n\n`;
            }
            // Reset for the new speaker
            currentSpeaker = word.speaker;
            currentUtterance = '';
          }
          
          // Add the word to the current utterance
          currentUtterance += word.word + ' ';
        });
        
        // Add the last utterance
        if (currentUtterance) {
          formattedTranscript += `[Speaker:${currentSpeaker}] ${currentUtterance.trim()}`;
        }
      } else {
        // Fallback to the original transcript if no words with speaker info
        formattedTranscript = data.results?.channels[0]?.alternatives[0]?.transcript || '';
      }
    }
    
    return formattedTranscript || '';
    
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
};

interface MelissaContext {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  nameVerified?: boolean;
  addressVerified?: boolean;
  phoneVerified?: boolean;
}

// Function to validate lead using OpenAI API
export const validateLeadWithOpenAI = async (
  transcript: string, 
  phoneNumber: string,
  context?: { melissaData?: MelissaContext }
): Promise<ValidationResult> => {
  try {
    console.log("Starting OpenAI validation for transcript:", transcript.substring(0, 100) + "...");
    console.log("With Melissa context:", context?.melissaData);
    
    // Set up OpenAI API request configuration
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY || ''}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // or another appropriate model
        messages: [
          {
            role: "system",
            content: `You are an AI assistant analyzing insurance call transcripts to determine lead quality and extract customer information.

IMPORTANT: You will receive data from two sources:
1. Melissa (a contact information database) - This data is AUTHORITATIVE for name, address, and contact information
2. Call transcript - This contains insurance details and customer information

Your task is to:
1. Extract ALL insurance information from the transcript (auto, home, health)
2. Compare contact information in the transcript with the Melissa data
3. Note any discrepancies between transcript and Melissa data
4. Evaluate whether the customer is genuinely interested in insurance quotes

When analyzing the transcript:
- DO NOT contradict or override Melissa data for name, address, phone, etc.
- DO extract any vehicle, home, or health insurance information
- DO note if the information in the transcript conflicts with Melissa data
- DO NOT hallucinate or guess information not mentioned in the transcript

CRITICAL REQUIREMENTS FOR LEAD APPROVAL:
1. The customer must explicitly express interest in insurance quotes
2. The lead must have a name (either from Melissa or transcript)
3. The lead must have an address or ZIP code (either from Melissa or transcript)
4. The transcript must contain either a vehicle description OR clear confirmation they have auto insurance

If ANY of these are missing, the lead MUST be classified as "needs_review" with a confidence score below 0.7.

Extract the following data points from the TRANSCRIPT:
- Auto Insurance:
  - Main Vehicle (Year, Make, Model) - Only extract what is explicitly mentioned. If the make or model is not clearly stated, leave those fields empty.
  - Secondary Vehicle (Year, Make, Model), if mentioned - Same rule applies.
  - Current Insurance Provider (or "Not Insured" if they mentioned they don't have insurance)

- Home Insurance:
  - Whether they're interested in home insurance (Yes/No)
  - Whether they rent or own their home
  - Type of home (Apartment, Condo, Manufactured, Multi-Family, Single-Family, Townhome)
  - Current Home Insurance Provider (or "Not Insured" if they mentioned they don't have insurance)

- Health Insurance:
  - Whether they're interested in health insurance (Yes/No)
  - Number of people in household
  - Current Health Insurance Provider (or "Not Insured" if they mentioned they don't have insurance)

For vehicle information, if you detect a make/model that doesn't seem to exist or seems incorrect based on your knowledge of vehicles, do NOT replace it with a corrected version. Instead, include a "suggested_correction" field with your suggested correction and the reason for it. For example:

"main_vehicle": {
  "year": "2005",
  "make": "Maza", // as heard in transcript
  "model": "",
  "confidence": 0.8,
  "suggested_correction": {
    "make": "Mazda",
    "reason": "Maza is not a known vehicle manufacturer, Mazda is the likely correct make."
  }
}

Your response must be a valid JSON object with this structure:
{
  "classification": "approved|rejected|needs_review",
  "confidence_score": 0.0-1.0,
  "reasons": ["Reason 1", "Reason 2"],
  "extracted_data": {
    "first_name": "", // From transcript, even if Melissa data exists
    "last_name": "", // From transcript, even if Melissa data exists
    "date_of_birth": "",
    "phone_number": "",
    "address": "", // From transcript, even if Melissa data exists
    "zip_code": "", // From transcript, even if Melissa data exists
    "state": "", // From transcript, even if Melissa data exists
    "email": "",
    "auto_insurance": {
      "main_vehicle": {
        "year": "",
        "make": "",
        "model": "",
        "confidence": 0.0-1.0,
        "suggested_correction": {
          "year": "",
          "make": "",
          "model": "",
          "reason": ""
        }
      },
      "secondary_vehicle": {
        "year": "",
        "make": "",
        "model": "",
        "confidence": 0.0-1.0,
        "suggested_correction": {
          "year": "",
          "make": "",
          "model": "",
          "reason": ""
        }
      },
      "current_provider": ""
    },
    "home_insurance": {
      "interested": true|false|null,
      "ownership": "Rent|Own|",
      "home_type": "Apartment|Condo|Manufactured|Multi-Family|Single-Family|Townhome|",
      "current_provider": ""
    },
    "health_insurance": {
      "interested": true|false|null,
      "household_size": 0,
      "current_provider": ""
    }
  },
  "missing_information": ["List of critical missing fields if any"],
  "data_discrepancies": ["List any discrepancies between Melissa data and transcript if applicable"]
}`
          },
          {
            role: "user",
            content: `Call transcript: ${transcript}
Phone number from filename: ${phoneNumber}
${context?.melissaData ? `
Melissa Data (AUTHORITATIVE):
First Name: ${context.melissaData.firstName || 'Not found'}
Last Name: ${context.melissaData.lastName || 'Not found'}
Address: ${context.melissaData.address || 'Not found'}
City: ${context.melissaData.city || 'Not found'}
State: ${context.melissaData.state || 'Not found'}
ZIP: ${context.melissaData.zip || 'Not found'}
Name Verified: ${context.melissaData.nameVerified ? 'Yes' : 'No'}
Address Verified: ${context.melissaData.addressVerified ? 'Yes' : 'No'}
` : 'No Melissa data available.'}`
          }
        ],
        temperature: 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("OpenAI response received");
    
    // The response might be a string that needs parsing, or might already be an object
    let result;
    try {
      const content = data.choices[0].message.content;
      // Try to parse it as JSON
      result = typeof content === 'string' ? JSON.parse(content) : content;
    } catch (e) {
      console.error("Error parsing OpenAI response:", e);
      throw new Error("Failed to parse OpenAI response as JSON");
    }
    
    console.log("Parsed OpenAI result:", result);
    
    // Process and format the OpenAI response into our ValidationResult format
    return {
      status: result.classification.toLowerCase() as ValidationStatus,
      confidenceScore: result.confidence_score || 0.8,
      reasons: result.reasons || [],
      extractedData: {
        firstName: result.extracted_data?.first_name || '',
        lastName: result.extracted_data?.last_name || '',
        dob: result.extracted_data?.date_of_birth || '',
        phoneNumber: phoneNumber || result.extracted_data?.phone_number || '',
        address: result.extracted_data?.address || '',
        zip: result.extracted_data?.zip_code || '',
        state: result.extracted_data?.state || '',
        email: result.extracted_data?.email || '',
        
        // For backward compatibility
        vehicleInfo: result.extracted_data?.auto_insurance?.main_vehicle ? 
          `${result.extracted_data.auto_insurance.main_vehicle.year || ''} ${result.extracted_data.auto_insurance.main_vehicle.make || ''} ${result.extracted_data.auto_insurance.main_vehicle.model || ''}`.trim() : '',
        
        // New structured data
        autoInsurance: {
          mainVehicle: {
            year: result.extracted_data?.auto_insurance?.main_vehicle?.year || '',
            make: result.extracted_data?.auto_insurance?.main_vehicle?.make || '',
            model: result.extracted_data?.auto_insurance?.main_vehicle?.model || '',
            // Store confidence if provided
            ...(result.extracted_data?.auto_insurance?.main_vehicle?.confidence && {
              confidence: result.extracted_data.auto_insurance.main_vehicle.confidence
            }),
            // Add suggested correction if provided
            ...(result.extracted_data?.auto_insurance?.main_vehicle?.suggested_correction && {
              suggestedCorrection: {
                make: result.extracted_data.auto_insurance.main_vehicle.suggested_correction.make,
                model: result.extracted_data.auto_insurance.main_vehicle.suggested_correction.model,
                year: result.extracted_data.auto_insurance.main_vehicle.suggested_correction.year,
                reason: result.extracted_data.auto_insurance.main_vehicle.suggested_correction.reason
              }
            })
          },
          secondaryVehicle: result.extracted_data?.auto_insurance?.secondary_vehicle ? {
            year: result.extracted_data.auto_insurance.secondary_vehicle.year || '',
            make: result.extracted_data.auto_insurance.secondary_vehicle.make || '',
            model: result.extracted_data.auto_insurance.secondary_vehicle.model || '',
            // Store confidence if provided
            ...(result.extracted_data.auto_insurance.secondary_vehicle.confidence && {
              confidence: result.extracted_data.auto_insurance.secondary_vehicle.confidence
            }),
            // Add suggested correction if provided
            ...(result.extracted_data.auto_insurance.secondary_vehicle.suggested_correction && {
              suggestedCorrection: {
                make: result.extracted_data.auto_insurance.secondary_vehicle.suggested_correction.make,
                model: result.extracted_data.auto_insurance.secondary_vehicle.suggested_correction.model,
                year: result.extracted_data.auto_insurance.secondary_vehicle.suggested_correction.year,
                reason: result.extracted_data.auto_insurance.secondary_vehicle.suggested_correction.reason
              }
            })
          } : undefined,
          currentProvider: result.extracted_data?.auto_insurance?.current_provider || ''
        },
        homeInsurance: {
          interested: result.extracted_data?.home_insurance?.interested,
          ownership: result.extracted_data?.home_insurance?.ownership || '',
          homeType: result.extracted_data?.home_insurance?.home_type || '',
          currentProvider: result.extracted_data?.home_insurance?.current_provider || ''
        },
        healthInsurance: {
          interested: result.extracted_data?.health_insurance?.interested,
          householdSize: result.extracted_data?.health_insurance?.household_size || null,
          currentProvider: result.extracted_data?.health_insurance?.current_provider || ''
        }
      },
      // Add missing information if provided
      ...(result.missing_information && result.missing_information.length > 0 && {
        needsManualReview: true,
        manualReviewReasons: result.missing_information.map((field: string) => `Missing: ${field}`)
      }),
      // Add data discrepancies if provided
      ...(result.data_discrepancies && result.data_discrepancies.length > 0 && {
        needsManualReview: true,
        manualReviewReasons: result.manualReviewReasons 
          ? [...result.manualReviewReasons, ...result.data_discrepancies]
          : result.data_discrepancies
      })
    };
    
  } catch (error) {
    console.error('Error validating lead with OpenAI:', error);
    throw error;
  }
};