import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function cleanText(text) {
  if (!text) return '';
  // Remove leading control characters and ")"
  return text.replace(/^[\x00-\x1F)]+/, '').trim();
}

// Parse all fields from an inventory record
function parseInvRecord(fields) {
  if (!fields || fields.length === 0) return null;
  
  // Clean all field values
  const cleanFields = fields.map(f => cleanText(f)).filter(f => f.length > 0);
  
  if (cleanFields.length === 0) return null;
  
  // Extract smart assignments based on field patterns
  const assignedTo = [];
  const serialNumbers = [];
  let location = '';
  let disposition = '';
  let branchCode = '';
  
  for (const field of cleanFields) {
    // Branch codes: single letters followed by numbers (p9k, l9k, y9k, etc.)
    if (/^[a-z]\d[a-z]$/i.test(field)) {
      branchCode = field;
    }
    // Serial patterns: S/N, SN-, model codes with numbers
    else if (/^[A-Z].*\d{4,}$/.test(field) || /^S\/N/.test(field) || /SN-/.test(field)) {
      serialNumbers.push(field);
    }
    // Names: All caps, contains comma or "EMPLOYEE"
    else if (/^[A-Z\s,\-()]+$/.test(field) && (field.includes(',') || field.includes('EMPLOYEE') || /^[A-Z\s]+$/.test(field) && field.length > 5)) {
      if (!assignedTo.includes(field) && assignedTo.length < 3) {
        assignedTo.push(field);
      }
    }
    // Location patterns: contains keywords like WAREHOUSE, MCALLEN, branch names, "LOSS"
    else if (/WAREHOUSE|MCALLEN|WESLACO|HARLINGEN|CORPUS|BROWNSV|LOSS|AUCTION|MAINTENANCE/.test(field)) {
      location = field;
    }
    // Condition/disposition: short descriptive phrases
    else if (field.length < 40 && /BROKEN|REPAIR|CONDITION|EXTRA|INCLUDES|WITH|W\/|CAN ADD/.test(field)) {
      disposition = field;
    }
  }
  
  return {
    description1: cleanFields[0] || '',
    description2: cleanFields.length > 1 ? cleanFields[1] : '',
    serialNumber: serialNumbers.join(' | '),
    assignedTo,
    location,
    disposition,
    branchCode,
    rawFields: cleanFields
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { csvFileUrl, sessionId } = await req.json();
    if (!csvFileUrl || !sessionId) {
      return Response.json({ error: 'csvFileUrl and sessionId required' }, { status: 400 });
    }
    
    // Fetch the CSV file
    const csvResponse = await fetch(csvFileUrl);
    if (!csvResponse.ok) {
      return Response.json({ error: 'Failed to fetch CSV file' }, { status: 500 });
    }
    const csvText = await csvResponse.text();
    
    // Parse CSV (simple split on newlines and commas, handling quoted fields)
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const recordsToInsert = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        // Simple CSV parse (handles basic quoted fields)
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.replace(/^"|"$/g, ''));
        
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = values[idx];
        });
        
        // Extract raw fields (all F*_value columns)
        const rawFields = [];
        for (let j = 1; j <= 64; j++) {
          const fieldValue = obj[`F${j}_value`];
          if (fieldValue && fieldValue.trim()) {
            rawFields.push(fieldValue.trim());
          }
        }
        
        const parsed = parseInvRecord(rawFields);
        if (!parsed) {
          errorCount++;
          continue;
        }
        
        const item = {
          recordIndex: parseInt(obj['RecordIndex']) || 0,
          byteOffset: parseInt(obj['ByteOffset']) || 0,
          description1: parsed.description1,
          description2: parsed.description2,
          serialNumber: parsed.serialNumber,
          assignedTo: parsed.assignedTo,
          location: parsed.location,
          disposition: parsed.disposition,
          branchCode: parsed.branchCode,
          rawFields: parsed.rawFields,
          migrationSource: 'inv_file',
          migrationSessionId: sessionId
        };
        
        recordsToInsert.push(item);
        successCount++;
      } catch (err) {
        errorCount++;
      }
    }
    
    // Bulk insert
    if (recordsToInsert.length > 0) {
      await base44.entities.InventoryItem.bulkCreate(recordsToInsert);
    }
    
    return Response.json({
      success: true,
      totalProcessed: successCount + errorCount,
      imported: recordsToInsert.length,
      errors: errorCount,
      sessionId
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});