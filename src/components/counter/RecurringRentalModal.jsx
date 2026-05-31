import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Repeat, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function RecurringRentalModal({ customer, lineItems, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    rentalDays: 30,
    autoConfirm: false,
    deliveryMethod: 'customer_pickup',
    returnMethod: 'customer_return',
    notes: '',
    totalOccurrences: ''
  });

  const { data: branches } = useQuery({
    queryKey: ['branchSettings'],
    queryFn: () => base44.entities.BranchSettings.list(),
    initialData: []
  });

  const createRecurringMutation = useMutation({
    mutationFn: (data) => base44.entities.RecurringRental.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringRentals'] });
      onClose();
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customer || !lineItems?.length) {
      alert('Customer and equipment required');
      return;
    }

    const recurringData = {
      customerId: customer.id,
      customerName: customer.fullName,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      customerCity: customer.city,
      customerState: customer.state,
      customerZip: customer.zip,
      lineItems: lineItems.map(item => ({
        equipmentId: item.equipmentId,
        equipmentName: item.equipmentName,
        quantity: item.quantity,
        dailyRate: item.dailyRate,
        weeklyRate: item.weeklyRate,
        monthlyRate: item.monthlyRate
      })),
      frequency: formData.frequency,
      startDate: formData.startDate,
      endDate: formData.endDate || null,
      rentalDays: parseInt(formData.rentalDays),
      nextOccurrenceDate: formData.startDate,
      status: 'active',
      autoConfirm: formData.autoConfirm,
      deliveryMethod: formData.deliveryMethod,
      returnMethod: formData.returnMethod,
      branch: branches[0]?.branch || '01 McAllen',
      notes: formData.notes,
      totalOccurrences: formData.totalOccurrences ? parseInt(formData.totalOccurrences) : null,
      generatedCount: 0,
      createdBy: (await base44.auth.me())?.email
    };

    createRecurringMutation.mutate(recurringData);
  };

  const frequencyOptions = {
    weekly: { label: 'Weekly', days: 7 },
    biweekly: { label: 'Bi-weekly', days: 14 },
    monthly: { label: 'Monthly', days: 30 },
    quarterly: { label: 'Quarterly', days: 90 },
    yearly: { label: 'Yearly', days: 365 }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-indigo-600" />
            Create Recurring Rental
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Info */}
          {customer && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium">{customer.fullName}</div>
              <div className="text-xs text-gray-500">{customer.email} • {customer.phone}</div>
            </div>
          )}

          {/* Equipment Summary */}
          {lineItems?.length > 0 && (
            <div className="p-3 bg-indigo-50 rounded-lg">
              <div className="text-sm font-medium text-indigo-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {lineItems.length} item(s) per occurrence
              </div>
              <div className="text-xs text-indigo-700 mt-1">
                {lineItems.map(item => `${item.quantity}x ${item.equipmentName}`).join(', ')}
              </div>
            </div>
          )}

          {/* Frequency */}
          <div>
            <Label>Frequency</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData({ ...formData, frequency: value, rentalDays: frequencyOptions[value]?.days || 30 })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(frequencyOptions).map(([key, opt]) => (
                  <SelectItem key={key} value={key}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
          </div>

          {/* End Date */}
          <div>
            <Label>End Date (optional)</Label>
            <Input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              placeholder="Leave blank for indefinite"
            />
          </div>

          {/* Rental Days */}
          <div>
            <Label>Rental Days per Occurrence</Label>
            <Input
              type="number"
              value={formData.rentalDays}
              onChange={(e) => setFormData({ ...formData, rentalDays: e.target.value })}
              min="1"
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              Each rental will run for {formData.rentalDays} days
            </div>
          </div>

          {/* Total Occurrences */}
          <div>
            <Label>Total Occurrences (optional)</Label>
            <Input
              type="number"
              value={formData.totalOccurrences}
              onChange={(e) => setFormData({ ...formData, totalOccurrences: e.target.value })}
              placeholder="Leave blank for unlimited"
              min="1"
            />
          </div>

          {/* Auto Confirm */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoConfirm"
              checked={formData.autoConfirm}
              onChange={(e) => setFormData({ ...formData, autoConfirm: e.target.checked })}
              className="rounded border-gray-300"
            />
            <Label htmlFor="autoConfirm" className="text-sm">
              Auto-confirm rentals (no staff review needed)
            </Label>
          </div>

          {/* Delivery Method */}
          <div>
            <Label>Delivery Method</Label>
            <Select
              value={formData.deliveryMethod}
              onValueChange={(value) => setFormData({ ...formData, deliveryMethod: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer_pickup">Customer Pickup</SelectItem>
                <SelectItem value="company_delivery">Company Delivery</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Return Method */}
          <div>
            <Label>Return Method</Label>
            <Select
              value={formData.returnMethod}
              onValueChange={(value) => setFormData({ ...formData, returnMethod: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer_return">Customer Return</SelectItem>
                <SelectItem value="company_pickup">Company Pickup</SelectItem>
                <SelectItem value="customer_ships">Customer Ships</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Special instructions..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createRecurringMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createRecurringMutation.isPending ? 'Creating...' : 'Create Recurring Rental'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}