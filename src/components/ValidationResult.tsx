import React from 'react';
import { ValidationResult as ValidationResultType, ValidationStatus } from '../types.ts';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';

interface ValidationResultProps {
  result: ValidationResultType;
  transcript: string;
}

const ValidationResult: React.FC<ValidationResultProps> = ({ result, transcript }) => {
  // Helper function to display values or "Not Detected"
  const displayValue = (value: string) => {
    return value ? value : <span className="not-detected">Not Detected</span>;
  };

  // Helper function for Yes/No display
  const displayYesNo = (value: boolean | null) => {
    if (value === true) return "Yes";
    if (value === false) return "No";
    return <span className="not-detected">Not Detected</span>;
  };

  // Helper function for insurance providers
  const displayInsuranceProvider = (provider: string) => {
    if (provider === "Not Insured") return "Not Insured";
    if (provider) return provider;
    return <span className="not-detected">Not Detected</span>;
  };

  // Generate status badge based on validation result
  const getStatusBadge = (status: ValidationStatus) => {
    switch (status) {
      case 'approved':
        return <span className="badge badge-success">Approved</span>;
      case 'rejected':
        return <span className="badge badge-danger">Rejected</span>;
      case 'needs_review':
        return <span className="badge badge-warning">Needs Review</span>;
      default:
        return null;
    }
  };

  // Format the transcript for better readability
  const formatTranscript = (text: string) => {
    return text.split(/(?<=[.!?])\s+/).map((sentence, index) => (
      <p key={index} className="transcript-sentence">{sentence}</p>
    ));
  };

  // Helper function to construct name comparison display
  const renderNameComparison = () => {
    const melissaName = (result.nameFromMelissa && (result.extractedData.firstName || result.extractedData.lastName));
    const transcriptName = (result.transcriptFirstName || result.transcriptLastName);
    
    if (melissaName && transcriptName) {
      return (
        <div className="data-comparison">
          <div className={`comparison-item ${result.nameVerified ? 'match' : 'mismatch'}`}>
            <div className="source">
              <span className="source-label">Melissa:</span>
              <span className="source-value">
                {`${result.extractedData.firstName || ''} ${result.extractedData.lastName || ''}`}
              </span>
            </div>
            <div className="source">
              <span className="source-label">Call:</span>
              <span className="source-value">
                {`${result.transcriptFirstName || ''} ${result.transcriptLastName || ''}`}
              </span>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Helper function to construct address comparison display
  const renderAddressComparison = () => {
    const melissaAddress = (result.addressFromMelissa && result.extractedData.address);
    const transcriptAddress = result.transcriptAddress;
    
    if (melissaAddress && transcriptAddress) {
      return (
        <div className="data-comparison">
          <div className={`comparison-item ${result.addressMatchesMelissa ? 'match' : 'mismatch'}`}>
            <div className="source">
              <span className="source-label">Melissa:</span>
              <span className="source-value">{result.extractedData.address}</span>
            </div>
            <div className="source">
              <span className="source-label">Call:</span>
              <span className="source-value">{result.transcriptAddress}</span>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="validation-result">
      <div className="result-header">
        <h3>Lead Validation {getStatusBadge(result.status)}</h3>
        {result.confidenceScore && (
          <div className="confidence">
            Confidence: {(result.confidenceScore * 100).toFixed(0)}%
          </div>
        )}
      </div>
      
      {/* Manual Review Alert */}
      {result.needsManualReview && (
        <div className="manual-review-alert">
          <div className="alert-icon">
            <FaExclamationTriangle />
          </div>
          <div className="alert-content">
            <h4>Needs Manual Review</h4>
            {result.manualReviewReasons && result.manualReviewReasons.length > 0 && (
              <ul className="review-reasons">
                {result.manualReviewReasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      
      {result.reasons && result.reasons.length > 0 && (
        <div className="reasons">
          <h4>Reasons:</h4>
          <ul>
            {result.reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="extracted-data">
        <h4>Contact Information:</h4>
        <div className="data-grid">
          <div className="data-item">
            <span className="label">Name:</span>
            <span className="value name-value">
              {result.extractedData.firstName || result.extractedData.lastName ? (
                <>
                  {`${result.extractedData.firstName || ''} ${result.extractedData.lastName || ''}`.trim()}
                  {result.nameVerified !== undefined && (
                    <span className="verification-icon">
                      {result.nameVerified ? (
                        <FaCheckCircle className="verified-icon" title="Name verified via Melissa" />
                      ) : (
                        <FaTimesCircle className="unverified-icon" title="Name not verified" />
                      )}
                    </span>
                  )}
                  {result.nameFromMelissa && (
                    <span className="melissa-badge" title="Name from Melissa">M</span>
                  )}
                </>
              ) : (
                <span className="not-detected">Not Detected</span>
              )}
            </span>
          </div>
          
          {/* Name Comparison if applicable */}
          {renderNameComparison()}
          
          <div className="data-item">
            <span className="label">DOB:</span>
            <span className="value">{displayValue(result.extractedData.dob)}</span>
          </div>
          
          <div className="data-item">
            <span className="label">Phone:</span>
            <span className="value">{displayValue(result.extractedData.phoneNumber)}</span>
          </div>
          
          <div className="data-item">
            <span className="label">Email:</span>
            <span className="value">{displayValue(result.extractedData.email)}</span>
          </div>
          
          <div className="data-item">
            <span className="label">Address:</span>
            <span className="value">
              {result.extractedData.address ? (
                <>
                  <span className="address-value">
                    {result.extractedData.address}
                    {result.addressVerified !== undefined && (
                      <span className="verification-icon">
                        {result.addressVerified ? (
                          <FaCheckCircle className="verified-icon" title="Address verified via Melissa" />
                        ) : (
                          <FaTimesCircle className="unverified-icon" title="Address not verified" />
                        )}
                      </span>
                    )}
                    {result.addressFromMelissa && (
                      <span className="melissa-badge" title="Address from Melissa">M</span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  {result.melissaLookupAttempted ? (
                    <span className="lookup-attempted">
                      Not found <span className="lookup-info">(lookup attempted)</span>
                    </span>
                  ) : (
                    <span className="not-detected">Not Detected</span>
                  )}
                </>
              )}
            </span>
          </div>
          
          {/* Address Comparison if applicable */}
          {renderAddressComparison()}
          
          <div className="data-item combined-zipstate">
            <div className="zip-section">
              <span className="label">Zip:</span>
              <span className="value">
                {result.extractedData.zip ? (
                  <span className={result.invalidZip ? "invalid-value" : ""}>
                    {result.extractedData.zip}
                    {result.invalidZip && (
                      <span className="invalid-badge" title="Invalid ZIP code">!</span>
                    )}
                    {result.zipMismatch && (
                      <span className="mismatch-badge" title="ZIP code mismatch between Melissa and transcript">≠</span>
                    )}
                  </span>
                ) : (
                  <span className="not-detected">Not Detected</span>
                )}
              </span>
            </div>
            <div className="state-section">
              <span className="label">State:</span>
              <span className="value">{displayValue(result.extractedData.state)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Auto Insurance Section */}
      <div className="insurance-section">
        <h4>Auto Insurance:</h4>
        <div className="data-grid">
          <div className="data-item">
            <span className="label">Main Vehicle:</span>
            <span className="value">
              {result.extractedData.autoInsurance?.mainVehicle?.year || 
               result.extractedData.autoInsurance?.mainVehicle?.make || 
               result.extractedData.autoInsurance?.mainVehicle?.model ? (
                <>
                  {result.extractedData.autoInsurance.mainVehicle.year && 
                    <span className="vehicle-year">{result.extractedData.autoInsurance.mainVehicle.year}</span>}
                  {result.extractedData.autoInsurance.mainVehicle.make && 
                    <span className="vehicle-make">{result.extractedData.autoInsurance.mainVehicle.make}</span>}
                  {result.extractedData.autoInsurance.mainVehicle.model && 
                    <span className="vehicle-model">{result.extractedData.autoInsurance.mainVehicle.model}</span>}
                  {result.extractedData.autoInsurance.mainVehicle.corrected && (
                    <span className="correction-badge" title={`Originally heard as: ${result.extractedData.autoInsurance.mainVehicle.originalText}`}>
                      Corrected
                    </span>
                  )}
                  {result.extractedData.autoInsurance.mainVehicle.potentialHallucination && (
                    <span className="hallucination-warning" title="This vehicle information may be hallucinated - not found in transcript">
                      <FaExclamationTriangle className="hallucination-icon" /> Potential hallucination
                    </span>
                  )}
                  {result.extractedData.autoInsurance.mainVehicle.suggestedCorrection && (
                    <div className="vehicle-suggestion">
                      <span className="suggestion-icon" title="AI suggests this correction">💡</span>
                      <span className="suggestion-text">
                        Suggested correction: 
                        {result.extractedData.autoInsurance.mainVehicle.suggestedCorrection.year && 
                          <span className="vehicle-year">{result.extractedData.autoInsurance.mainVehicle.suggestedCorrection.year}</span>}
                        {result.extractedData.autoInsurance.mainVehicle.suggestedCorrection.make && 
                          <span className="vehicle-make">{result.extractedData.autoInsurance.mainVehicle.suggestedCorrection.make}</span>}
                        {result.extractedData.autoInsurance.mainVehicle.suggestedCorrection.model && 
                          <span className="vehicle-model">{result.extractedData.autoInsurance.mainVehicle.suggestedCorrection.model}</span>}
                        <span className="suggestion-reason">({result.extractedData.autoInsurance.mainVehicle.suggestedCorrection.reason})</span>
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <span className="not-detected">Not Detected</span>
              )}
            </span>
          </div>
          
          <div className="data-item">
            <span className="label">Secondary Vehicle:</span>
            <span className="value">
              {result.extractedData.autoInsurance?.secondaryVehicle?.year || 
               result.extractedData.autoInsurance?.secondaryVehicle?.make || 
               result.extractedData.autoInsurance?.secondaryVehicle?.model ? (
                <>
                  {result.extractedData.autoInsurance.secondaryVehicle.year && 
                    <span className="vehicle-year">{result.extractedData.autoInsurance.secondaryVehicle.year}</span>}
                  {result.extractedData.autoInsurance.secondaryVehicle.make && 
                    <span className="vehicle-make">{result.extractedData.autoInsurance.secondaryVehicle.make}</span>}
                  {result.extractedData.autoInsurance.secondaryVehicle.model && 
                    <span className="vehicle-model">{result.extractedData.autoInsurance.secondaryVehicle.model}</span>}
                  {result.extractedData.autoInsurance.secondaryVehicle.corrected && (
                    <span className="correction-badge" title={`Originally heard as: ${result.extractedData.autoInsurance.secondaryVehicle.originalText}`}>
                      Corrected
                    </span>
                  )}
                  {result.extractedData.autoInsurance.secondaryVehicle.potentialHallucination && (
                    <span className="hallucination-warning" title="This vehicle information may be hallucinated - not found in transcript">
                      <FaExclamationTriangle className="hallucination-icon" /> Potential hallucination
                    </span>
                  )}
                  {result.extractedData.autoInsurance.secondaryVehicle.suggestedCorrection && (
                    <div className="vehicle-suggestion">
                      <span className="suggestion-icon" title="AI suggests this correction">💡</span>
                      <span className="suggestion-text">
                        Suggested correction: 
                        {result.extractedData.autoInsurance.secondaryVehicle.suggestedCorrection.year && 
                          <span className="vehicle-year">{result.extractedData.autoInsurance.secondaryVehicle.suggestedCorrection.year}</span>}
                        {result.extractedData.autoInsurance.secondaryVehicle.suggestedCorrection.make && 
                          <span className="vehicle-make">{result.extractedData.autoInsurance.secondaryVehicle.suggestedCorrection.make}</span>}
                        {result.extractedData.autoInsurance.secondaryVehicle.suggestedCorrection.model && 
                          <span className="vehicle-model">{result.extractedData.autoInsurance.secondaryVehicle.suggestedCorrection.model}</span>}
                        <span className="suggestion-reason">({result.extractedData.autoInsurance.secondaryVehicle.suggestedCorrection.reason})</span>
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <span className="not-detected">Not Detected</span>
              )}
            </span>
          </div>
          
          <div className="data-item">
            <span className="label">Current Provider:</span>
            <span className="value">
              {displayInsuranceProvider(result.extractedData.autoInsurance?.currentProvider || '')}
            </span>
          </div>
        </div>
      </div>
      
      {/* Home Insurance Section */}
      <div className="insurance-section">
        <h4>Home Insurance:</h4>
        <div className="data-grid">
          <div className="data-item">
            <span className="label">Interested:</span>
            <span className="value">
              {displayYesNo(result.extractedData.homeInsurance?.interested || null)}
            </span>
          </div>
          <div className="data-item">
            <span className="label">Ownership:</span>
            <span className="value">
              {result.extractedData.homeInsurance?.ownership || <span className="not-detected">Not Detected</span>}
            </span>
          </div>
          <div className="data-item">
            <span className="label">Home Type:</span>
            <span className="value">
              {result.extractedData.homeInsurance?.homeType || <span className="not-detected">Not Detected</span>}
            </span>
          </div>
          <div className="data-item">
            <span className="label">Current Provider:</span>
            <span className="value">
              {displayInsuranceProvider(result.extractedData.homeInsurance?.currentProvider || '')}
            </span>
          </div>
        </div>
      </div>
      
      {/* Health Insurance Section */}
      <div className="insurance-section">
        <h4>Health Insurance:</h4>
        <div className="data-grid">
          <div className="data-item">
            <span className="label">Interested:</span>
            <span className="value">
              {displayYesNo(result.extractedData.healthInsurance?.interested || null)}
            </span>
          </div>
          <div className="data-item">
            <span className="label">Household Size:</span>
            <span className="value">
              {result.extractedData.healthInsurance?.householdSize 
                ? result.extractedData.healthInsurance.householdSize 
                : <span className="not-detected">Not Detected</span>}
            </span>
          </div>
          <div className="data-item">
            <span className="label">Current Provider:</span>
            <span className="value">
              {displayInsuranceProvider(result.extractedData.healthInsurance?.currentProvider || '')}
            </span>
          </div>
        </div>
      </div>
      
      <div className="transcript">
        <h4>Call Transcript:</h4>
        <div className="transcript-text">
          {formatTranscript(transcript)}
        </div>
      </div>
    </div>
  );
};

export default ValidationResult;