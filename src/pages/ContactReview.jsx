import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Search, Trash2, CheckCircle2, Download, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

export default function ContactReview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [filterBy, setFilterBy] = useState('all');
  const [selectedContact, setSelectedContact] = useState(null);

  const { data: contacts = [], isLoading, refetch } = useQuery({
    queryKey: ['cproContacts'],
    queryFn: () => base44.entities.CproContact.list('-created_date', 10000),
  });

  const filtered = contacts
    .filter(c => {
      const q = search.toLowerCase();
      return (
        c.fullName?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.notes?.toLowerCase().includes(q)
      );
    })
    .filter(c => {
      if (filterBy === 'complete') return c.fullName?.trim() && c.phone?.trim();
      if (filterBy === 'incomplete') return !c.fullName?.trim() || !c.phone?.trim();
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_date) - new Date(a.created_date);
      if (sortBy === 'oldest') return new Date(a.created_date) - new Date(b.created_date);
      if (sortBy === 'name') return (a.fullName || '').localeCompare(b.fullName || '');
      return 0;
    });

  const handleDelete = async (id) => {
    setDeletingId(id);
    await base44.entities.CproContact.delete(id);
    toast({ title: 'Contact removed' });
    refetch();
    setDeletingId(null);
  };

  const handleExportCsv = () => {
    const headers = ['Full Name', 'Phone', 'Email', 'Address', 'City', 'State', 'Zip Code', 'Company', 'Account Number', 'Notes'];
    const rows = contacts.map(c => [
      c.fullName || '',
      c.phone || '',
      c.email || '',
      c.address || '',
      c.city || '',
      c.state || '',
      c.zipCode || '',
      c.companyName || '',
      c.accountNumber || '',
      c.notes || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cpro_contacts_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `✓ Exported ${contacts.length} contacts as CSV` });
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Delete all ${contacts.length} contacts? This cannot be undone.`)) return;
    await base44.functions.invoke('deleteAllCproContacts', {});
    toast({ title: 'All contacts deleted', variant: 'destructive' });
    refetch();
  };

  // Stats
  const withName = contacts.filter(c => c.fullName?.trim()).length;
  const withPhone = contacts.filter(c => c.phone?.trim()).length;
  const withBoth = contacts.filter(c => c.fullName?.trim() && c.phone?.trim()).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white shadow-md sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-2 py-2 flex items-center gap-3">
          <button
            className="text-white p-3 rounded-lg hover:bg-blue-600 active:bg-blue-500 flex items-center gap-1"
            onClick={() => navigate('/converter')}
          >
            <ArrowLeft className="w-6 h-6" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <span className="text-xl font-bold">Extracted Contacts</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{contacts.length}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="bg-white border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{withBoth}</div>
            <div className="text-xs text-gray-500">Name + Phone</div>
          </div>
          <div className="bg-white border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{contacts.length - withBoth}</div>
            <div className="text-xs text-gray-500">Incomplete</div>
          </div>
        </div>

        {/* Search + filters + actions */}
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Button className="bg-green-600 hover:bg-green-700 gap-1" onClick={handleExportCsv} disabled={contacts.length === 0}>
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Search name or phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDeleteAll}>
              Delete All
            </Button>
          </div>
          
          {/* Sorting & Filtering */}
          <div className="flex gap-2 flex-wrap">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2 border rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">By Name (A-Z)</option>
            </select>
            
            <select
              value={filterBy}
              onChange={e => setFilterBy(e.target.value)}
              className="px-3 py-2 border rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <option value="all">All Records ({contacts.length})</option>
              <option value="complete">Complete Only ({contacts.filter(c => c.fullName?.trim() && c.phone?.trim()).length})</option>
              <option value="incomplete">Incomplete Only ({contacts.filter(c => !c.fullName?.trim() || !c.phone?.trim()).length})</option>
            </select>
          </div>
        </div>

        {/* Contact list */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No contacts found</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedContact(c)}
                className="bg-white border rounded-lg px-4 py-3 flex items-start justify-between gap-3 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {c.fullName && c.phone ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-orange-300 flex-shrink-0" />
                    )}
                    <p className="font-semibold text-gray-900 truncate">{c.fullName || <span className="text-gray-400 italic">No name</span>}</p>
                  </div>
                  {c.phone && <p className="text-sm text-blue-700 ml-6">{c.phone}</p>}
                  {c.notes && <p className="text-xs text-gray-400 ml-6 truncate">{c.notes}</p>}
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleDelete(c.id);
                  }}
                  disabled={deletingId === c.id}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedContact && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedContact(null)}>
            <div className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Contact Details</h2>
                <button onClick={() => setSelectedContact(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Full Name</p>
                  <p className="font-semibold text-gray-900">{selectedContact.fullName || <span className="text-gray-400 italic">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Phone</p>
                  <p className="font-semibold text-gray-900">{selectedContact.phone || <span className="text-gray-400 italic">Not set</span>}</p>
                </div>
                {selectedContact.email && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">Email</p>
                    <p className="font-semibold text-gray-900">{selectedContact.email}</p>
                  </div>
                )}
                {selectedContact.address && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">Address</p>
                    <p className="font-semibold text-gray-900">{selectedContact.address}</p>
                  </div>
                )}
                {(selectedContact.city || selectedContact.state || selectedContact.zipCode) && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">City, State, Zip</p>
                    <p className="font-semibold text-gray-900">
                      {[selectedContact.city, selectedContact.state, selectedContact.zipCode].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
                {selectedContact.companyName && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">Company</p>
                    <p className="font-semibold text-gray-900">{selectedContact.companyName}</p>
                  </div>
                )}
                {selectedContact.accountNumber && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">Account Number</p>
                    <p className="font-semibold text-gray-900">{selectedContact.accountNumber}</p>
                  </div>
                )}
                {selectedContact.notes && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">Notes</p>
                    <p className="font-semibold text-gray-900">{selectedContact.notes}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedContact(null)}
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={async () => {
                    await handleDelete(selectedContact.id);
                    setSelectedContact(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}