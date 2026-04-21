import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, ArrowLeft, Users, FileText, Activity, Trash2, ArrowUpCircle, ArrowDownCircle, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import api from '../api/axios';

const AdminPanel = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('scaffold');
  const [data, setData] = useState({ users: [], posts: [], logs: [], server_errors: [] });
  const [loading, setLoading] = useState(false);

  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [hotLogs, setHotLogs] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  // RBAC hook evaluation moved below to adhere to React Hook constraints

  const fetchTab = async (tab, pageOverride, searchOverride) => {
    setActiveTab(tab);
    setLoading(true);
    try {
      if (tab === 'users') {
        const p = pageOverride || usersPage;
        const q = searchOverride !== undefined ? searchOverride : searchQuery;
        const res = await api.get(`/admin/users?page=${p}&limit=20&q=${encodeURIComponent(q)}`);
        setData(prev => ({ ...prev, users: res.data.users }));
        setUsersTotalPages(res.data.totalPages || 1);
        if (pageOverride) setUsersPage(pageOverride);
      } else if (tab === 'posts') {
        const p = pageOverride || postsPage;
        const res = await api.get(`/admin/posts?page=${p}&limit=20`);
        setData(prev => ({ ...prev, posts: res.data.posts }));
        setPostsTotalPages(res.data.totalPages || 1);
        if (pageOverride) setPostsPage(pageOverride);
      } else if (tab === 'logs') {
        const res = await api.get('/admin/logs');
        setData(prev => ({ ...prev, logs: res.data.logs }));
        setSearchResults([]);
      } else if (tab === 'logs_hot') {
        const res = await api.get('/admin/logs/hot');
        setHotLogs(res.data.logs);
      } else if (tab === 'server_errors') {
        const res = await api.get('/admin/server-errors');
        setData(prev => ({ ...prev, server_errors: res.data.errors }));
      } else if (tab === 'log_search') {
        if (!logSearchQuery) return;
        const res = await api.get(`/admin/logs/search?requestId=${logSearchQuery}`);
        setSearchResults(res.data.logs);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to fetch admin data for this tab.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      const delay = setTimeout(() => {
        fetchTab('users', 1, searchQuery);
      }, 400);
      return () => clearTimeout(delay);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleRoleChange = async (targetId, action) => {
    try {
      await api.post(`/users/${action}`, { targetUserId: targetId });
      fetchTab('users');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || `Failed to ${action} user`);
    }
  };

  const handleDeleteUser = async (targetId) => {
    if (!window.confirm('WARNING: Are you sure you want to permanently delete this user account?')) return;
    
    const reason = window.prompt("Reason for deletion (This will be emailed to the user):");
    if (!reason || reason.trim() === '') {
      alert("Deletion cancelled. A reason must be provided.");
      return;
    }

    try {
      await api.delete(`/users/${targetId}`, { data: { reason } });
      fetchTab('users');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to delete account');
    }
  };

  const handleToggleSuspension = async (targetId, isCurrentlySuspended) => {
    const action = isCurrentlySuspended ? 'unsuspend' : 'suspend';
    
    let reason = null;
    if (action === 'suspend') {
      reason = window.prompt("Reason for suspension (This will be emailed to the user):");
      if (!reason || reason.trim() === '') {
        alert("Suspension cancelled. A reason must be provided.");
        return;
      }
    } else {
      if (!window.confirm("Are you sure you want to restore this user's account?")) return;
    }

    try {
      await api.post(`/users/${targetId}/suspend`, { action, reason });
      fetchTab('users');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || `Failed to ${action} user`);
    }
  };

  const handleDeletePost = async (targetId) => {
    if (!window.confirm('Delete this post permanently from the platform?')) return;
    try {
      await api.delete(`/posts/${targetId}`);
      fetchTab('posts');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to delete post');
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <Navigate to="/feed" />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col font-sans">
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-6">
          <Link to="/feed" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors no-underline">
            <ArrowLeft size={18} /> Back to Nexus
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="p-6 bg-indigo-900 flex justify-between items-center text-white">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Shield size={28} />
              </div>
              <div>
                <h1 className="text-xl font-bold">
                   {user.role === 'superadmin' ? 'System Administration' : 'Staff Management'}
                </h1>
                <p className="text-indigo-200 text-xs">Logged in as {user.role}</p>
              </div>
            </div>
            <button onClick={() => window.location.href = '/feed'} className="text-indigo-100 font-medium text-sm hover:text-white">
               Back to Dashboard
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
           <div 
            onClick={() => fetchTab('users')}
            className={`bg-white p-6 rounded-xl shadow-sm border-2 flex flex-col items-center justify-center text-center gap-4 transition-all cursor-pointer ${activeTab === 'users' ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent hover:border-indigo-100 hover:shadow-md'}`}
          >
            <Users size={36} className="text-blue-500" />
            <div className="w-full">
              <h3 className="font-bold text-gray-900">User Directory</h3>
              <p className="text-xs text-gray-500 mt-1 mb-3">Manage roles & accounts</p>
              {activeTab === 'users' && (
                <div className="relative mt-2" onClick={(e) => e.stopPropagation()}>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-indigo-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-9 pr-3 py-2 border border-indigo-200 rounded-lg leading-5 bg-white placeholder-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-xs transition duration-150 ease-in-out text-left"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div 
            onClick={() => fetchTab('posts')}
            className={`bg-white p-6 rounded-xl shadow-sm border-2 flex flex-col items-center justify-center text-center gap-4 transition-all cursor-pointer ${activeTab === 'posts' ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent hover:border-indigo-100 hover:shadow-md'}`}
          >
            <FileText size={36} className="text-green-500" />
            <div>
              <h3 className="font-bold text-gray-900">Content Moderation</h3>
              <p className="text-xs text-gray-500 mt-1">Review & delete posts</p>
            </div>
          </div>

          <div 
            onClick={() => fetchTab('logs')}
            className={`bg-white p-6 rounded-xl shadow-sm border-2 flex flex-col items-center justify-center text-center gap-4 transition-all cursor-pointer ${activeTab === 'logs' || activeTab === 'logs_hot' || activeTab === 'log_search' ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent hover:border-indigo-100 hover:shadow-md'}`}
          >
            <Activity size={36} className="text-purple-500" />
            <div className="w-full">
              <h3 className="font-bold text-gray-900">System Logs</h3>
              <p className="text-xs text-gray-500 mt-1 mb-2">Audits & Activity</p>
              
              {(activeTab === 'logs' || activeTab === 'log_search' || activeTab === 'logs_hot') && (
                <div className="flex flex-col gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <input
                      type="text"
                      className="block w-full pl-3 pr-3 py-1.5 border border-indigo-200 rounded-lg text-xs leading-5 bg-white placeholder-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition duration-150"
                      placeholder="Trace Request ID..."
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchTab('log_search')}
                    />
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => fetchTab('logs')}
                      className={`flex-1 text-[10px] font-bold py-1 rounded border ${activeTab === 'logs' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200'}`}
                    >
                      Persisted
                    </button>
                    <button 
                      onClick={() => fetchTab('logs_hot')}
                      className={`flex-1 text-[10px] font-bold py-1 rounded border ${activeTab === 'logs_hot' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-600 border-orange-200'}`}
                    >
                      Live/Hot
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div 
            onClick={() => fetchTab('server_errors')}
            className={`bg-white p-6 rounded-xl shadow-sm border-2 flex flex-col items-center justify-center text-center gap-4 transition-all cursor-pointer ${activeTab === 'server_errors' ? 'border-red-500 bg-red-50/50' : 'border-transparent hover:border-red-100 hover:shadow-md'}`}
          >
            <AlertTriangle size={36} className="text-red-500" />
            <div>
              <h3 className="font-bold text-gray-900">Critical Errors</h3>
              <p className="text-xs text-gray-500 mt-1">Core fault traces</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden min-h-[400px]">
          {activeTab === 'scaffold' && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-32 gap-4">
              <Shield size={48} className="opacity-20 text-gray-500"/>
              <p className="font-medium text-gray-500">Select a management tab above to continue.</p>
            </div>
          )}

          {loading && activeTab !== 'scaffold' && (
            <div className="flex items-center justify-center h-full py-32 text-indigo-600 gap-3">
              <RefreshCw size={28} className="animate-spin" />
              <span className="font-bold text-lg">Fetching Records...</span>
            </div>
          )}

          {!loading && activeTab === 'users' && (
            <div className="flex flex-col">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-800">User Management</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b">
                    <th className="p-4 text-sm font-semibold text-gray-600">User / Account</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Role & Security</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map(u => (
                     <tr key={u.id} className="border-b hover:bg-gray-50 transition-colors">
                       <td className="p-4">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700">
                             {u.username?.charAt(0).toUpperCase() || '?'}
                           </div>
                           <div>
                             <div className="font-bold text-gray-900">{u.username} {u.id === user.id && "(You)"}</div>
                             <div className="text-xs text-gray-500">{u.full_name || 'Anonymous User'}</div>
                           </div>
                         </div>
                       </td>
                       <td className="p-4">
                         <div className="flex flex-col gap-2 items-start">
                           <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                              u.role === 'superadmin' ? 'bg-black text-white' : 
                              u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {u.role}
                           </span>
                           {u.is_suspended && (
                             <span className="px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-700 mt-1">
                               ⛔ SUSPENDED
                             </span>
                           )}
                           <span className="text-xs text-gray-500 font-medium">
                             {u.is_email_verified ? '📧 Verified' : '📧 Unverified'} • {u.two_step_enabled ? '🔐 2FA ON' : '🔓 2FA OFF'}
                           </span>
                         </div>
                       </td>
                       <td className="p-4 text-right">
                         <div className="flex items-center justify-end gap-3">
                            {user.role === 'superadmin' && u.id !== user.id && u.role !== 'superadmin' && (
                              <button onClick={() => handleRoleChange(u.id, u.role === 'admin' ? 'demote' : 'promote')} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase">
                                {u.role === 'admin' ? 'Demote' : 'Promote to Admin'}
                              </button>
                            )}

                            {u.id !== user.id && (user.role === 'superadmin' || u.role === 'user') && (
                              <button onClick={() => handleToggleSuspension(u.id, u.is_suspended)} className={`${u.is_suspended ? 'text-green-600 hover:text-green-800' : 'text-orange-500 hover:text-orange-700'} text-xs font-bold uppercase ml-3`}>
                                {u.is_suspended ? 'Restore' : 'Suspend'}
                              </button>
                            )}

                            {u.id !== user.id && (
                              <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase ml-3">
                                Delete Account
                              </button>
                            )}
                            {u.id === user.id && (
                               <span className="text-gray-300 text-[10px] uppercase font-bold">Protected</span>
                            )}
                         </div>
                       </td>
                     </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t bg-white flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">Page {usersPage} of {usersTotalPages || 1}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => fetchTab('users', Math.max(1, usersPage - 1))}
                  disabled={usersPage <= 1}
                  className="px-3 py-1 text-sm font-bold border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button 
                  onClick={() => fetchTab('users', Math.min(usersTotalPages, usersPage + 1))}
                  disabled={usersPage >= usersTotalPages}
                  className="px-3 py-1 text-sm font-bold border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
            </div>
          )}

          {!loading && activeTab === 'posts' && (
             <div className="p-6">
               <div className="space-y-4">
                 {data.posts.map(p => (
                    <div key={p.id} className="border border-gray-200 rounded-xl p-5 flex justify-between items-start gap-4 hover:border-indigo-300 transition-colors bg-white">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-lg mb-1">{p.title}</h4>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{p.content_text}</p>
                        <div className="flex gap-2">
                           <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded-md capitalize border border-gray-200">
                             {p.type} 
                           </span>
                           <span className="text-xs font-bold px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md capitalize border border-indigo-100">
                              {p.category_name}
                           </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-3">
                        <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded">{p.author_username}</span>
                        <button 
                          onClick={() => handleDeletePost(p.id)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg font-bold hover:bg-red-100 hover:text-red-700 transition-colors text-sm"
                        >
                          <Trash2 size={16} /> Delete Post
                        </button>
                      </div>
                    </div>
                 ))}
                 {data.posts.length === 0 && <p className="text-gray-500 text-center py-10">No posts found.</p>}
               </div>
               
               <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm text-gray-500 font-medium">Page {postsPage} of {postsTotalPages || 1}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => fetchTab('posts', Math.max(1, postsPage - 1))}
                      disabled={postsPage <= 1}
                      className="px-3 py-1 text-sm font-bold border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button 
                      onClick={() => fetchTab('posts', Math.min(postsTotalPages, postsPage + 1))}
                      disabled={postsPage >= postsTotalPages}
                      className="px-3 py-1 text-sm font-bold border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
             </div>
          )}

          {!loading && activeTab === 'logs' && (
            <div className="p-6 bg-gray-900 text-gray-300 font-mono text-sm max-h-[600px] overflow-y-auto">
               <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                 <div className="text-green-400">nexus_os@admin:~$ tail -f app_logs</div>
                 <span className="text-xs text-gray-500">Source: PostgreSQL (Audit Tier)</span>
               </div>
               {data.logs.length === 0 ? (
                 <span className="text-gray-500">No logs recorded yet.</span>
               ) : (
                 <div className="flex flex-col gap-3">
                   {data.logs.map(log => (
                     <div key={log.id} className="flex flex-col gap-1 border-b border-white/5 pb-2">
                       <div className="flex gap-4">
                        <span className="text-gray-500 shrink-0 w-[150px]">{new Date(log.created_at).toLocaleString()}</span>
                        <span className={`shrink-0 w-[80px] font-bold ${log.level === 'critical' ? 'text-fuchsia-400 font-black' : log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-blue-400'}`}>
                          [{log.level.toUpperCase()}]
                        </span>
                        <span className="text-gray-100 flex-1">{log.message}</span>
                       </div>
                       {log.request_id && (
                         <div className="text-[10px] text-indigo-400 opacity-70 ml-[250px]">
                           Request ID: {log.request_id}
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               )}
            </div>
          )}

          {!loading && activeTab === 'logs_hot' && (
            <div className="p-6 bg-[#0c1117] text-gray-300 font-mono text-sm max-h-[600px] overflow-y-auto">
               <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                 <div className="text-orange-400 animate-pulse">● LIVE TELEMETRY STREAMING</div>
                 <span className="text-xs text-gray-500">Source: Redis (Hot Tier - 1 Day Retention)</span>
               </div>
               {hotLogs.length === 0 ? (
                 <span className="text-gray-500">No hot telemetry available for today.</span>
               ) : (
                 <div className="flex flex-col gap-3">
                   {hotLogs.map((log, idx) => (
                     <div key={idx} className="flex flex-col gap-1 border-b border-white/5 pb-2">
                       <div className="flex gap-4">
                        <span className="text-gray-500 shrink-0 w-[150px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className="shrink-0 w-[80px] font-bold text-cyan-400">[INFO]</span>
                        <span className="text-gray-300 flex-1">{log.message}</span>
                        {log.status && <span className={`text-xs ${parseInt(log.status) >= 400 ? 'text-red-400' : 'text-green-400'}`}>{log.status}</span>}
                       </div>
                       {log.requestId && (
                         <div className="text-[10px] text-cyan-600 opacity-70 ml-[250px] flex gap-2">
                           ID: {log.requestId} 
                           {log.responseTime && <span>• {log.responseTime}ms</span>}
                           {log.url && <span>• {log.url}</span>}
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               )}
            </div>
          )}

          {!loading && activeTab === 'log_search' && (
            <div className="p-6 bg-black text-indigo-100 font-mono text-sm max-h-[600px] overflow-y-auto">
               <div className="flex justify-between items-center mb-4 border-b border-indigo-500/30 pb-2">
                 <div className="text-indigo-400 font-bold">CROSS-TIER TRACE: {logSearchQuery}</div>
                 <span className="text-xs text-indigo-800">Searching Redis + Postgres...</span>
               </div>
               {searchResults.length === 0 ? (
                 <span className="text-gray-500">No logs found matching this Request ID.</span>
               ) : (
                 <div className="flex flex-col gap-4">
                   {searchResults.map((log, idx) => (
                     <div key={idx} className="flex flex-col gap-2 border-l-2 border-indigo-500/20 pl-4 pb-4">
                       <div className="flex items-center gap-4">
                         <span className="text-gray-500 w-[150px] shrink-0">{new Date(log.created_at || log.timestamp).toLocaleString()}</span>
                         <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                           log.tier === 'error' ? 'bg-red-900 text-red-100' : 
                           log.tier === 'persistent' ? 'bg-indigo-900 text-indigo-100' : 'bg-orange-900/50 text-orange-200'
                         }`}>
                           Tier: {log.tier}
                         </span>
                         <span className="text-white flex-1">{log.message}</span>
                       </div>
                       {log.stack_trace && <pre className="text-red-400 text-[10px] bg-red-950/50 p-2 rounded mt-2 overflow-x-auto">{log.stack_trace}</pre>}
                       {log.meta && <div className="text-[10px] text-gray-500 break-all">{JSON.stringify(log.meta)}</div>}
                     </div>
                   ))}
                 </div>
               )}
            </div>
          )}

          {!loading && activeTab === 'server_errors' && (
            <div className="p-6 bg-[#2a0e0e] text-red-100 font-mono text-sm max-h-[600px] overflow-y-auto">
               <div className="text-red-400 mb-4 border-b border-red-500/20 pb-2">nexus_os@admin:~/core_dumps$ cat critical_faults.log</div>
               {data.server_errors.length === 0 ? (
                 <span className="text-red-500/50">No server faults recorded.</span>
               ) : (
                 <div className="flex flex-col gap-4">
                   {data.server_errors.map(err => (
                     <div key={err.id} className="flex flex-col gap-2 border-b border-red-500/20 pb-4">
                       <div className="flex items-center gap-4">
                         <span className="text-red-400/70 w-[150px] shrink-0">{new Date(err.created_at).toLocaleString()}</span>
                         <span className="text-red-400 font-bold shrink-0">[FATAL]</span>
                         <span className="font-bold font-sans text-base flex-1">{err.message}</span>
                       </div>
                       {err.meta && <div className="text-yellow-500/80 text-xs sm:ml-[220px] ml-4">{JSON.stringify(err.meta)}</div>}
                       {err.stack_trace && <pre className="text-red-300 text-xs sm:ml-[220px] ml-4 whitespace-pre-wrap break-words">{err.stack_trace}</pre>}
                     </div>
                   ))}
                 </div>
               )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
