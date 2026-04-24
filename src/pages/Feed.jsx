import React, { useEffect, useState } from 'react';
import axios from 'axios';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'motion/react';
import { Virtuoso } from 'react-virtuoso';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../api/axios';
import { Type, UploadCloud, Trash2, Shield, ThumbsUp, ThumbsDown, MessageSquare, Bookmark, BookmarkCheck, Send, Bell, Search, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import ViewTracker from '../components/Post/ViewTracker';

const getOptimizedUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return url;
  if (url.match(/\.(mp4|webm|ogg)$/i)) return url; 
  const parts = url.split('/upload/');
  if (parts.length === 2) {
    return `${parts[0]}/upload/w_800,c_scale,q_auto:good,f_auto/${parts[1]}`;
  }
  return url;
};

const Feed = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Pagination & Infinite Scroll State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // New Post Form
  const [isPosting, setIsPosting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Interactions State Map
  const [expandedComments, setExpandedComments] = useState({});
  const [commentsData, setCommentsData] = useState({});
  const [newComment, setNewComment] = useState({});
  const [replyTargets, setReplyTargets] = useState({}); // { postId: commentId }

  // Likes Modal State
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [likesModalData, setLikesModalData] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);

  const openLikesModal = async (e, targetType, targetId) => {
    e.stopPropagation();
    setShowLikesModal(true);
    setLoadingLikes(true);
    try {
      const res = await api.get(`/interactions/${targetType}/${targetId}/likes`);
      setLikesModalData(res.data.likes || []);
    } catch (err) {
      console.error('Failed to fetch likes', err);
      setLikesModalData([]);
    } finally {
      setLoadingLikes(false);
    }
  };

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState('posts'); // 'posts' or 'bloggers'
  const [bloggerResults, setBloggerResults] = useState([]);
  const [isBloggerLoading, setIsBloggerLoading] = useState(false);

  // Debounced Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim()) {
        if (searchMode === 'posts') {
          setIsSearching(true);
          fetchFeed(true, searchTerm);
        } else {
          fetchBloggerSearch(searchTerm);
        }
      } else {
        if (isSearching) {
          setIsSearching(false);
          fetchFeed(true, '');
        }
        setBloggerResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, searchMode]);

  const fetchBloggerSearch = async (q) => {
    setIsBloggerLoading(true);
    try {
      const { data } = await api.get(`/users/search-bloggers?q=${encodeURIComponent(q)}`);
      setBloggerResults(data.bloggers || []);
    } catch (err) {
      console.error('Blogger search failed', err);
    } finally {
      setIsBloggerLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setBloggerResults([]);
  };

  const handleReact = async (postId, type) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        let np = { ...p };
        if (type === 'like') {
          if (np.is_liked) { np.is_liked = false; np.likes_count = Number(np.likes_count) - 1; }
          else { 
            np.is_liked = true; np.likes_count = Number(np.likes_count) + 1; 
            if (np.is_disliked) { np.is_disliked = false; np.dislikes_count = Number(np.dislikes_count) - 1; }
          }
        } else {
          if (np.is_disliked) { np.is_disliked = false; np.dislikes_count = Number(np.dislikes_count) - 1; }
          else { 
            np.is_disliked = true; np.dislikes_count = Number(np.dislikes_count) + 1; 
            if (np.is_liked) { np.is_liked = false; np.likes_count = Number(np.likes_count) - 1; }
          }
        }
        return np;
      }
      return p;
    }));
    try {
      await api.post(`/interactions/post/${postId}/react`, { type });
    } catch { fetchFeed(); }
  };

  const handleBookmark = async (postId) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_bookmarked: !p.is_bookmarked } : p));
    try {
      await api.post(`/interactions/posts/${postId}/bookmark`);
    } catch { fetchFeed(); }
  };

  const toggleComments = async (postId) => {
    if (expandedComments[postId]) {
      setExpandedComments(prev => ({ ...prev, [postId]: false }));
      return;
    }
    setExpandedComments(prev => ({ ...prev, [postId]: true }));
    try {
      const { data } = await api.get(`/interactions/posts/${postId}/comments`);
      setCommentsData(prev => ({ ...prev, [postId]: data.comments || [] }));
    } catch (err) { console.error(err); }
  };

  const handleAddComment = async (postId, e, parentId = null) => {
    e.preventDefault();
    const text = newComment[postId];
    if (!text || !text.trim()) return;
    try {
      const { data } = await api.post(`/interactions/posts/${postId}/comments`, { text, parentId });
      // Inject returned payload
      const joinedComment = {
         ...data.comment,
         author_username: user.username,
         author_role: user.role
      };
      setCommentsData(prev => ({ ...prev, [postId]: [...(prev[postId] || []), joinedComment] }));
      setNewComment(prev => ({ ...prev, [postId]: '' }));
      setReplyTargets(prev => ({ ...prev, [postId]: null }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: Number(p.comments_count) + 1 } : p));
    } catch(err) {
      alert(err.response?.data?.error || 'Failed to add comment');
      console.error(err);
    }
  };

  const fetchFeed = async (reset = false, searchQ = searchTerm) => {
    if (reset) {
      setLoading(true);
      setPage(0);
      setHasMore(true);
    } else {
      setIsLoadingMore(true);
    }
    
    const currentPage = reset ? 0 : page;
    const limit = 20;
    const offset = currentPage * limit;

    try {
      let endpoint = '/posts/feed';
      let params = `limit=${limit}&offset=${offset}`;

      if (searchQ.trim()) {
        endpoint = '/posts/search';
        params = `q=${encodeURIComponent(searchQ.trim())}&${params}`;
      }

      const { data } = await api.get(`${endpoint}?${params}`);
      const fetchedPosts = data.posts || [];
      
      if (fetchedPosts.length < limit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (reset) {
        setPosts(fetchedPosts);
      } else {
        setPosts(prev => {
          // Filter duplicates just in case new posts were added during scroll
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueFetched = fetchedPosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueFetched];
        });
      }
      setPage(currentPage + 1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Intersection Observer removed - Virtuoso handles infinite scrolling natively

  const fetchNotifications = async () => {
    try {
      const [{ data: countData }, { data: listData }] = await Promise.all([
        api.get('/notifications/unread-count'),
        api.get('/notifications')
      ]);
      setUnreadCount(countData.count);
      setNotifications(listData.notifications);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await api.put(`/notifications/${notif.id}/read`);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      } catch (e) { console.error('Failed to mark read', e); }
    }
    setShowNotificationModal(false);
    
    // Attempt to scroll to post if targetId exists
    if (notif.target_id) {
      // If it's a comment or like on MY post, go to profile
      if (['comment', 'like_post', 'reply'].includes(notif.type)) {
        navigate(`/profile?postId=${notif.target_id}`);
        return;
      }

      // If it's a new post we might not have it in feed yet unless we refresh
      await fetchFeed(); 
      setTimeout(() => {
        const el = document.getElementById(`post-${notif.target_id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-indigo-300');
          setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-300'), 2000);
        } else {
          alert('Post not found in your feed.');
        }
      }, 500);
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      fetchFeed();
      fetchNotifications();
    };
    loadAllData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleNotif = (notif) => {
      setUnreadCount(prev => prev + 1);
      setNotifications(prev => [notif, ...prev]);
    };

    const handleSync = (data) => {
      // Injects the live database count instantly without triggering a global network UI refetch
      setPosts(prev => prev.map(p => p.id === data.postId ? { 
        ...p, 
        likes_count: data.likes_count || p.likes_count,
        dislikes_count: data.dislikes_count || p.dislikes_count,
        comments_count: data.comments_count || p.comments_count
      } : p));
    };

    socket.on('new_notification', handleNotif);
    socket.on('post_metrics_sync', handleSync);

    return () => {
      socket.off('new_notification', handleNotif);
      socket.off('post_metrics_sync', handleSync);
    };
  }, [socket]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length > 4) {
      alert("You can only upload up to 4 media files at a time.");
      e.target.value = '';
      return;
    }

    for (let file of files) {
      if (file.type.startsWith('image/')) {
        if (file.size > 10 * 1024 * 1024) { // 10MB
          alert(`Image "${file.name}" is too large! Maximum image size is 10MB.`);
          e.target.value = '';
          return;
        }
      } else if (file.type.startsWith('video/')) {
        if (file.size > 50 * 1024 * 1024) { // 50MB
          alert(`Video "${file.name}" is too large! Maximum video size is 50MB.`);
          e.target.value = '';
          return;
        }
      }
    }
    
    setMediaFiles(files);
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() && !content.trim() && mediaFiles.length === 0) {
      alert("Please provide some content for your post.");
      return;
    }
    
    setUploadProgress("Preparing secure upload session...");
    let finalMediaUrls = [];

    try {
      if (mediaFiles && mediaFiles.length > 0) {
        // Step 1: Get signature from backend
        const { data: signData } = await api.get('/media/sign-upload');

        // Step 2: Upload each file directly to Cloudinary
        for (let i = 0; i < mediaFiles.length; i++) {
          const file = mediaFiles[i];
          setUploadProgress(`Uploading ${i + 1}/${mediaFiles.length}: ${file.name}...`);
          
          const formData = new FormData();
          formData.append("file", file);
          formData.append("api_key", signData.apiKey);
          formData.append("timestamp", signData.timestamp);
          formData.append("signature", signData.signature);
          formData.append("folder", signData.folder);

          const res = await axios.post(
            `https://api.cloudinary.com/v1_1/${signData.cloudName}/${file.type.startsWith('video') ? 'video' : 'image'}/upload`,
            formData,
            {
              onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(`Uploading ${i + 1}/${mediaFiles.length}: ${percentCompleted}%`);
              }
            }
          );
          finalMediaUrls.push(res.data.secure_url);
        }
      }

      setUploadProgress("Finalizing post with AI categorization...");

      const type = mediaFiles.length > 0 ? (mediaFiles[0].type.startsWith('video') ? 'video' : 'image') : 'text';

      await api.post('/posts', {
        title,
        contentText: content,
        type,
        mediaUrls: finalMediaUrls
      });

      setTitle('');
      setContent('');
      setMediaFiles([]);
      setIsPosting(false);
      setUploadProgress('');
      fetchFeed();
    } catch (error) {
      console.error('Failed to create post', error);
      alert('Failed to publish post: ' + (error.response?.data?.error || error.message));
      setUploadProgress('');
      
      // OPTIONAL: Delete the newly uploaded files from Cloudinary if post fails
      // (This would require a new DELETE endpoint in the backend for publicIds)
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.delete(`/posts/${postId}`);
      fetchFeed(); // Refresh
    } catch (err) {
      alert('Failed to delete post: ' + (err.response?.data?.error || err.message));
    }
  };

  const canDeletePost = (postUserId) => {
    if (!user) return false;
    if (user.id === postUserId) return true;
    if (user.role === 'admin' || user.role === 'superadmin') return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex justify-between items-center glass-card p-6 mb-10 relative z-20 overflow-visible">
          <div className="flex items-center gap-6">
            <div 
              onClick={() => navigate('/profile')}
              className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-indigo-300 ring-4 ring-white cursor-pointer hover:scale-105 transition-transform overflow-hidden"
              title="Go to Profile"
            >
              {user?.profile_pic_url ? (
                <img src={user.profile_pic_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-2xl font-black">{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">Personal AI Feed</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{user?.role}</p>
            </div>
          </div>
          
          <div className="flex-1 max-w-md mx-4 hidden md:block">
             <div className="flex gap-2 mb-2 p-1 bg-gray-100/50 rounded-xl w-fit">
                <button 
                  onClick={() => setSearchMode('posts')}
                  className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${searchMode === 'posts' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Posts
                </button>
                <button 
                  onClick={() => setSearchMode('bloggers')}
                  className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${searchMode === 'bloggers' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Bloggers
                </button>
             </div>
             <form onSubmit={handleSearch} className="relative group">
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchMode === 'posts' ? "Deep search using AI & GIN index..." : "Find bloggers by social rank..."}
                  className="w-full bg-gray-50/50 border border-gray-200/50 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all group-hover:border-indigo-300"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                {searchTerm && (
                  <button 
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase"
                  >
                    Clear
                  </button>
                )}

                {/* Instagram Style Blogger Results Dropdown */}
                {searchMode === 'bloggers' && searchTerm.trim() && (
                  <div className="absolute top-14 left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                       <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recommended Bloggers</h4>
                       {isBloggerLoading && <Loader2 className="animate-spin text-indigo-600" size={12} />}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {bloggerResults.length === 0 && !isBloggerLoading ? (
                        <div className="p-8 text-center text-sm text-gray-400 font-bold">No bloggers found matching your circle.</div>
                      ) : (
                        bloggerResults.map(blogger => (
                          <div 
                            key={blogger.id}
                            onClick={() => navigate(`/profile/${blogger.id}`)}
                            className="p-4 flex items-center gap-4 hover:bg-indigo-50/30 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                          >
                             <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 bg-indigo-100 flex items-center justify-center">
                               {blogger.profile_pic_url ? (
                                 <img src={blogger.profile_pic_url} alt={blogger.username} className="w-full h-full object-cover" />
                               ) : (
                                 <span className="text-indigo-600 font-black text-lg">{blogger.username.charAt(0).toUpperCase()}</span>
                               )}
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                   <span className="font-bold text-gray-900 truncate">{blogger.username}</span>
                                   {blogger.social_tier === 1 && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Following/Follower"></span>}
                                </div>
                                <div className="text-xs text-gray-500 truncate font-medium">{blogger.full_name}</div>
                                {blogger.mutual_username && (
                                  <div className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                                     <span>Followed by {blogger.mutual_username}</span>
                                     {blogger.total_mutuals > 1 && <span>+ {blogger.total_mutuals - 1} more</span>}
                                  </div>
                                )}
                                {!blogger.mutual_username && blogger.total_followers > 0 && (
                                   <div className="text-[10px] text-gray-400 font-bold mt-0.5">
                                      {blogger.total_followers.toLocaleString()} followers
                                   </div>
                                )}
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
             </form>
          </div>

          <div className="flex items-center gap-3 sm:gap-6 relative">
             <button
               onClick={() => setShowNotificationModal(!showNotificationModal)}
               className="relative p-2 text-gray-400 hover:text-indigo-600 transition-colors"
             >
               <Bell size={24} className={unreadCount > 0 ? 'fill-indigo-100 text-indigo-600' : ''} />
               {unreadCount > 0 && (
                 <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce-short">
                   {unreadCount > 99 ? '99+' : unreadCount}
                 </span>
               )}
             </button>

             {showNotificationModal && (
               <div className="absolute top-12 right-0 w-80 bg-white shadow-2xl rounded-2xl border border-gray-100 z-50 overflow-hidden animate-fade-in">
                 <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                   <h3 className="font-black text-gray-800">Notifications</h3>
                   <button 
                     onClick={async () => {
                       await api.put('/notifications/read-all');
                       fetchNotifications();
                     }}
                     className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                   >
                     Mark all read
                   </button>
                 </div>
                 <div className="max-h-96 overflow-y-auto custom-scrollbar">
                   {notifications.length === 0 ? (
                     <div className="p-6 text-center text-sm text-gray-400 font-bold">No notifications yet.</div>
                   ) : (
                     notifications.map(notif => (
                       <div 
                         key={notif.id} 
                         onClick={() => handleNotificationClick(notif)}
                         className={`p-4 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 flex gap-3 ${!notif.is_read ? 'bg-indigo-50/30' : ''}`}
                       >
                         <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                           {notif.actor_name ? notif.actor_name.charAt(0) : notif.actor_username?.charAt(0).toUpperCase()}
                         </div>
                         <div>
                           <p className="text-sm font-medium text-gray-700">
                             <span className="font-bold text-gray-900">{notif.actor_username}</span>
                             {notif.type === 'follow' && ' started following you'}
                             {notif.type === 'like_post' && ' liked your post'}
                             {notif.type === 'comment' && ' commented on your post'}
                             {notif.type === 'reply' && ' replied to your comment'}
                             {notif.type === 'new_post' && ' published a new post'}
                           </p>
                           <p className="text-xs text-gray-400 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
               </div>
             )}

             {(user?.role === 'admin' || user?.role === 'superadmin') && (
               <button 
                 onClick={() => navigate('/admin')} 
                 className="hidden sm:flex items-center gap-1 text-amber-600 font-bold hover:text-amber-700 transition-colors"
               >
                 <Shield size={16} /> Admin Panel
               </button>
             )}
             
             <button onClick={logout} className="text-red-500 font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100 hover:bg-red-100 transition-colors">Logout</button>
          </div>
        </div>

        {/* Mobile Search Section */}
        <div className="md:hidden mb-8 space-y-4">
          <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl w-fit">
            <button 
              onClick={() => setSearchMode('posts')}
              className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${searchMode === 'posts' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Posts
            </button>
            <button 
              onClick={() => setSearchMode('bloggers')}
              className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${searchMode === 'bloggers' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Bloggers
            </button>
          </div>
          <form onSubmit={handleSearch} className="relative group">
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchMode === 'posts' ? "Search posts..." : "Find bloggers..."}
              className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            {searchTerm && (
              <button 
                type="button"
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-600 uppercase"
              >
                Clear
              </button>
            )}

            {/* Mobile Dropdown Results */}
            {searchMode === 'bloggers' && searchTerm.trim() && (
              <div className="absolute top-16 left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                  <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Results</h4>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {bloggerResults.length === 0 && !isBloggerLoading ? (
                    <div className="p-6 text-center text-xs text-gray-400 font-bold">No bloggers found.</div>
                  ) : (
                    bloggerResults.map(blogger => (
                      <div 
                        key={blogger.id}
                        onClick={() => navigate(`/profile/${blogger.id}`)}
                        className="p-3 flex items-center gap-3 hover:bg-indigo-50/30 cursor-pointer border-b border-gray-50 last:border-0"
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 bg-indigo-50 flex items-center justify-center shrink-0">
                          {blogger.profile_pic_url ? (
                            <img src={blogger.profile_pic_url} alt={blogger.username} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-indigo-600 font-black text-sm">{blogger.username.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 text-sm truncate">{blogger.username}</div>
                          <div className="text-[10px] text-gray-500 truncate">{blogger.full_name}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Mobile-only Admin Button */}
        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <button 
            onClick={() => navigate('/admin')} 
            className="sm:hidden w-full mb-4 py-2 bg-amber-50 text-amber-600 rounded-xl font-bold text-sm border border-amber-100 flex items-center justify-center gap-2"
          >
            <Shield size={16} /> Access Admin Dashboard
          </button>
        )}

        {/* Create Post UI */}
        {!isPosting ? (
          <button onClick={() => setIsPosting(true)} className="w-full py-8 bg-white border-2 border-dashed border-gray-300 rounded-[2rem] text-gray-400 font-bold mb-10 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all group">
            <span className="group-hover:scale-110 inline-block transition-transform">+ Create a New Post</span>
          </button>
        ) : (
          <form onSubmit={handlePostSubmit} className="bg-white p-8 rounded-[2rem] border-2 border-indigo-100 shadow-xl shadow-indigo-50/50 mb-10 animate-in fade-in slide-in-from-top-4 duration-300 relative overflow-hidden">
             
            {uploadProgress && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-4 animate-fade-in">
                 <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                 <p className="font-bold text-indigo-800">{uploadProgress}</p>
                 <p className="text-sm text-gray-500 font-medium">Auto-Categorizing via AI...</p>
              </div>
            )}

            <input 
              className="w-full text-2xl font-black p-2 mb-4 outline-none placeholder-gray-300 border-b border-gray-50 focus:border-indigo-200 transition-colors text-gray-800"
              placeholder="Post Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea 
              className="w-full h-40 p-2 text-gray-600 outline-none resize-none placeholder-gray-300 leading-relaxed font-medium"
              placeholder="Write your content here..." 
              value={content} 
              onChange={(e) => setContent(e.target.value)}
            />

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 mt-4 border-t border-gray-50">
              <div className="w-full sm:w-auto relative">
                <input 
                  type="file" 
                  id="mediaUpload" 
                  className="hidden"
                  multiple
                  onChange={handleFileSelect}
                  accept="image/*, video/*"
                />
                <label 
                  htmlFor="mediaUpload" 
                  onClick={() => alert("Media Upload Limitations:\n\n• Images: Up to 10MB each\n• Videos: Up to 50MB each\n• Limit: Max 4 files total per post.")}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:bg-gray-100 hover:text-indigo-600 hover:border-indigo-300 cursor-pointer transition-all w-full sm:w-auto"
                >
                  <UploadCloud size={20} />
                  {mediaFiles.length > 0 ? `${mediaFiles.length} File(s) Selected` : 'Attach Media Gallery'}
                </label>
              </div>

              <div className="flex gap-4 w-full sm:w-auto">
                <button type="button" onClick={() => setIsPosting(false)} className="px-6 py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors flex-1 sm:flex-none">Discard</button>
                <button type="submit" className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 transition-all flex-1 sm:flex-none">Publish</button>
              </div>
            </div>
          </form>
        )}

        {/* Feed List */}
        <div className="space-y-8 pb-20">
          {isSearching && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100"
            >
              <p className="text-sm font-bold text-indigo-800">Showing search results for: <span className="italic text-indigo-600">"{searchTerm}"</span></p>
              <button onClick={handleClearSearch} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600">Reset Feed</button>
            </motion.div>
          )}

          <div className="w-full relative">
            {loading && posts.length === 0 ? (
              <div 
                key="loader"
                className="space-y-6"
              >
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-card p-6 sm:p-8 relative overflow-hidden animate-pulse">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div className="h-4 bg-gray-200 rounded w-24" />
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
                    <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-5/6 mb-6" />
                    <div className="w-full h-48 bg-gray-200 rounded-2xl mb-6" />
                  </div>
                ))}
              </div>
            ) : posts.length > 0 ? (
              <Virtuoso
                useWindowScroll
                data={posts}
                endReached={() => {
                  if (hasMore && !loading && !isLoadingMore) fetchFeed(false);
                }}
                components={{
                  Footer: () => hasMore ? (
                    <div className="flex justify-center py-6">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-400 font-bold text-sm uppercase tracking-widest border-t border-gray-100">
                      You've reached the end of the line
                    </div>
                  )
                }}
                itemContent={(idx, post) => (
                  <div className="pb-8">
                    <ViewTracker key={post.id} postId={post.id}>
                      <div 
                        id={`post-${post.id}`} 
                        className="glass-card p-6 sm:p-8 hover:shadow-2xl hover:shadow-indigo-100/50 transition-shadow duration-500 group relative animate-fade-in"
                      >
              
              {canDeletePost(post.user_id) && (
                <button 
                  onClick={() => handleDeletePost(post.id)}
                  className="absolute top-8 right-8 text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
                  title="Delete post"
                >
                  <Trash2 size={20} />
                </button>
              )}

              <div className="flex items-center justify-between mb-6 pr-12">
                <div className="flex items-center gap-3">
                  <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider border border-indigo-100">
                    {post.category_name || 'Uncategorized'}
                  </span>
                  <span className="text-gray-300 text-[10px] font-bold">•</span>
                  <span className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                  {post.author_role === 'admin' && (
                     <>
                       <span className="text-gray-300 text-[10px] font-bold">•</span>
                       <span className="text-pink-600 text-[10px] font-black uppercase tracking-tighter bg-pink-50 px-2 py-0.5 rounded-md">Admin</span>
                     </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-sm cursor-pointer" onClick={() => navigate(`/profile/${post.user_id}`)}>
                   {post.author_username?.charAt(0).toUpperCase()}
                 </div>
                 <span className="font-bold text-gray-700 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => navigate(`/profile/${post.user_id}`)}>{post.author_username}</span>
              </div>

              <h2 className="text-2xl font-black text-gray-900 mb-3 leading-tight group-hover:text-indigo-700 transition-colors">
                {post.title}
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6 whitespace-pre-wrap font-medium">
                {post.content_text}
              </p>

              {(() => {
                let urls = [];
                if (post.media_urls && post.media_urls.length > 0) {
                  urls = typeof post.media_urls === 'string' ? JSON.parse(post.media_urls) : post.media_urls;
                } else if (post.media_url) {
                  urls = [post.media_url];
                }

                if (urls.length === 0) return null;

                return (
                  <div className={`grid gap-3 mb-8 ${urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {urls.map((url, idx) => (
                      <div key={idx} className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm max-h-[500px] bg-gray-50 flex items-center justify-center">
                        {url.match(/\.(mp4|webm|ogg)$/i) || post.type === 'video' ? (
                          <video src={url} controls className="w-full h-full object-cover" />
                        ) : (
                          <img src={getOptimizedUrl(url)} alt={`Post media ${idx}`} className="w-full h-full object-cover" loading="lazy" />
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-6 gap-4">
                <div className="flex gap-4 sm:gap-8">
                  <button 
                    onClick={() => handleReact(post.id, 'like')} 
                    disabled={post.user_id === user.id}
                    className={`flex flex-col sm:flex-row items-center gap-2 text-sm font-bold transition-colors ${post.is_liked ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'} ${post.user_id === user.id ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <ThumbsUp size={22} className={post.is_liked ? 'fill-green-600' : ''} />
                    <span className="hover:underline" onClick={(e) => openLikesModal(e, 'post', post.id)}>{post.likes_count || 0}</span>
                  </button>
                  <button 
                    onClick={() => handleReact(post.id, 'dislike')} 
                    disabled={post.user_id === user.id}
                    className={`flex flex-col sm:flex-row items-center gap-2 text-sm font-bold transition-colors ${post.is_disliked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'} ${post.user_id === user.id ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <ThumbsDown size={22} className={post.is_disliked ? 'fill-red-500' : ''} />
                    <span>{post.dislikes_count || 0}</span>
                  </button>
                  <button 
                    onClick={() => toggleComments(post.id)} 
                    className={`flex flex-col sm:flex-row items-center gap-2 text-sm font-bold transition-colors ${expandedComments[post.id] ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <MessageSquare size={22} className={expandedComments[post.id] ? 'fill-indigo-600' : ''} />
                    <span>{post.comments_count || 0}</span>
                  </button>
                </div>
                <button 
                  onClick={() => handleBookmark(post.id)} 
                  disabled={post.user_id === user.id}
                  className={`flex items-center justify-center p-3 sm:py-2 px-4 rounded-xl text-sm font-bold transition-colors ${post.is_bookmarked ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'} ${post.user_id === user.id ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {post.is_bookmarked ? <><BookmarkCheck size={18} className="mr-2 hidden sm:block" /> Saved</> : <><Bookmark size={18} className="mr-2 hidden sm:block" /> Save</>}
                </button>
              </div>

              {/* Collapsible Comments Section */}
              {expandedComments[post.id] && (
                <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-6 animate-fade-in">
                  <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {commentsData[post.id] ? (
                      commentsData[post.id].length > 0 ? (
                        commentsData[post.id].filter(c => !c.parent_id).map(comment => (
                          <div key={comment.id} className="flex flex-col gap-3">
                            {/* Parent Comment */}
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-[10px] overflow-hidden shrink-0">
                                     {comment.author_avatar ? <img src={comment.author_avatar} alt="Avatar" className="w-full h-full object-cover" /> : comment.author_username?.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-bold text-sm text-gray-800">{comment.author_username}</span>
                                  {comment.author_role === 'admin' && <span className="text-[0.6rem] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase font-black tracking-widest border border-indigo-200">Admin</span>}
                                </div>
                                <button onClick={() => setReplyTargets(prev => ({...prev, [post.id]: comment.id}))} className="text-xs font-bold text-indigo-500 hover:text-indigo-700">Reply</button>
                              </div>
                              <p className="text-sm text-gray-600 font-medium pl-8">{comment.text}</p>
                            </div>
                            
                            {/* Nested Replies */}
                            <div className="pl-6 flex flex-col gap-3">
                              {commentsData[post.id].filter(c => c.parent_id === comment.id).map(reply => (
                                <div key={reply.id} className="bg-gray-100 p-3 rounded-2xl border-l-4 border-indigo-400 flex flex-col text-sm shadow-sm relative before:content-[''] before:absolute before:w-4 before:h-[2px] before:bg-indigo-200 before:-left-[18px] before:top-4">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-[10px] overflow-hidden shrink-0">
                                       {reply.author_avatar ? <img src={reply.author_avatar} alt="Avatar" className="w-full h-full object-cover" /> : reply.author_username?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-bold text-gray-800 text-xs">{reply.author_username}</span>
                                    {reply.author_role === 'admin' && <span className="text-[0.6rem] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase font-black">Admin</span>}
                                  </div>
                                  <p className="text-gray-600 font-medium text-xs">{reply.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-sm text-gray-400 font-bold py-6 italic">No comments yet. Be the first to strike a conversation!</div>
                      )
                    ) : (
                      <div className="text-center text-sm text-indigo-400 font-bold py-4 animate-pulse">Loading discussion...</div>
                    )}
                  </div>

                  {replyTargets[post.id] && (
                    <div className="flex justify-between items-center text-xs font-bold text-indigo-600 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                      <span>Replying to thread...</span>
                      <button onClick={() => setReplyTargets(prev => ({...prev, [post.id]: null}))} className="hover:text-indigo-800 underline">Cancel</button>
                    </div>
                  )}

                  {(!replyTargets[post.id] && post.user_id === user.id) ? (
                    <div className="text-center text-xs text-gray-400 font-bold p-3 border-2 border-dashed border-gray-200 rounded-xl">
                      As the Author, you can only post replies to existing comment threads.
                    </div>
                  ) : (
                    <form onSubmit={(e) => handleAddComment(post.id, e, replyTargets[post.id])} className="flex items-center gap-3">
                       <input 
                         type="text" 
                         className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-800" 
                         placeholder={replyTargets[post.id] ? "Type reply..." : "Add a comment..."}
                         value={newComment[post.id] || ''}
                         onChange={(e) => setNewComment(prev => ({...prev, [post.id]: e.target.value}))}
                       />
                       <button type="submit" className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 shadow-md hover:shadow-lg active:scale-95 transition-all shrink-0 disabled:opacity-50" disabled={!newComment[post.id]}>
                         <Send size={18} />
                       </button>
                    </form>
                  )}
                </div>
              )}
                      </div>
                    </ViewTracker>
                  </div>
                )}
              />
            ) : (
              <div 
                key="empty"
                className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-200 animate-fade-in"
              >
                <p className="text-gray-400 font-bold italic text-lg">No stories in your feed yet. Be the first to create one!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showLikesModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLikesModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative z-10 overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-gray-800 text-lg">Liked By</h3>
                <button onClick={() => setShowLikesModal(false)} className="text-gray-400 hover:text-gray-600 font-bold p-1 text-xl leading-none">&times;</button>
              </div>
              <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col gap-1">
                {loadingLikes ? (
                  <div className="p-8 text-center text-indigo-400 font-bold animate-pulse text-sm">Loading users...</div>
                ) : likesModalData.length > 0 ? (
                  likesModalData.map((like) => (
                    <Link to={`/profile/${like.user_id}`} key={like.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl transition-colors group">
                      <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm overflow-hidden shadow-sm">
                        {like.avatar ? <img src={like.avatar} alt="Avatar" className="w-full h-full object-cover" /> : like.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 text-sm group-hover:text-indigo-600 transition-colors">{like.username}</span>
                        {like.full_name && <span className="text-xs text-gray-400 font-medium">{like.full_name}</span>}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400 font-bold text-sm italic">No likes found.</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Feed;
