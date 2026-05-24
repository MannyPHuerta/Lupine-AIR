import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, ChevronRight, X, Loader2 } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const AVAILABLE_ATTRIBUTES = [
  { key: 'voltage', label: 'Voltage', type: 'text', category: 'Power' },
  { key: 'wattage', label: 'Wattage (W)', type: 'number', category: 'Power' },
  { key: 'amperage', label: 'Amperage (A)', type: 'number', category: 'Power' },
  { key: 'fuel_type', label: 'Fuel Type', type: 'select', options: ['Diesel', 'Gasoline', 'Propane', 'Natural Gas'], category: 'Power' },
  { key: 'cfm', label: 'CFM (Air Flow)', type: 'number', category: 'Power' },
  { key: 'psi', label: 'PSI (Pressure)', type: 'number', category: 'Power' },
  { key: 'capacity_lbs', label: 'Capacity (lbs)', type: 'number', category: 'General' },
  { key: 'length_ft', label: 'Length (ft)', type: 'number', category: 'Dimensions' },
  { key: 'width_ft', label: 'Width (ft)', type: 'number', category: 'Dimensions' },
  { key: 'height_ft', label: 'Height (ft)', type: 'number', category: 'Dimensions' },
  { key: 'weight_lbs', label: 'Weight (lbs)', type: 'number', category: 'Dimensions' },
  { key: 'material', label: 'Material', type: 'text', category: 'General' },
  { key: 'color', label: 'Color', type: 'text', category: 'General' },
  { key: 'max_persons', label: 'Max Persons', type: 'number', category: 'Capacity' },
  { key: 'seating_capacity', label: 'Seating Capacity', type: 'number', category: 'Capacity' },
];

function CategoryForm({ category, onSave, onCancel }) {
  const [form, setForm] = useState(category ? { ...category } : { name: '', parent: '', description: '', attributes: [] });
  const [selectedAttrs, setSelectedAttrs] = useState(form.attributes || []);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Category name required'); return; }
    setSaving(true);
    const payload = { ...form, attributes: selectedAttrs };
    if (category) {
      await base44.entities.EquipmentCategory.update(category.id, payload);
    } else {
      await base44.entities.EquipmentCategory.create(payload);
    }
    setSaving(false);
    onSave();
  };

  const toggleAttr = (attr) => {
    setSelectedAttrs(prev => {
      const exists = prev.find(a => a.key === attr.key);
      return exists ? prev.filter(a => a.key !== attr.key) : [...prev, { key: attr.key, label: attr.label, type: attr.type, options: attr.options }];
    });
  };

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
      <div className="font-semibold text-indigo-900">{category ? 'Edit Category' : 'New Category'}</div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Category Name *</label>
        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Generator" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Parent Category (Optional)</label>
        <Input value={form.parent || ''} onChange={e => setForm(f => ({ ...f, parent: e.target.value }))} placeholder="e.g. Power Equipment" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
        <Input value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this category?" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-2">Attributes (specs that appear on quotes)</label>
        <div className="space-y-2 max-h-64 overflow-y-auto bg-white border rounded-lg p-3">
          {AVAILABLE_ATTRIBUTES.map(attr => (
            <label key={attr.key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
              <input
                type="checkbox"
                checked={selectedAttrs.some(a => a.key === attr.key)}
                onChange={() => toggleAttr(attr)}
                className="w-4 h-4"
              />
              <span className="flex-1 text-sm text-gray-700">{attr.label}</span>
              <span className="text-xs text-gray-400">{attr.category}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="text-white hover:opacity-90" style={{ backgroundColor: '#F5A623' }}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Save
        </Button>
      </div>
    </div>
  );
}

function CategoryRow({ cat, onEdit, onDelete, onSelectChildren }) {
  const hasChildren = cat.childCount > 0;

  return (
    <div className="border rounded-lg bg-white p-4 hover:border-indigo-300 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-gray-900">{cat.name}</div>
            {cat.parent && <span className="text-xs text-gray-400">from {cat.parent}</span>}
            {hasChildren && (
              <button onClick={() => onSelectChildren(cat.id)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1">
                {cat.childCount} children <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
          {cat.description && <div className="text-xs text-gray-500 mt-1">{cat.description}</div>}
          {cat.attributes?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {cat.attributes.map(attr => (
                <span key={attr.key} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                  {attr.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(cat)} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded hover:bg-gray-50">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(cat.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-gray-50">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CategoryManager() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [parentFilter, setParentFilter] = useState(null);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    base44.entities.EquipmentCategory.list('-created_date', 500)
      .then(cats => {
        const withCounts = cats.map(cat => ({
          ...cat,
          childCount: cats.filter(c => c.parent === cat.name).length,
        }));
        setCategories(withCounts);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return categories.filter(cat => {
      const matchParent = !parentFilter || cat.parent === parentFilter;
      const matchSearch = !search || cat.name.toLowerCase().includes(search.toLowerCase());
      return matchParent && matchSearch;
    });
  }, [categories, parentFilter, search]);

  const parentCategories = useMemo(() => {
    return [...new Set(categories.filter(c => !c.parent).map(c => c.name))].sort();
  }, [categories]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this category? Equipment assigned to it will need recategorization.')) return;
    await base44.entities.EquipmentCategory.delete(id);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Equipment Categories"
        subtitle={`${categories.length} categories defined`}
        backTo="/lupine"
        action={
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2 text-white hover:opacity-90" style={{ backgroundColor: '#F5A623' }}>
            <Plus className="w-4 h-4" /> New Category
          </Button>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <Input
              placeholder="Search categories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={parentFilter || ''}
            onChange={e => setParentFilter(e.target.value || null)}
            className="h-9 border border-input rounded-md px-3 text-sm bg-white"
          >
            <option value="">All Categories</option>
            {parentCategories.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Form */}
        {showForm && (
          <CategoryForm
            category={editing}
            onSave={() => { setShowForm(false); setEditing(null); load(); }}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-16 text-sm bg-white rounded-lg border">
            No categories found
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(cat => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                onEdit={(c) => { setEditing(c); setShowForm(true); }}
                onDelete={handleDelete}
                onSelectChildren={(parentId) => {
                  const parent = categories.find(c => c.id === parentId);
                  setParentFilter(parent?.name || null);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}