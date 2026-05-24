/**
 * Helper functions for smart customer verification caching
 * Reduces unnecessary AI calls and phone verifications for repeat customers
 */

/**
 * Check if a customer needs ID verification
 * Returns true if verification is required (new customer or not verified yet)
 */
export function shouldVerifyId(customer) {
  if (!customer || customer.id === 'walkin') return false;
  return !customer.idVerified;
}

/**
 * Check if a customer needs phone verification
 * Returns true if phone needs verification (new customer or phone changed)
 */
export function shouldVerifyPhone(customer, phoneToVerify) {
  if (!customer || customer.id === 'walkin') return false;
  
  // If already verified and phone hasn't changed, skip
  if (customer.phoneVerified && customer.phone === phoneToVerify) return false;
  
  // If phone is new/different, needs verification
  return true;
}

/**
 * Check if a customer needs business verification
 * Returns true if verification is required (not verified or cert expired)
 */
export function shouldVerifyBusiness(customer) {
  if (!customer || customer.accountType !== 'business') return false;
  
  // If already verified and cert not expired, skip
  if (customer.idVerified && customer.taxExemptCertNumber) {
    if (customer.taxExemptExpiry) {
      const expiryDate = new Date(customer.taxExemptExpiry);
      if (expiryDate > new Date()) return false;
    }
  }
  
  return true;
}

/**
 * Check if a customer is eligible to rent (not on hold/blacklist)
 */
export function canRentCustomer(customer) {
  if (!customer) return true; // Walk-in customers can rent
  
  if (customer.blacklisted) return false;
  if (customer.creditHold) return false;
  
  return true;
}

/**
 * Get verification summary string for display
 */
export function getVerificationSummary(customer) {
  if (!customer || customer.id === 'walkin') return 'Walk-in';
  
  const verified = [];
  const flags = [];
  
  if (customer.idVerified) verified.push('ID');
  if (customer.phoneVerified) verified.push('Phone');
  if (customer.taxExempt) verified.push('Tax-Exempt');
  
  if (customer.blacklisted) flags.push('Blacklisted');
  if (customer.creditHold) flags.push('Credit Hold');
  
  const summary = verified.length > 0 ? `✓ ${verified.join(', ')}` : 'Not verified';
  const flagStr = flags.length > 0 ? ` ⚠️ ${flags.join(', ')}` : '';
  
  return summary + flagStr;
}