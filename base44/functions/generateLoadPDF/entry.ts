import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

const TRUCK_SPECS = {
  '18wheeler': { name: '18-Wheeler', weightCapacity: 80000, volumeCapacity: 3000 },
  '26ft': { name: '26ft Box Truck', weightCapacity: 26000, volumeCapacity: 1400 },
  '24ft': { name: '24ft Box Truck', weightCapacity: 24000, volumeCapacity: 1200 },
  'sprinter': { name: 'Sprinter Van', weightCapacity: 5000, volumeCapacity: 300 },
};

Deno.serve(async (req) => {
  try {
    const { truck, distance } = await req.json();

    if (!truck || !truck.items) {
      return Response.json({ error: 'Invalid truck data' }, { status: 400 });
    }

    const spec = TRUCK_SPECS[truck.type] || TRUCK_SPECS['18wheeler'];
    const totalWeight = truck.items.reduce((sum, item) => sum + (item.weight || 500), 0);
    const totalVolume = truck.items.reduce((sum, item) => sum + (item.volume || 10), 0);
    const weightPercent = ((totalWeight / spec.weightCapacity) * 100).toFixed(1);
    const volumePercent = ((totalVolume / spec.volumeCapacity) * 100).toFixed(1);

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 15;

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Load Manifest', pageWidth / 2, yPos, { align: 'center' });

    yPos += 12;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`${truck.name} (${spec.name})`, 15, yPos);

    yPos += 8;
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 15, yPos);

    // Summary stats
    yPos += 12;
    doc.setFont(undefined, 'bold');
    doc.text('Load Summary', 15, yPos);

    yPos += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    const summaryData = [
      [`Total Weight: ${(totalWeight / 1000).toFixed(1)}k lbs (${weightPercent}% capacity)`, ''],
      [`Total Volume: ${totalVolume.toLocaleString()} cu ft (${volumePercent}% capacity)`, ''],
      [`Items: ${truck.items.length}`, distance ? `Distance: ${distance * 2} mi round-trip` : ''],
    ];

    summaryData.forEach(([left, right]) => {
      doc.text(left, 15, yPos);
      if (right) doc.text(right, pageWidth - 15, yPos, { align: 'right' });
      yPos += 5;
    });

    // Items table
    yPos += 6;
    doc.setFont(undefined, 'bold');
    doc.text('Equipment', 15, yPos);

    yPos += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);

    // Table headers
    const col1 = 15;
    const col2 = 100;
    const col3 = 140;
    const col4 = 170;

    doc.text('Item Name', col1, yPos);
    doc.text('Weight', col2, yPos);
    doc.text('Volume', col3, yPos);
    doc.text('Qty', col4, yPos);

    yPos += 5;
    doc.setDrawColor(200);
    doc.line(15, yPos - 1, pageWidth - 15, yPos - 1);

    yPos += 2;

    // Table rows
    truck.items.forEach((item) => {
      const itemName = item.name || 'Unknown';
      const weight = `${(item.weight || 500) / 1000}k lbs`;
      const volume = `${item.volume || 10} cu ft`;
      const qty = item.quantity || 1;

      // Wrap long names
      const wrappedName = doc.splitTextToSize(itemName, col2 - col1 - 5);
      const lineHeight = 4;
      const rowHeight = wrappedName.length * lineHeight + 2;

      // Check for page break
      if (yPos + rowHeight > pageHeight - 15) {
        doc.addPage();
        yPos = 15;
      }

      wrappedName.forEach((line, idx) => {
        doc.text(line, col1, yPos + idx * lineHeight);
      });

      doc.text(weight, col2, yPos);
      doc.text(volume, col3, yPos);
      doc.text(qty.toString(), col4, yPos);

      yPos += rowHeight;
    });

    // Footer
    yPos += 8;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Driver Signature: ___________________________', 15, yPos);
    yPos += 7;
    doc.text('Date: ___________________________', 15, yPos);

    // Generate PDF as base64
    const pdfData = doc.output('arraybuffer');
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfData)));

    return Response.json({
      success: true,
      pdf: `data:application/pdf;base64,${base64Pdf}`,
      fileName: `${truck.name.replace(/\s+/g, '_')}_manifest.pdf`,
    });
  } catch (error) {
    console.error('generateLoadPDF error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});