import { useState } from "react";
import { ShoppingBag, Percent, Calendar, DollarSign, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function RentToOwnPanel({ rental, onClose }) {
  const [purchasePrice, setPurchasePrice] = useState(rental.purchasePrice || '');
  const [creditPercent, setCreditPercent] = useState(rental.rentToOwnCreditPercent || 50);
  const [expiryDate, setExpiryDate] = useState(rental.purchaseOptionExpiry || '');
  const [isConverting, setIsConverting] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const queryClient = useQueryClient();

  // Convert to rent-to-own mutation
  const convertMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.entities.Rental.update(rental.id, {
        isRentToOwn: true,
        purchasePrice: parseFloat(data.purchasePrice),
        rentToOwnCreditPercent: parseFloat(data.creditPercent),
        balanceRemaining: parseFloat(data.purchasePrice),
        amountCredited: 0,
        purchaseOptionExpiry: data.expiryDate,
        statusHistory: [
          ...(rental.statusHistory || []),
          {
            status: rental.status,
            changedAt: new Date().toISOString(),
            changedBy: (await base44.auth.me()).email,
            note: `Converted to rent-to-own. Purchase price: $${data.purchasePrice}, Credit: ${data.creditPercent}%`
          }
        ]
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental', rental.id] });
      setIsConverting(false);
      if (onClose) onClose();
    }
  });

  // Complete purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('completeRentToOwnPurchase', { rentalId: rental.id });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental', rental.id] });
      setIsPurchasing(false);
      if (onClose) onClose();
      alert('Purchase completed successfully! Equipment ownership transferred to customer.');
    },
    onError: (error) => {
      alert(error.message || 'Failed to complete purchase');
    }
  });

  const handleConvert = () => {
    if (!purchasePrice || !expiryDate) {
      alert('Please fill in all required fields');
      return;
    }
    convertMutation.mutate({ purchasePrice, creditPercent, expiryDate });
  };

  const handlePurchase = () => {
    if (confirm(`Complete purchase for $${rental.balanceRemaining.toFixed(2)}?`)) {
      purchaseMutation.mutate();
    }
  };

  const amountPerPayment = rental.baseAmount ? (rental.baseAmount * (creditPercent / 100)) : 0;
  const estimatedPayments = rental.purchasePrice ? Math.ceil(rental.purchasePrice / amountPerPayment) : 0;

  if (rental.isRentToOwn) {
    // Already a rent-to-own contract - show purchase option
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            Rent-to-Own Contract
          </CardTitle>
          <CardDescription>Customer can purchase this equipment at any time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-green-700">Purchase Price</Label>
              <div className="text-2xl font-bold text-green-900">${rental.purchasePrice?.toFixed(2)}</div>
            </div>
            <div>
              <Label className="text-xs text-green-700">Credit Rate</Label>
              <div className="text-2xl font-bold text-green-900">{rental.rentToOwnCreditPercent}%</div>
            </div>
            <div>
              <Label className="text-xs text-green-700">Amount Credited</Label>
              <div className="text-lg font-semibold text-green-900">${rental.amountCredited?.toFixed(2)}</div>
            </div>
            <div>
              <Label className="text-xs text-green-700">Balance Remaining</Label>
              <div className="text-lg font-bold text-green-900">${rental.balanceRemaining?.toFixed(2)}</div>
            </div>
          </div>

          {rental.purchaseOptionExpiry && (
            <div className="text-sm text-green-700">
              <Calendar className="w-4 h-4 inline mr-1" />
              Purchase option expires: {new Date(rental.purchaseOptionExpiry).toLocaleDateString()}
            </div>
          )}

          {rental.balanceRemaining > 0 && (
            <Button
              onClick={handlePurchase}
              disabled={isPurchasing || purchaseMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              {isPurchasing ? 'Processing...' : `Complete Purchase ($${rental.balanceRemaining?.toFixed(2)})`}
            </Button>
          )}

          {rental.balanceRemaining <= 0 && (
            <div className="p-3 bg-green-100 rounded-lg text-green-800 text-center font-semibold">
              ✓ Equipment Fully Purchased
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Not yet rent-to-own - show conversion form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="w-5 h-5" />
          Convert to Rent-to-Own
        </CardTitle>
        <CardDescription>Allow customer to apply rental payments toward purchase</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="purchasePrice">Purchase Price</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              id="purchasePrice"
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="pl-8"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="creditPercent">Credit Percentage ({creditPercent}%)</Label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={creditPercent}
              onChange={(e) => setCreditPercent(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-2xl font-bold w-16 text-center">{creditPercent}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            ${amountPerPayment.toFixed(2)} of each ${rental.totalDays || 1}-day payment goes toward purchase
          </p>
        </div>

        <div>
          <Label htmlFor="expiryDate">Purchase Option Expiry</Label>
          <Input
            id="expiryDate"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>

        {purchasePrice && (
          <div className="p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Purchase Price:</span>
              <span className="font-semibold">${parseFloat(purchasePrice).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Credit per Payment:</span>
              <span className="font-semibold">${amountPerPayment.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Est. Payments to Own:</span>
              <span className="font-bold text-green-600">{estimatedPayments} payments</span>
            </div>
          </div>
        )}

        <Button
          onClick={handleConvert}
          disabled={isConverting || convertMutation.isPending || !purchasePrice || !expiryDate}
          className="w-full"
        >
          {isConverting ? 'Converting...' : 'Convert to Rent-to-Own'}
        </Button>
      </CardContent>
    </Card>
  );
}