export default function InvoiceTotals({ lines }) {
  const totals = lines.reduce((acc, line) => {
    const tax = line.taxable ? Math.round(line.baseAmount * 0.0825 * 100) / 100 : 0;
    return {
      rental: acc.rental + (line.baseAmount || 0),
      tax: acc.tax + tax,
      deposit: acc.deposit + (line.deposit || 0) * (line.quantity || 1),
    };
  }, { rental: 0, tax: 0, deposit: 0 });

  const grand = totals.rental + totals.tax + totals.deposit;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Rental Subtotal</span>
          <span>${totals.rental.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Sales Tax (8.25%)</span>
          <span>${totals.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Deposits</span>
          <span>${totals.deposit.toFixed(2)}</span>
        </div>
        <div className="border-t pt-3 flex justify-between text-lg font-bold">
          <span>Total Due</span>
          <span className="text-indigo-700">${grand.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}