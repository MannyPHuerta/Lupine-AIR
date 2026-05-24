import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Search, Loader2, ExternalLink, ShoppingCart, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FindPartModal({ part, onClose }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a heavy equipment parts sourcing expert. I need to find a supplier for the following part:

Part Name: ${part.partName}
Equipment (if known): ${part.equipmentName || 'N/A'}
Vendor previously used (may be out of stock): ${part.vendor || 'None on file'}
Quantity needed: ${part.quantity || 1}

Please provide:
1. A list of 5 reputable suppliers who likely carry this part (name, website, phone if known, notes)
2. Search terms a mechanic could use on Google/eBay/Amazon to find this part fast
3. Any OEM part numbers or common cross-reference numbers if you know them
4. Any tips for sourcing this specific type of part (e.g., salvage yards, specialty distributors)

Format as JSON.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            suppliers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  website: { type: 'string' },
                  phone: { type: 'string' },
                  notes: { type: 'string' },
                }
              }
            },
            searchTerms: { type: 'array', items: { type: 'string' } },
            partNumbers: { type: 'array', items: { type: 'string' } },
            sourcingTips: { type: 'string' },
          }
        }
      });
      setResults(res);
    } catch (err) {
      setResults({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const googleSearch = (term) => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(term)}`, '_blank');
  };

  const ebaySearch = (term) => {
    window.open(`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(term)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-orange-600" />
              Find This Part
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-semibold text-gray-700">{part.partName}</span>
              {part.vendor && <span className="ml-2 text-xs text-orange-600">— {part.vendor} may be out of stock</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Quick search buttons — always visible */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Quick Search</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => googleSearch(part.partName)}
                className="gap-1.5 text-xs">
                <ExternalLink className="w-3.5 h-3.5" /> Google
              </Button>
              <Button size="sm" variant="outline" onClick={() => ebaySearch(part.partName)}
                className="gap-1.5 text-xs">
                <ShoppingCart className="w-3.5 h-3.5" /> eBay
              </Button>
              <Button size="sm" variant="outline"
                onClick={() => window.open(`https://www.amazon.com/s?k=${encodeURIComponent(part.partName)}`, '_blank')}
                className="gap-1.5 text-xs">
                <ShoppingCart className="w-3.5 h-3.5" /> Amazon
              </Button>
              <Button size="sm" variant="outline"
                onClick={() => window.open(`https://www.grainger.com/search?searchQuery=${encodeURIComponent(part.partName)}`, '_blank')}
                className="gap-1.5 text-xs">
                <ExternalLink className="w-3.5 h-3.5" /> Grainger
              </Button>
              <Button size="sm" variant="outline"
                onClick={() => window.open(`https://www.mcmaster.com/#${encodeURIComponent(part.partName)}`, '_blank')}
                className="gap-1.5 text-xs">
                <ExternalLink className="w-3.5 h-3.5" /> McMaster-Carr
              </Button>
            </div>
          </div>

          {/* AI Lookup */}
          {!results && !loading && (
            <div className="border-2 border-dashed border-orange-200 rounded-xl p-6 text-center">
              <Search className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">
                Let AI find specific suppliers, part numbers, and sourcing tips for <strong>{part.partName}</strong>
              </p>
              <Button onClick={search} className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
                <Search className="w-4 h-4" /> Find Suppliers with AI
              </Button>
              <p className="text-xs text-gray-400 mt-2">Uses live web search · takes ~10 seconds</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-10 text-orange-600 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm font-medium">Searching supplier databases…</span>
            </div>
          )}

          {results?.error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {results.error}
            </div>
          )}

          {results && !results.error && (
            <div className="space-y-4">

              {/* Suppliers */}
              {results.suppliers?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Suggested Suppliers</div>
                  <div className="space-y-2">
                    {results.suppliers.map((s, i) => (
                      <div key={i} className="bg-gray-50 border rounded-lg p-3 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900">{s.name}</div>
                          {s.phone && <div className="text-xs text-gray-500">{s.phone}</div>}
                          {s.notes && <div className="text-xs text-gray-400 mt-0.5 italic">{s.notes}</div>}
                        </div>
                        {s.website && (
                          <Button size="sm" variant="outline"
                            onClick={() => window.open(s.website.startsWith('http') ? s.website : `https://${s.website}`, '_blank')}
                            className="flex-shrink-0 gap-1 text-xs h-7">
                            <ExternalLink className="w-3 h-3" /> Visit
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Part numbers */}
              {results.partNumbers?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">OEM / Cross-Reference Part Numbers</div>
                  <div className="flex flex-wrap gap-2">
                    {results.partNumbers.map((pn, i) => (
                      <button key={i} onClick={() => googleSearch(pn)}
                        className="text-xs font-mono bg-blue-50 border border-blue-200 text-blue-800 px-2.5 py-1 rounded hover:bg-blue-100 transition flex items-center gap-1">
                        {pn} <ExternalLink className="w-3 h-3 opacity-50" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search terms */}
              {results.searchTerms?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Recommended Search Terms</div>
                  <div className="flex flex-wrap gap-2">
                    {results.searchTerms.map((term, i) => (
                      <button key={i} onClick={() => googleSearch(term)}
                        className="text-xs bg-orange-50 border border-orange-200 text-orange-800 px-2.5 py-1 rounded hover:bg-orange-100 transition flex items-center gap-1">
                        <Search className="w-3 h-3" /> {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sourcing tips */}
              {results.sourcingTips && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                  <div className="font-semibold mb-1 text-xs uppercase text-amber-700">Sourcing Tips</div>
                  {results.sourcingTips}
                </div>
              )}

              <Button size="sm" variant="outline" onClick={search} className="gap-1.5 text-xs">
                <Search className="w-3.5 h-3.5" /> Search Again
              </Button>
            </div>
          )}
        </div>

        <div className="p-4 border-t text-right">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}