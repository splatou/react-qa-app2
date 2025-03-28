import React, { useState } from 'react';
import './App.css';
import { transcribeAudio, validateLeadWithOpenAI } from './services/api.ts';
import { ValidationResult } from './types';
import FileUpload from './components/FileUpload.tsx';
import ValidationResultComponent from './components/ValidationResult.tsx';
import config from './config';
import * as zipcodes from 'zipcodes';
import { verifyContact } from './services/melissaApi.ts';
import { isValidZipCode } from './util.ts';

const App: React.FC = () => {
  console.log("Deepgram API Key:", process.env.REACT_APP_DEEPGRAM_API_KEY ? "Set (length: " + process.env.REACT_APP_DEEPGRAM_API_KEY.length + ")" : "Not set");
  console.log("OpenAI API Key:", process.env.REACT_APP_OPENAI_API_KEY ? "Set (length: " + process.env.REACT_APP_OPENAI_API_KEY.length + ")" : "Not set");
  console.log("Melissa API Key:", process.env.REACT_APP_MELISSA_API_KEY ? "Set (length: " + process.env.REACT_APP_MELISSA_API_KEY.length + ")" : "Not set");

  const [, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const extractPhoneFromFilename = (filename: string): string => {
    const match = filename.match(/\d{10}/);
    return match ? match[0] : '';
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setFile(file);
    
    try {
      const phoneNumber = extractPhoneFromFilename(file.name);
      if (!phoneNumber) {
        console.warn("Couldn't extract phone number from filename");
      } else {
        console.log(`Extracted phone number: ${phoneNumber}`);
      }
      
      let melissaData: any | null = null;
      let result: ValidationResult = {
        status: 'needs_review',
        confidenceScore: 0.5,
        needsManualReview: false,
        extractedData: {
          firstName: '',
          lastName: '',
          address: '',
          zip: '',
          state: '',
          phoneNumber: phoneNumber,
          email: '',
          dob: '',
          autoInsurance: {
            mainVehicle: { year: '', make: '', model: '' },
            currentProvider: ''
          },
          homeInsurance: {
            interested: null,
            ownership: '',
            homeType: '',
            currentProvider: ''
          },
          healthInsurance: {
            interested: null,
            householdSize: null,
            currentProvider: ''
          }
        },
        melissaLookupAttempted: false
      };
      
      if (phoneNumber && process.env.REACT_APP_MELISSA_API_KEY) {
        try {
          console.log("Querying Melissa with phone number...");
          melissaData = await verifyContact({ phoneNumber });
          
          result.melissaLookupAttempted = melissaData.melissaLookupAttempted;
          
          if (melissaData.firstName) {
            result.extractedData.firstName = melissaData.firstName;
            result.nameFromMelissa = true;
          }
          
          if (melissaData.lastName) {
            result.extractedData.lastName = melissaData.lastName;
            result.nameFromMelissa = true;
          }
          
          if (melissaData.address) {
            result.extractedData.address = melissaData.address;
            result.addressFromMelissa = true;
          }
          
          if (melissaData.city) {
            result.extractedData.city = melissaData.city;
          }
          
          if (melissaData.state) {
            result.extractedData.state = melissaData.state;
          }
          
          if (melissaData.zip) {
            result.extractedData.zip = melissaData.zip;
            
            if (!isValidZipCode(melissaData.zip)) {
              result.invalidZip = true;
              result.needsManualReview = true;
              result.manualReviewReasons = ["Invalid ZIP code from Melissa"];
            }
          }
          
          result.nameVerified = melissaData.isNameVerified;
          result.addressVerified = melissaData.isAddressVerified;
          result.melissaAddressFound = melissaData.melissaAddressFound;
          result.melissaNameFound = melissaData.melissaNameFound;
          
          if (melissaData.suggestedAddress) {
            result.suggestedAddress = melissaData.suggestedAddress;
          }
          
          if (melissaData.suggestedName) {
            result.suggestedName = melissaData.suggestedName;
          }
          
          console.log("Data obtained from Melissa:", {
            firstName: result.extractedData.firstName,
            lastName: result.extractedData.lastName,
            address: result.extractedData.address,
            city: result.extractedData.city,
            state: result.extractedData.state,
            zip: result.extractedData.zip,
            nameVerified: result.nameVerified,
            addressVerified: result.addressVerified
          });
        } catch (melissaError) {
          console.error('Error with Melissa lookup:', melissaError);
          result.melissaLookupAttempted = false;
          result.needsManualReview = true;
          result.manualReviewReasons = ["Failed to retrieve data from Melissa"];
        }
      } else {
        console.log('Skipping Melissa verification - no phone number or API key');
        result.melissaLookupAttempted = false;
        result.needsManualReview = true;
        result.manualReviewReasons = ["No phone number or Melissa API key available"];
      }
      
      const transcription = await getTranscription(file);
      setTranscript(transcription);
      
      const melissaContext = melissaData?.melissaData ? {
        firstName: melissaData.melissaData.firstName,
        lastName: melissaData.melissaData.lastName,
        address: melissaData.melissaData.address,
        city: melissaData.melissaData.city,
        state: melissaData.melissaData.state,
        zip: melissaData.melissaData.zip,
        email: melissaData.melissaData.email,
        dob: melissaData.melissaData.dob,
        nameVerified: melissaData.isNameVerified,
        addressVerified: melissaData.isAddressVerified,
        phoneVerified: melissaData.melissaLookupAttempted,
        phoneNumber: phoneNumber
      } : undefined;

      const openAIResult = await validateLeadWithOpenAI(
        transcription, 
        phoneNumber,
        { melissaData: melissaContext }
      );
      
      if (openAIResult) {
        const mergedResult: ValidationResult = {
          ...openAIResult,
          extractedData: {
            ...openAIResult.extractedData,
            firstName: result.extractedData.firstName || openAIResult.extractedData.firstName || '',
            lastName: result.extractedData.lastName || openAIResult.extractedData.lastName || '',
            address: result.extractedData.address || openAIResult.extractedData.address || '',
            city: result.extractedData.city || openAIResult.extractedData.city || '',
            state: result.extractedData.state || openAIResult.extractedData.state || '',
            zip: result.extractedData.zip || openAIResult.extractedData.zip || '',
            phoneNumber: phoneNumber || openAIResult.extractedData.phoneNumber || '',
            email: melissaData?.melissaData?.email || openAIResult.extractedData.email || '',
            dob: melissaData?.melissaData?.dob || openAIResult.extractedData.dob || ''
          },
          melissaData: openAIResult.melissaData || {
            firstName: melissaData?.melissaData?.firstName,
            lastName: melissaData?.melissaData?.lastName,
            address: melissaData?.melissaData?.address,
            city: melissaData?.melissaData?.city,
            state: melissaData?.melissaData?.state,
            zip: melissaData?.melissaData?.zip,
            phoneNumber: phoneNumber,
            email: melissaData?.melissaData?.email,
            dob: melissaData?.melissaData?.dob,
            isVerified: melissaData?.isNameVerified || melissaData?.isAddressVerified || false
          },
          nameFromMelissa: result.nameFromMelissa,
          addressFromMelissa: result.addressFromMelissa,
          nameVerified: result.nameVerified,
          addressVerified: result.addressVerified,
          melissaLookupAttempted: result.melissaLookupAttempted,
          melissaAddressFound: result.melissaAddressFound,
          melissaNameFound: result.melissaNameFound,
          suggestedAddress: result.suggestedAddress,
          suggestedName: result.suggestedName,
          invalidZip: result.invalidZip
        };
        
        if (result.manualReviewReasons && result.manualReviewReasons.length > 0) {
          if (!mergedResult.manualReviewReasons) {
            mergedResult.manualReviewReasons = [];
          }
          mergedResult.manualReviewReasons.push(...result.manualReviewReasons);
          mergedResult.needsManualReview = true;
        }
        
        if (openAIResult.extractedData.firstName && 
            result.extractedData.firstName && 
            openAIResult.extractedData.firstName.toLowerCase() !== result.extractedData.firstName.toLowerCase()) {
          mergedResult.transcriptFirstName = openAIResult.extractedData.firstName;
        }
        
        if (openAIResult.extractedData.lastName && 
            result.extractedData.lastName && 
            openAIResult.extractedData.lastName.toLowerCase() !== result.extractedData.lastName.toLowerCase()) {
          mergedResult.transcriptLastName = openAIResult.extractedData.lastName;
        }
        
        if (openAIResult.extractedData.address && 
            result.extractedData.address && 
            openAIResult.extractedData.address.toLowerCase() !== result.extractedData.address.toLowerCase()) {
          mergedResult.transcriptAddress = openAIResult.extractedData.address;
        }
        
        if (openAIResult.extractedData.zip && 
            result.extractedData.zip && 
            openAIResult.extractedData.zip !== result.extractedData.zip) {
          mergedResult.transcriptZip = openAIResult.extractedData.zip;
        }
        
        const discrepancies = [];
        if (mergedResult.transcriptFirstName) discrepancies.push("First name differs between Melissa and transcript");
        if (mergedResult.transcriptLastName) discrepancies.push("Last name differs between Melissa and transcript");
        if (mergedResult.transcriptAddress) discrepancies.push("Address differs between Melissa and transcript");
        if (mergedResult.transcriptZip) discrepancies.push("ZIP code differs between Melissa and transcript");
        
        if (discrepancies.length > 0) {
          if (!mergedResult.manualReviewReasons) {
            mergedResult.manualReviewReasons = [];
          }
          mergedResult.manualReviewReasons.push(...discrepancies);
          mergedResult.needsManualReview = true;
        }
        
        setValidationResult(mergedResult);
        console.log("Final merged validation result:", mergedResult);
      } else {
        setValidationResult(result);
        console.log("Using Melissa-only validation result:", result);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTranscription = async (file: File): Promise<string> => {
    try {
      const transcript = await transcribeAudio(file);
      console.log("Transcription successful:", transcript);
      return transcript;
    } catch (error) {
      console.error('Error with Deepgram transcription:', error);
      alert('Error transcribing audio: ' + (error as Error).message);
      throw error;
    }
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo">
          <h1>QUIN<span>AI</span></h1>
        </div>
      </header>
      
      <main className="content">
        <div className="qa-container">
          <FileUpload onFileSelect={processFile} />
          
          <div className="result-container">
            <h2>AI QA Result{isLoading ? '...' : ''}</h2>
            
            {isLoading && (
              <div className="loading">
                <div className="spinner"></div>
                <p>Processing audio file...</p>
              </div>
            )}
            
            {!isLoading && validationResult && (
              <ValidationResultComponent 
                result={validationResult}
                transcript={transcript} 
              />
            )}
            
            {!isLoading && !validationResult && (
              <div className="no-result">
                <p>Upload an audio file to see QA results</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;