import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../context/AuthContext';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ tasks: [], projects: [], employees: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ tasks: [], projects: [], employees: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const hasResults = results.tasks.length > 0 || results.projects.length > 0 || results.employees.length > 0;

  return (
    <div className="card">
      <div className="card-header-flex">
        <h3>Global Search</h3>
      </div>
      <div style={{ padding: '20px' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Search tasks, projects, teammates..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ marginBottom: '20px' }}
        />

        {loading && (
          <div className="text-center text-muted" style={{ padding: '20px' }}>
            Searching...
          </div>
        )}

        {!loading && !query && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            Enter a search query to find tasks across all your projects.
          </div>
        )}

        {!loading && query && !hasResults && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            No results found for "{query}".
          </div>
        )}

        {!loading && hasResults && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {results.tasks.length > 0 && (
              <div>
                <h4 style={{ marginBottom: '10px' }}>Tasks ({results.tasks.length})</h4>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Task Name</th>
                        <th>Priority</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.tasks.map(t => (
                        <tr key={t.id}>
                          <td><strong>{t.id}</strong></td>
                          <td>{t.name}</td>
                          <td><span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                          <td><span className={`badge badge-${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {results.projects.length > 0 && (
              <div>
                <h4 style={{ marginBottom: '10px' }}>Projects ({results.projects.length})</h4>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Project Name</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.projects.map(p => (
                        <tr key={p.id}>
                          <td><strong>{p.id}</strong></td>
                          <td>{p.name}</td>
                          <td><span className="badge badge-active">{p.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {results.employees.length > 0 && (
              <div>
                <h4 style={{ marginBottom: '10px' }}>Team Members ({results.employees.length})</h4>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.employees.map(e => (
                        <tr key={e.id}>
                          <td><strong>{e.name}</strong></td>
                          <td>{e.email}</td>
                          <td><span className="badge badge-info">{e.role}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
