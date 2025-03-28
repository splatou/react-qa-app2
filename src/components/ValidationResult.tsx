import React, { useEffect } from 'react';
import { ValidationResult as ValidationResultType, ValidationStatus } from '../types';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

interface ValidationResultProps {
  result: ValidationResultType;
  transcript: string;
}

const ValidationResult: React.FC<ValidationResultProps> = ({ result, transcript }) => {
  // Debug logging to help diagnose data issues
  useEffect(() => {
    console.log("ValidationResult received:", {
      transcriptData: result.transcriptData,
      melissaData: result.melissaData,
      extractedData: result.extractedData,
      verification: result.verification,
    });

    // Check for data inconsistencies between transcriptData, melissaData, and extractedData
    if (
      result.extractedData.firstName &&
      (!result.transcriptData?.firstName || !result.melissaData?.firstName)
    ) {
      console.warn("Data inconsistency: Final data exists but source data is missing for firstName");
    }
    if (
      result.extractedData.lastName &&
      (!result.transcriptData?.lastName || !result.melissaData?.lastName)
    ) {
      console.warn("Data inconsistency: Final data exists but source data is missing for lastName");
    }
    if (
      result.extractedData.dob &&
      (!result.transcriptData?.dob || !result.melissaData?.dob)
    ) {
      console.warn("Data inconsistency: Final data exists but source data is missing for DOB");
    }
  }, [result]);

  // Helper function to display values or "Not Detected"
  const displayValue = (value: string | undefined) => {
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
        return (
          <span className="badge badge-success" aria-label="Approved">
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="badge badge-danger" aria-label="Rejected">
            Rejected
          </span>
        );
      case 'needs_review':
        return (
          <span className="badge badge-warning" aria-label="Needs Review">
            Needs Review
          </span>
        );
      default:
        return null;
    }
  };

  // Helper function to display verification badge only when there's data to compare
  const getVerificationBadge = (
    isMatch: boolean | undefined,
    transcriptValue: string | undefined,
    melissaValue: string | undefined,
    mismatchReason?: string
  ) => {
    // Only show verification badge if both values exist and can be compared
    if (isMatch === undefined || !transcriptValue || !melissaValue) return null;

    return isMatch ? (
      <span
        className="verification-badge match"
        aria-label="Match"
        title="Matches Melissa data"
      >
        <FaCheckCircle className="verified-icon" /> Match
      </span>
    ) : (
      <span
        className="verification-badge mismatch"
        aria-label="Mismatch"
        title={mismatchReason || "Does not match Melissa data"}
      >
        <FaTimesCircle className="unverified-icon" /> Mismatch
      </span>
    );
  };

  // Format the transcript for better readability
  const formatTranscript = (text: string) => {
    return text.split(/(?<=[.!?])\s+/).map((sentence, index) => (
      <p key={index} className="transcript-sentence">{sentence}</p>
    ));
  };

  // Compute DOB mismatch reason
  const dobMismatchReason =
    result.transcriptData?.dob && result.melissaData?.dob
      ? `Transcript DOB (${result.transcriptData.dob}) does not match Melissa DOB (${result.melissaData.dob})`
      : undefined;

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
            <FaExclamationTriangle aria-label="Warning" />
          </div>
          <div className="alert-content">
            <h4>Notes For Review</h4>
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

      {/* Call Transcript Data Section */}
      <div className="data-section call-data">
        <div className="section-header">
          <h4>
            <i className="section-icon call-icon">📞</i>
            Call Transcript Data
          </h4>
        </div>
        <div className="data-grid">
          <div className="data-item">
            <span className="label">Name:</span>
            <span className="value">
              {(result.transcriptData?.firstName || result.transcriptData?.lastName) ? (
                <>
                  {`${result.transcriptData.firstName || ''} ${result.transcriptData.lastName || ''}`.trim()}
                  {result.verification?.nameMatches === false && result.transcriptData?.firstName && !result.transcriptData?.lastName && (
                    <span className="name-note">
                      (Only first name provided in transcript)
                    </span>
                  )}
                </>
              ) : (
                <span className="not-detected">Not Detected</span>
              )}
            </span>
            {getVerificationBadge(
              result.verification?.nameMatches,
              `${result.transcriptData?.firstName || ''} ${result.transcriptData.lastName || ''}`.trim(),
              `${result.melissaData?.firstName || ''} ${result.melissaData.lastName || ''}`.trim(),
              `Transcript name (${result.transcriptData?.firstName || ''} ${result.transcriptData.lastName || ''}`.trim() +
                `) does not match Melissa name (${result.melissaData?.firstName || ''} ${result.melissaData.lastName || ''}`.trim() + `)`
            )}
          </div>

          <div className="data-item">
            <span className="label">Address:</span>
            <span className="value">{displayValue(result.transcriptData?.address)}</span>
            {getVerificationBadge(
              result.verification?.addressMatches,
              result.transcriptData?.address,
              result.melissaData?.address
            )}
          </div>

          <div className="data-item">
            <span className="label">ZIP:</span>
            <span className="value">{displayValue(result.transcriptData?.zip)}</span>
            {getVerificationBadge(
              result.verification?.zipMatches,
              result.transcriptData?.zip,
              result.melissaData?.zip
            )}
          </div>

          <div className="data-item">
            <span className="label">State:</span>
            <span className="value">{displayValue(result.transcriptData?.state)}</span>
            {getVerificationBadge(
              result.verification?.stateMatches,
              result.transcriptData?.state,
              result.melissaData?.state
            )}
          </div>

          <div className="data-item">
            <span className="label">Phone:</span>
            <span className="value">{displayValue(result.transcriptData?.phoneNumber)}</span>
          </div>

          <div className="data-item">
            <span className="label">Email:</span>
            <span className="value">{displayValue(result.transcriptData?.email)}</span>
          </div>

          <div className="data-item">
            <span className="label">DOB:</span>
            <span className="value">{displayValue(result.transcriptData?.dob)}</span>
            {getVerificationBadge(
              result.transcriptData?.dob && result.melissaData?.dob
                ? result.transcriptData.dob === result.melissaData.dob
                : undefined,
              result.transcriptData?.dob,
              result.melissaData?.dob,
              dobMismatchReason
            )}
          </div>
        </div>
      </div>

      {/* Melissa Data Section */}
      <div className="data-section melissa-data">
        <div className="section-header">
          <h4>
            <i className="section-icon melissa-icon">🔍</i>
            Melissa Data
            {!result.melissaLookupAttempted && (
              <span className="lookup-status not-attempted">
                <FaInfoCircle /> Lookup Not Attempted
              </span>
            )}
          </h4>
        </div>
        {result.melissaLookupAttempted ? (
          <div className="data-grid">
            <div className="data-item">
              <span className="label">Name:</span>
              <span className="value">
                {(result.melissaData?.firstName || result.melissaData?.lastName) ? (
                  `${result.melissaData.firstName || ''} ${result.melissaData.lastName || ''}`.trim()
                ) : (
                  <span className="not-detected">Not Found</span>
                )}
              </span>
              {result.melissaData?.isVerified && (
                <span
                  className="verified-tag"
                  title="Melissa verified this data"
                  aria-label="Verified by Melissa"
                >
                  <FaCheckCircle className="verified-icon" /> Verified
                </span>
              )}
            </div>

            <div className="data-item">
              <span className="label">Address:</span>
              <span className="value">{displayValue(result.melissaData?.address)}</span>
              {result.melissaData?.isVerified && (
                <span
                  className="verified-tag"
                  title="Melissa verified this data"
                  aria-label="Verified by Melissa"
                >
                  <FaCheckCircle className="verified-icon" /> Verified
                </span>
              )}
            </div>

            <div className="data-item">
              <span className="label">ZIP:</span>
              <span className="value">{displayValue(result.melissaData?.zip)}</span>
            </div>

            <div className="data-item">
              <span className="label">State:</span>
              <span className="value">{displayValue(result.melissaData?.state)}</span>
            </div>

            <div className="data-item">
              <span className="label">City:</span>
              <span className="value">{displayValue(result.melissaData?.city)}</span>
            </div>

            <div className="data-item">
              <span className="label">Phone:</span>
              <span className="value">{displayValue(result.melissaData?.phoneNumber)}</span>
            </div>

            <div className="data-item">
              <span className="label">DOB:</span>
              <span className="value">{displayValue(result.melissaData?.dob)}</span>
            </div>

            <div className="data-item">
              <span className="label">Email:</span>
              <span className="value">{displayValue(result.melissaData?.email)}</span>
            </div>
          </div>
        ) : (
          <div className="no-data-message">
            No Melissa data lookup was performed for this lead.
          </div>
        )}
      </div>

      {/* Auto Insurance Section */}
      <div className="insurance-section">
        <h4>Auto Insurance (Merged Data):</h4>
        <div className="data-grid">
          <div className="data-item">
            <span className="label">Main Vehicle:</span>
            <span className="value">
              {result.extractedData.autoInsurance?.mainVehicle?.year ||
              result.extractedData.autoInsurance?.mainVehicle?.make ||
              result.extractedData.autoInsurance?.mainVehicle?.model ? (
                <>
                  {result.extractedData.autoInsurance.mainVehicle.year && (
                    <span className="vehicle-year">
                      {result.extractedData.autoInsurance.mainVehicle.year}
                    </span>
                  )}
                  {result.extractedData.autoInsurance.mainVehicle.make && (
                    <span className="vehicle-make">
                      {result.extractedData.autoInsurance.mainVehicle.make}
                    </span>
                  )}
                  {result.extractedData.autoInsurance.mainVehicle.model && (
                    <span className="vehicle-model">
                      {result.extractedData.autoInsurance.mainVehicle.model}
                    </span>
                  )}
                  {result.extractedData.autoInsurance.mainVehicle.suggestedCorrection && (
                    <div className="vehicle-suggestion">
                      <span className="suggestion-icon" title="AI suggests this correction">
                        💡
                      </span>
                      <span className="suggestion-text">
                        Suggested correction:
                        {result.extractedData.autoInsurance.mainVehicle.suggestedCorrection.year && (
                          <span className="vehicle-year">
                            {result.extractedData.autoInsurance.mainVehicle.suggestedCorrection.year}
                          </span>
                        )}
                        {result.extractedData.autoInsurance.mainVehicle.suggestedCorrection.make && (
                          <span className="vehicle-make">
                            {result.extractedData.autoInsurance.mainVehicle.suggestedCorrection.make}
                          </span>
                        )}
                        {result.extractedData.autoInsurance.mainVehicle.suggestedCorrection.model && (
                          <span className="vehicle-model">
                            {result.extractedData.autoInsurance.mainVehicle.suggestedCorrection.model}
                          </span>
                        )}
                        <span className="suggestion-reason">
                          ({result.extractedData.autoInsurance.mainVehicle.suggestedCorrection.reason})
                        </span>
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
                  {result.extractedData.autoInsurance.secondaryVehicle.year && (
                    <span className="vehicle-year">
                      {result.extractedData.autoInsurance.secondaryVehicle.year}
                    </span>
                  )}
                  {result.extractedData.autoInsurance.secondaryVehicle.make && (
                    <span className="vehicle-make">
                      {result.extractedData.autoInsurance.secondaryVehicle.make}
                    </span>
                  )}
                  {result.extractedData.autoInsurance.secondaryVehicle.model && (
                    <span className="vehicle-model">
                      {result.extractedData.autoInsurance.secondaryVehicle.model}
                    </span>
                  )}
                  {result.extractedData.autoInsurance.secondaryVehicle.suggestedCorrection && (
                    <div className="vehicle-suggestion">
                      <span className="suggestion-icon" title="AI suggests this correction">
                        💡
                      </span>
                      <span className="suggestion-text">
                        Suggested correction:
                        {result.extractedData.autoInsurance.secondaryVehicle.suggestedCorrection.year && (
                          <span className="vehicle-year">
                            {result.extractedData.autoInsurance.secondaryVehicle.suggestedCorrection.year}
                          </span>
                        )}
                        {result.extractedData.autoInsurance.secondaryVehicle.suggestedCorrection.make && (
                          <span className="vehicle-make">
                            {result.extractedData.autoInsurance.secondaryVehicle.suggestedCorrection.make}
                          </span>
                        )}
                        {result.extractedData.autoInsurance.secondaryVehicle.suggestedCorrection.model && (
                          <span className="vehicle-model">
                            {result.extractedData.autoInsurance.secondaryVehicle.suggestedCorrection.model}
                          </span>
                        )}
                        <span className="suggestion-reason">
                          ({result.extractedData.autoInsurance.secondaryVehicle.suggestedCorrection.reason})
                        </span>
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
        <h4>Home Insurance (Merged Data):</h4>
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
              {result.extractedData.homeInsurance?.ownership || (
                <span className="not-detected">Not Detected</span>
              )}
            </span>
          </div>
          <div className="data-item">
            <span className="label">Home Type:</span>
            <span className="value">
              {result.extractedData.homeInsurance?.homeType || (
                <span className="not-detected">Not Detected</span>
              )}
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
        <h4>Health Insurance (Merged Data):</h4>
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
              {result.extractedData.healthInsurance?.householdSize ? (
                result.extractedData.healthInsurance.householdSize
              ) : (
                <span className="not-detected">Not Detected</span>
              )}
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

      {/* Call Agent Feedback Section */}
      <div className="agent-feedback-section">
        <h4>Call Agent Feedback:</h4>
        <div className="data-grid">
          <div className="data-item">
            <span className="label">Asked for Best Callback Number:</span>
            <span className="value">
              {displayYesNo(result.extractedData.agentFeedback?.askedForCallbackNumber || null)}
            </span>
          </div>
          <div className="data-item">
            <span className="label">Asked for First and Last Name:</span>
            <span className="value">
              {displayYesNo(result.extractedData.agentFeedback?.askedForFirstAndLastName || null)}
            </span>
          </div>
          <div className="data-item">
            <span className="label">Asked for Year, Make, Model of Vehicle:</span>
            <span className="value">
              {displayYesNo(result.extractedData.agentFeedback?.askedForVehicleYearMakeModel || null)}
            </span>
          </div>
          <div className="data-item">
            <span className="label">Asked for Secondary Vehicle:</span>
            <span className="value">
              {displayYesNo(result.extractedData.agentFeedback?.askedForSecondaryVehicle || null)}
            </span>
          </div>
          <div className="data-item">
            <span className="label">Asked for Current Insurance Provider:</span>
            <span className="value">
              {displayYesNo(result.extractedData.agentFeedback?.askedForCurrentInsuranceProvider || null)}
            </span>
          </div>
          <div className="data-item">
            <span className="label">Asked if Customer Owns/Rents Home:</span>
            <span className="value">
              {displayYesNo(result.extractedData.agentFeedback?.askedForOwnRentHome || null)}
            </span>
          </div>
          <div className="data-item">
            <span className="label">Asked for Date of Birth:</span>
            <span className="value">
              {displayYesNo(result.extractedData.agentFeedback?.askedForDob || null)}
            </span>
          </div>
          <div className="data-item">
            <span className="label">Asked for Address:</span>
            <span className="value">
              {displayYesNo(result.extractedData.agentFeedback?.askedForAddress || null)}
            </span>
          </div>
        </div>
      </div>

      <div className="transcript">
        <h4>Call Transcript:</h4>
        <div className="transcript-text">{formatTranscript(transcript)}</div>
      </div>
    </div>
  );
};

export default ValidationResult;