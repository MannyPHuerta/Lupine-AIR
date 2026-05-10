import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, GitBranch, Loader2, CheckCircle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GitHubPRDashboard() {
  const navigate = useNavigate();
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await base44.entities.PullRequest.list('-mergedAt', 50);
        setPrs(data);
      } catch (err) {
        console.error('Failed to load PRs:', err);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Subscribe to real-time updates
    const unsub = base44.entities.PullRequest.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        load();
      }
    });

    return unsub;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">GitHub PR Tracker</h1>
          </div>
          <div className="ml-auto text-sm text-gray-500">
            Tracking: <strong>MannyPHuerta/air</strong>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : prs.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
            <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No merged pull requests found yet.</p>
            <p className="text-sm mt-2">Check back after your first merge to main.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prs.map((pr) => (
              <a
                key={pr.id}
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-lg border p-5 hover:shadow-md hover:border-indigo-300 transition group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-500">#{pr.prNumber}</span>
                      <span className="font-semibold text-gray-900 group-hover:text-indigo-600 transition truncate">
                        {pr.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span>by <strong>{pr.author}</strong></span>
                      {pr.mergedAt && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          Merged {new Date(pr.mergedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 flex-shrink-0" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}