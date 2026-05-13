import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Helper to run the full analysis and save back to the record
async function runAnalysis(base44, rfqId, extractedText, issuingOrg, rfqId_input, companyInfo) {
  const docText = extractedText.slice(0, 10000);
  const companyName = companyInfo?.name || 'AIR Equipment Rental';
  const companyAddress = companyInfo?.address || '';
  const companyPhone = companyInfo?.phone || '';
  const companyEmail = companyInfo?.email || '';
  const companyInsurance = companyInfo?.insuranceInfo || '';

  // Fetch past RFQ history
  let historyContext = 'No previous history.';
  if (issuingOrg) {
    let orgHistory = await base44.asServiceRole.entities.RFQRecord.filter({ issuingOrg });
    if (rfqId_input) orgHistory = orgHistory.filter(r => r.id !== rfqId_input);
    if (orgHistory.length > 0) {
      historyContext = orgHistory.slice(0, 5).map(r =>
        `- RFQ ${r.rfqNumber || 'N/A'} | Status: ${r.status} | Value: $${r.estimatedTotalValue || 0}`
      ).join('\n');
    }
  }

  // Run two parallel LLM calls
  const [metaResult, detailResult] = await Promise.all([
    base44.integrations.Core.InvokeLLM({
      prompt: `Extract key metadata from this RFQ document. Return null for any field not found.

RFQ TEXT:
${docText}

Return JSON with: issuingOrg, rfqNumber, title, orgType (municipal|county|state|federal|private|nonprofit|other), dueDate (YYYY-MM-DD), dueTime, submissionMethod (email|mail|portal|hand_delivery|fax), submissionAddress, contactName, contactEmail, contactPhone, suggestedFileName (format: "RFQ-YEAR-ORGABBREV-NUMBER_AIR-Response.pdf"), estimatedTotalValue (number in USD)`,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          issuingOrg: { type: 'string' },
          rfqNumber: { type: 'string' },
          title: { type: 'string' },
          orgType: { type: 'string' },
          dueDate: { type: 'string' },
          dueTime: { type: 'string' },
          submissionMethod: { type: 'string' },
          submissionAddress: { type: 'string' },
          contactName: { type: 'string' },
          contactEmail: { type: 'string' },
          contactPhone: { type: 'string' },
          suggestedFileName: { type: 'string' },
          estimatedTotalValue: { type: 'number' },
        }
      }
    }),

    base44.integrations.Core.InvokeLLM({
      prompt: `You are a senior government procurement specialist writing a complete, winning bid response for ${companyName}, an equipment rental company specializing in tents, generators, tables, chairs, staging, and event/construction equipment.

Company: ${companyName}
Address: ${companyAddress}
Phone: ${companyPhone}
Email: ${companyEmail}
Insurance/Bonding Info: ${companyInsurance}

RFQ TEXT:
${docText}

Past history with this org: ${historyContext}

Analyze this RFQ and return JSON with:

- aiAnalysisSummary: 3-4 paragraph detailed analysis covering: (1) what is being requested and why, (2) key mandatory requirements and any risky clauses, (3) our competitive positioning and win strategy, (4) any red flags or clarification needed

- orgHistorySummary: summary of prior bid history or, if none, research-based best practices for bidding to this type of organization (federal/state/municipal/etc.)

- suggestedResponseFormat: detailed outline of the required response document structure with section headings, page estimates, and what to include in each section

- extractedRequirements: comprehensive array of ALL requirements found in the RFQ — each as { sectionNumber, sectionTitle, requirementText, requirementType (equipment|delivery|insurance|bonding|certification|pricing|timeline|documentation|other), isMandatory }

- complianceMatrix: one row per requirement with { sectionNumber, requirementSummary, complianceStatus (compliant|compliant_with_exception|non_compliant|not_applicable|pending_review), responseText (our specific statement addressing this requirement — be detailed and professional, 1-3 sentences), exceptionNote (if any), documentReference (e.g. "Certificate of Insurance attached", "See Exhibit A") }

- proposedLineItems: detailed equipment line items the RFQ requires — for each item provide realistic market rental pricing for South Texas/Gulf Coast region. Include { lineNumber, description (full spec detail), equipmentCategory, quantity, unit (each|day|week|month|event), unitPrice (realistic USD market rate — e.g. 20x40 tent ~$800-1200/event, 40x80 tent ~$3000-5000/event, generator ~$200-400/day, table ~$8-12/each, chair ~$2-4/each), totalPrice (quantity × unitPrice), specs (detailed technical specifications matching the RFQ requirements), notes }

- responseNarrative: a COMPLETE, PROFESSIONAL, MULTI-PAGE response document formatted in Markdown. This must include:
## [${companyName}]
### Response to: [RFQ Number and Title]
**Date:** [current date]
**Submitted To:** [org and contact]
**Submitted By:** ${companyName}, ${companyAddress}, ${companyPhone}, ${companyEmail}

Then include ALL of these sections with full detail:
1. **Executive Summary** — compelling 3-4 paragraph opening establishing our qualifications and commitment
2. **Company Overview** — who we are, years in business, service territory, certifications, insurance
3. **Technical Approach & Equipment Specifications** — detailed equipment specs matching every requirement in the RFQ, with dimensions, capacity, condition standards
4. **Delivery, Setup & Teardown Plan** — logistics, timeline, crew qualifications, safety procedures
5. **Pricing Schedule** — formatted Markdown table with all line items, unit prices, and totals
6. **Insurance & Bonding Compliance** — statement of coverage and compliance
7. **References** — 2-3 placeholder reference entries
8. **Certifications & Representations** — SAM.gov registration, small business status, any required certifications
9. **Acceptance & Signature Block** — formal closing

Write in formal government procurement language. Be specific, detailed, and professional throughout. Minimum 1000 words.`,
    model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          aiAnalysisSummary: { type: 'string' },
          orgHistorySummary: { type: 'string' },
          suggestedResponseFormat: { type: 'string' },
          extractedRequirements: { type: 'array', items: { type: 'object' } },
          complianceMatrix: { type: 'array', items: { type: 'object' } },
          proposedLineItems: { type: 'array', items: { type: 'object' } },
          responseNarrative: { type: 'string' },
        }
      }
    }),
  ]);

  const analysis = { ...metaResult, ...detailResult };
  console.log('Analysis complete. Org:', analysis.issuingOrg, '| RFQ#:', analysis.rfqNumber);

  // Save results back to the record
  await base44.asServiceRole.entities.RFQRecord.update(rfqId, {
    issuingOrg: analysis.issuingOrg || undefined,
    rfqNumber: analysis.rfqNumber || undefined,
    title: analysis.title || undefined,
    orgType: analysis.orgType || undefined,
    dueDate: analysis.dueDate || undefined,
    dueTime: analysis.dueTime || undefined,
    submissionMethod: analysis.submissionMethod || undefined,
    submissionAddress: analysis.submissionAddress || undefined,
    contactName: analysis.contactName || undefined,
    contactEmail: analysis.contactEmail || undefined,
    contactPhone: analysis.contactPhone || undefined,
    suggestedFileName: analysis.suggestedFileName || undefined,
    estimatedTotalValue: analysis.estimatedTotalValue || undefined,
    aiAnalysisSummary: analysis.aiAnalysisSummary || '',
    orgHistorySummary: analysis.orgHistorySummary || '',
    suggestedResponseFormat: analysis.suggestedResponseFormat || '',
    extractedRequirements: analysis.extractedRequirements || [],
    complianceMatrix: analysis.complianceMatrix || [],
    proposedLineItems: analysis.proposedLineItems || [],
    responseNarrative: analysis.responseNarrative || '',
    status: 'draft',
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rfqText, fileUrl, issuingOrg: inputOrg, rfqId, companyInfo } = await req.json();

    if (!rfqText && !fileUrl) {
      return Response.json({ error: 'Must provide rfqText or fileUrl' }, { status: 400 });
    }
    if (!rfqId) {
      return Response.json({ error: 'rfqId is required for async analysis' }, { status: 400 });
    }

    const issuingOrg = (!inputOrg || inputOrg.startsWith('Unknown')) ? null : inputOrg;

    // Extract text from uploaded file if needed
    let extractedText = rfqText || null;
    if (!extractedText && fileUrl) {
      console.log('Extracting text from uploaded file...');
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: 'object',
          properties: {
            full_text: { type: 'string', description: 'The complete text content of the document' }
          }
        }
      });
      if (extracted.status === 'success' && extracted.output?.full_text) {
        extractedText = extracted.output.full_text;
        console.log('Extracted', extractedText.length, 'chars from file');
      }
    }

    if (!extractedText) {
      return Response.json({ error: 'Could not extract text from file. Please paste the RFQ text directly.' }, { status: 400 });
    }

    // Mark record as analyzing immediately
    await base44.asServiceRole.entities.RFQRecord.update(rfqId, { status: 'analyzing' });

    // Fire-and-forget the heavy LLM work — respond immediately to avoid 502
    runAnalysis(base44, rfqId, extractedText, issuingOrg, rfqId, companyInfo).catch(err => {
      console.error('Background analysis failed:', err.message);
      base44.asServiceRole.entities.RFQRecord.update(rfqId, { status: 'received' }).catch(() => {});
    });

    // Return immediately — frontend will poll the record for status change
    return Response.json({ success: true, status: 'analyzing', message: 'Analysis started. Poll the record for completion.' });

  } catch (error) {
    console.error('analyzeRFQ error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});