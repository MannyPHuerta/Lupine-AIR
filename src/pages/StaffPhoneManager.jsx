import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function StaffPhoneManager() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ email: "", phone: "" });
  const [newForm, setNewForm] = useState({ email: "", phone: "" });
  const [showAdd, setShowAdd] = useState(false);

  const { data: staffPhones = [], isLoading } = useQuery({
    queryKey: ["staffPhones"],
    queryFn: () => base44.entities.StaffPhone.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffPhone.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffPhones"] });
      setNewForm({ email: "", phone: "" });
      setShowAdd(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffPhone.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffPhones"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffPhone.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staffPhones"] }),
  });

  const startEdit = (sp) => {
    setEditingId(sp.id);
    setEditForm({ email: sp.email, phone: sp.phone });
  };

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return value;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white shadow-md sticky top-0 z-10" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="px-2 py-2 flex items-center justify-between">
          <button className="text-white p-3 rounded-lg hover:bg-blue-600 flex items-center gap-1" onClick={() => navigate("/report-form")}>
            <ArrowLeft className="w-6 h-6" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <span className="text-xl font-bold flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Staff SMS List
          </span>
          <button
            className="text-white p-3 rounded-lg hover:bg-blue-600 flex items-center gap-1"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">Add</span>
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        <p className="text-xs text-gray-500 text-center">
          Staff listed here will receive SMS alerts when reports are sent to their email.
        </p>

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}

        {/* Add new row */}
        {showAdd && (
          <div className="bg-white rounded-xl border shadow-sm p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700">New Entry</p>
            <Input
              placeholder="Email (e.g. john@rentalworld.com)"
              value={newForm.email}
              onChange={e => setNewForm(f => ({ ...f, email: e.target.value.trim() }))}
            />
            <Input
              placeholder="Phone (e.g. 9561234567)"
              value={newForm.phone}
              onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => createMutation.mutate({ email: newForm.email, phone: formatPhone(newForm.phone) })}
                disabled={!newForm.email || !newForm.phone || createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Staff list */}
        {staffPhones.map(sp => (
          <div key={sp.id} className="bg-white rounded-xl border shadow-sm p-4">
            {editingId === sp.id ? (
              <div className="space-y-2">
                <Input
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value.trim() }))}
                  placeholder="Email"
                />
                <Input
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: sp.id, data: { email: editForm.email, phone: formatPhone(editForm.phone) } })}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{sp.email}</p>
                  <p className="text-xs text-gray-500">{sp.phone}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => startEdit(sp)}>
                    <Pencil className="w-4 h-4 text-gray-500" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(sp.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {!isLoading && staffPhones.length === 0 && !showAdd && (
          <p className="text-center text-gray-400 text-sm py-10">No staff phones yet. Tap Add to get started.</p>
        )}
      </div>
    </div>
  );
}