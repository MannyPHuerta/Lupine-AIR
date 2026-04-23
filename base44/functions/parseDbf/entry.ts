import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Simple DBF parser
function parseDbfBuffer(buffer) {
    const view = new DataView(buffer);
    let offset = 0;

    // Read header
    const fileType = view.getUint8(offset++);
    const lastUpdate = {
        year: view.getUint8(offset++) + 1900,
        month: view.getUint8(offset++),
        day: view.getUint8(offset++)
    };
    const recordCount = view.getUint32(offset, true);
    offset += 4;
    const headerLength = view.getUint16(offset, true);
    offset += 2;
    const recordLength = view.getUint16(offset, true);
    offset += 2;

    offset = 32; // Skip rest of header

    // Read field descriptors
    const fields = [];
    while (offset < headerLength) {
        const fieldName = new TextDecoder().decode(buffer.slice(offset, offset + 11)).split('\0')[0];
        offset += 11;

        if (fieldName === '') break; // End of field descriptors

        const fieldType = String.fromCharCode(view.getUint8(offset++));
        offset += 4; // Skip reserved
        const fieldLength = view.getUint8(offset++);
        const decimalCount = view.getUint8(offset++);
        offset += 14; // Skip rest

        fields.push({
            name: fieldName.trim(),
            type: fieldType,
            size: fieldLength,
            decimalCount
        });
    }

    // Read sample records
    const records = [];
    let recordOffset = headerLength;
    const maxRecords = Math.min(10, recordCount);

    for (let i = 0; i < maxRecords; i++) {
        const isDeleted = view.getUint8(recordOffset++) === 42; // '*' = deleted
        const record = {};

        for (const field of fields) {
            const fieldData = new TextDecoder().decode(
                buffer.slice(recordOffset, recordOffset + field.size)
            ).trim();
            record[field.name] = fieldData;
            recordOffset += field.size;
        }

        records.push(record);
    }

    return {
        recordCount,
        fieldCount: fields.length,
        fields,
        sampleRecords: records
    };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { fileUrl } = body;

        if (!fileUrl) {
            return Response.json({ error: 'fileUrl required' }, { status: 400 });
        }

        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
            return Response.json({ error: 'Failed to fetch file' }, { status: 400 });
        }

        const arrayBuffer = await fileResponse.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const result = parseDbfBuffer(buffer);

        return Response.json({
            success: true,
            ...result
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});