import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { Check, ArrowLeft, Trash2, Camera, UserPlus, UserCheck, X, AlertCircle, ThumbsUp, ThumbsDown, MessageSquare, Send, Loader2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CategoryPicker from '../components/CategoryPicker';

const getOptimizedAvatar = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return url;
  const parts = url.split('/upload/');
  if (parts.length === 2) {
    return `${parts[0]}/upload/w_150,h_150,c_fill,q_auto:low,f_auto,g_face/${parts[1]}`;
  }
  return url;
};

const getThumbnailUrl = (urlsStr) => {
  if (!urlsStr) return null;
  try {
    const urls = typeof urlsStr === 'string' ? JSON.parse(urlsStr) : urlsStr;
    if (urls.length === 0) return null;
    const url = urls[0];
    if (url.match(/\.(mp4|webm|ogg)$/i)) return null; 
    const parts = url.split('/upload/');
    if (parts.length === 2) return `${parts[0]}/upload/w_400,h_300,c_fill,q_auto:good,f_auto/${parts[1]}`;
    return url;
  } catch { return null; }
};

const Profile = () => {
  const { id: targetUserId } = useParams();
  const { user, setUser, logoutAllDevices } = useAuth();
  
  // Is this the currently logged-in user's profile view?
  const isOwnProfile = !targetUserId || String(targetUserId) === String(user?.id);

  const [profile, setProfile] = useState({
    username: '',
    fullName: '',
    bio: '',
    profilePicUrl: '',
    role: 'user',
    preferences: [],
    twoStepEnabled: false,
    phoneNumber: '',
    isPhoneVerified: false,
    followersCount: 0,
    followingCount: 0,
    isFollowing: false
  });

  const [searchParams] = useSearchParams();
  const [expandedComments, setExpandedComments] = useState({});
  const [commentsData, setCommentsData] = useState({});
  const [newComment, setNewComment] = useState({});
  const [replyTargets, setReplyTargets] = useState({});
  const [myPosts, setMyPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('my_posts');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [togglingFollow, setTogglingFollow] = useState(false);
  const [followModal, setFollowModal] = useState({ show: false, type: '', data: [], loading: false });
  const [allCategoriesGroups, setAllCategoriesGroups] = useState({});
  const avatarInputRef = useRef(null);
  const navigate = useNavigate();

  // Close modal when navigating
  useEffect(() => {
    setFollowModal(prev => ({ ...prev, show: false }));
  }, [targetUserId]);

  const handleRequestVerification = async () => {
    try {
      if (!profile.phoneNumber) {
        alert('Please save your phone number first.');
        return;
      }
      await api.post('/users/profile/phone-verify/request', { phoneNumber: profile.phoneNumber });
      navigate('/verify-phone');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to request verification. Is the number formatted correctly?');
    }
  };

  const openFollowModal = async (type) => {
    setFollowModal({ show: true, type, data: [], loading: true });
    try {
      const idToFetch = targetUserId || user?.id;
      const { data: usersData } = await api.get(`/users/profile/${idToFetch}/${type}`);
      setFollowModal(prev => ({ ...prev, data: usersData.followers || usersData.following || [], loading: false }));
    } catch (err) {
      console.error(`Failed to fetch ${type}`, err);
      setFollowModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordStatus({ type: '', message: '' });
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New passwords do not match' });
      return;
    }
    
    setPasswordLoading(true);
    try {
      const response = await api.post('/users/profile/change-password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordStatus({ type: 'success', message: response.data.message });
      setUser(prev => ({ ...prev, hasPassword: true }));
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setShowPasswordModal(false), 2000);
    } catch (err) {
      setPasswordStatus({ type: 'error', message: err.response?.data?.error || 'Failed to change password' });
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await api.get('/users/categories');
        setAllCategoriesGroups(data.categories || {});
      } catch (err) {
        console.error('Failed to fetch categories', err);
      }
    };
    if (isOwnProfile) fetchCategories();
  }, [isOwnProfile]);

  useEffect(() => {
    const ownProfile = !targetUserId || String(targetUserId) === String(user?.id);
    const fetchProfile = async () => {
      try {
        const route = ownProfile ? '/users/profile' : `/users/profile/${targetUserId}`;
        const postsRoute = ownProfile ? '/posts/me' : `/posts/user/${targetUserId}`;
        const [profileRes, postsRes] = await Promise.all([
          api.get(route),
          api.get(postsRoute)
        ]);
        const data = profileRes.data;
        setProfile({
          username: data.username || '',
          fullName: data.full_name || '',
          bio: data.bio || '',
          profilePicUrl: data.profile_pic_url || '',
          role: data.role || 'user',
          preferences: typeof data.preferences === 'string' ? JSON.parse(data.preferences) : (data.preferences || []),
          twoStepEnabled: data.two_step_enabled || false,
          phoneNumber: data.phone_number || '',
          isPhoneVerified: data.is_phone_verified || false,
          followersCount: data.followersCount || 0,
          followingCount: data.followingCount || 0,
          isFollowing: data.isFollowing || false
        });
        setMyPosts(postsRes.data.posts || []);
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [targetUserId, user?.id]);
 
  const toggleComments = useCallback(async (postId, forceOpen = false) => {
    if (expandedComments[postId] && !forceOpen) {
      setExpandedComments(prev => ({ ...prev, [postId]: false }));
      return;
    }
    setExpandedComments(prev => ({ ...prev, [postId]: true }));
    try {
      const { data } = await api.get(`/interactions/posts/${postId}/comments`);
      setCommentsData(prev => ({ ...prev, [postId]: data.comments || [] }));
    } catch (err) { console.error(err); }
  }, [expandedComments]);

  const handleAddComment = useCallback(async (postId, e, parentId = null) => {
    e.preventDefault();
    const text = newComment[postId];
    if (!text || !text.trim()) return;
    try {
      const { data } = await api.post(`/interactions/posts/${postId}/comments`, { text, parentId });
      const joinedComment = {
         ...data.comment,
         author_username: user.username,
         author_role: user.role
      };
      setCommentsData(prev => ({ ...prev, [postId]: [...(prev[postId] || []), joinedComment] }));
      setNewComment(prev => ({ ...prev, [postId]: '' }));
      setReplyTargets(prev => ({ ...prev, [postId]: null }));
      setMyPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: Number(p.comments_count) + 1 } : p));
    } catch(err) {
      alert(err.response?.data?.error || 'Failed to add comment');
    }
  }, [newComment, user.username, user.role]);

  // Deep linking for notifications
  useEffect(() => {
    const postId = searchParams.get('postId');
    if (postId && myPosts.length > 0) {
      setActiveTab('my_posts');
      setTimeout(() => {
        const el = document.getElementById(`post-${postId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-indigo-300');
          toggleComments(postId, true);
          setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-300'), 3000);
        }
      }, 500);
    }
  }, [searchParams, myPosts, toggleComments]);

  const handleToggleFollow = async () => {
    if (isOwnProfile) return;
    setTogglingFollow(true);
    try {
      const { data } = await api.post(`/users/profile/${targetUserId}/follow`);
      setProfile(prev => ({
        ...prev,
        isFollowing: data.following,
        followersCount: data.following ? prev.followersCount + 1 : prev.followersCount - 1
      }));
    } catch (err) {
      console.error(err);
      alert('Failed to follow user');
    }
    setTogglingFollow(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.post('/users/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(prev => ({ ...prev, profilePicUrl: res.data.profilePicUrl }));
    } catch (err) {
      console.error('Avatar upload failed', err);
      alert('Failed to upload avatar. Please try a smaller image.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePreferenceToggle = (cat) => {
    setProfile(prev => {
      const prefs = prev.preferences.includes(cat)
        ? prev.preferences.filter(p => p !== cat)
        : [...prev.preferences, cat];
      return { ...prev, preferences: prefs };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await api.put('/users/profile', profile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save profile', err);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handle2FAToggle = async () => {
    try {
      const newStatus = !profile.twoStepEnabled;
      await api.post('/users/profile/2fa', { enabled: newStatus, phoneNumber: profile.phoneNumber });
      setProfile(prev => ({ ...prev, twoStepEnabled: newStatus }));
    } catch (err) {
      console.error(err);
      alert('Failed to update 2FA status. Ensure your phone number is valid.');
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm("This will log you out, and you must verify your email to log back in. Are you sure you want to deactivate your account?")) return;
    try {
      await api.post('/users/profile/deactivate');
      logoutAllDevices();
    } catch (err) {
      console.error(err);
      alert('Failed to deactivate account.');
    }
  };

  const handleDeleteSelf = async () => {
    if (!window.confirm("WARNING: This action is irreversible. All your posts, interactions, and data will be permanently purged. Are you absolutely sure?")) return;
    try {
      await api.delete(`/users/${user.id}`);
      logoutAllDevices();
    } catch (err) {
      console.error(err);
      alert('Failed to delete account.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-20 px-4">
        <div className="w-full max-w-4xl space-y-8 animate-pulse">
          <div className="h-10 w-32 bg-gray-200 rounded-lg self-start"></div>
          <div className="bg-white p-8 rounded-3xl border border-gray-100 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-32 h-32 rounded-full bg-gray-200 shrink-0"></div>
            <div className="flex-1 w-full flex flex-col gap-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-16 bg-gray-200 rounded w-full"></div>
            </div>
            <div className="w-32 h-10 bg-gray-200 rounded-xl"></div>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-gray-100 h-96"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/feed')} className="mb-6 text-indigo-600 font-bold flex items-center gap-2 hover:-translate-x-1 transition-transform">
          <ArrowLeft size={18} /> Back to Feedback
        </button>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div 
              className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl font-black text-white shadow-lg shrink-0 overflow-hidden relative ${isOwnProfile ? 'cursor-pointer group' : ''} ${
                profile.role === 'superadmin' ? 'bg-black' : 'bg-indigo-600'
              }`}
              onClick={() => isOwnProfile && avatarInputRef.current?.click()}
            >
               {profile.profilePicUrl ? (
                 <img src={getOptimizedAvatar(profile.profilePicUrl)} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                 profile.fullName ? profile.fullName.charAt(0).toUpperCase() : profile.username?.charAt(0).toUpperCase()
               )}
               
               {isOwnProfile && (
                   <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                     {uploadingAvatar ? (
                       <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                     ) : (
                       <Camera size={24} className="text-white" />
                     )}
                   </div>
               )}
            </div>
            {isOwnProfile && (
              <input 
                ref={avatarInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarUpload}
              />
            )}
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-center sm:justify-start gap-3 mb-2">
                <h1 className="text-3xl font-black text-gray-900">{profile.fullName || profile.username || 'Profile'}</h1>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase w-fit mx-auto sm:mx-0 ${
                  profile.role === 'superadmin' ? 'bg-black text-white' : 
                  profile.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                }`}>
                  {profile.role}
                </span>
              </div>
              <p className="text-gray-500 font-medium mb-3">@{profile.username}</p>

              <div className="flex justify-center sm:justify-start gap-2 mb-4">
                <div onClick={() => openFollowModal('followers')} className="text-center cursor-pointer hover:bg-gray-100 px-4 py-2 rounded-2xl transition-colors">
                  <span className="block font-black text-xl text-gray-900">{profile.followersCount || 0}</span>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Followers</span>
                </div>
                <div onClick={() => openFollowModal('following')} className="text-center cursor-pointer hover:bg-gray-100 px-4 py-2 rounded-2xl transition-colors">
                  <span className="block font-black text-xl text-gray-900">{profile.followingCount || 0}</span>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Following</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start mt-4">
                 {!isOwnProfile && (
                   <button 
                     onClick={handleToggleFollow}
                     disabled={togglingFollow}
                     className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all shadow-sm active:scale-95 ${
                       profile.isFollowing 
                         ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600' 
                         : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                     }`}
                   >
                     {profile.isFollowing ? 'Unfollow' : (
                       <><UserPlus size={18} /> Follow</>
                     )}
                   </button>
                 )}
                 {isOwnProfile && (user?.role === 'admin' || user?.role === 'superadmin') && (
                   <button 
                     onClick={() => navigate('/admin')}
                     className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl font-bold text-sm hover:bg-orange-100 transition-colors"
                   >
                     🛠️ Manage System
                   </button>
                 )}
                  {isOwnProfile && (
                    <button 
                      onClick={() => setShowPasswordModal(true)}
                      className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors"
                    >
                       {user?.hasPassword ? 'Change Password' : 'Set Password'}
                    </button>
                  )}
                  {isOwnProfile && (
                    <button 
                      onClick={() => logoutAllDevices()}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
                    >
                       Logout Everywhere
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>

        {isOwnProfile && (
          <>
            <form onSubmit={handleSave} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
               Profile Settings
            </h2>
            
            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none" 
                  placeholder="John Doe"
                  value={profile.fullName}
                  onChange={e => setProfile({...profile, fullName: e.target.value})}
                />
              </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Picture</label>
              <button 
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-bold text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploadingAvatar ? (
                  <><div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> Uploading...</>
                ) : (
                  <><Camera size={16} /> {profile.profilePicUrl ? 'Change Photo' : 'Upload Photo'}</>
                )}
              </button>
            </div>
          </div>

          <div className="mb-8">
             <label className="block text-sm font-semibold text-gray-700 mb-2">Short Bio</label>
             <textarea 
               className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none min-h-[100px] resize-y"
               placeholder="Tell the community about yourself..."
               value={profile.bio}
               onChange={e => setProfile({...profile, bio: e.target.value})}
             />
          </div>

          <div className="border-t border-gray-100 pt-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Security & Verification</h2>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
                <input 
                  type="tel" 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none flex-1 disabled:bg-gray-100 disabled:text-gray-400" 
                  placeholder="+15555555555"
                  value={profile.phoneNumber}
                  onChange={e => setProfile({...profile, phoneNumber: e.target.value})}
                  disabled={profile.twoStepEnabled || profile.isPhoneVerified}
                />
                {!profile.isPhoneVerified && profile.phoneNumber && (
                  <button type="button" onClick={handleRequestVerification} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-colors shrink-0">
                    Verify Number
                  </button>
                )}
                {profile.isPhoneVerified && (
                  <div className="flex items-center justify-center gap-2 text-green-700 font-bold bg-green-100 px-6 py-3 rounded-xl shrink-0">
                    <Check size={18} /> Verified
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                <div className="text-center sm:text-left mb-4 sm:mb-0">
                  <p className="font-bold text-gray-900">Two-Step Verification</p>
                  <p className="text-sm text-gray-500 font-medium">Require an SMS code when logging in</p>
                </div>
                <button 
                  type="button" 
                  onClick={handle2FAToggle}
                  className={`px-6 py-3 rounded-xl font-bold transition-all w-full sm:w-auto ${
                    profile.twoStepEnabled 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={!profile.isPhoneVerified && !profile.twoStepEnabled}
                >
                  {profile.twoStepEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Feed Preferences</h2>
            <p className="text-sm text-gray-500 font-medium mb-8">Select categories to tune your AI feed algorithm. We use these to prioritize content in your global feed.</p>
            
            <CategoryPicker 
              selectedCategories={profile.preferences}
              onToggle={handlePreferenceToggle}
              categoriesByGroup={allCategoriesGroups}
            />
          </div>

          <div className="flex items-center gap-4 border-t border-gray-100 pt-8">
            <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 transition-all w-full sm:w-auto" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {success && <span className="text-green-600 flex items-center gap-1 font-bold animate-fade-in"><Check size={20}/> Saved</span>}
          </div>
        </form>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-red-100 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-500 font-medium mb-6">Restricted actions that modify the active state of your account.</p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 border border-red-50 p-6 rounded-2xl bg-red-50/30">
            <button 
              onClick={handleDeactivate}
              className="w-full sm:w-auto px-6 py-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 hover:border-red-300 transition-all shadow-sm"
            >
              Deactivate Account
            </button>
            <button 
              onClick={handleDeleteSelf}
              className="w-full sm:w-auto px-8 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 active:bg-red-200 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={18} /> Delete Account
            </button>
          </div>
          </div>
        </>
        )}

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex flex-wrap items-center gap-2 sm:gap-6 mb-8 border-b border-gray-100">
             <button onClick={() => setActiveTab('my_posts')} className={`pb-4 px-2 font-bold transition-colors ${activeTab === 'my_posts' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>{isOwnProfile ? 'My Posts' : 'Posts'}</button>
             {isOwnProfile && (
               <>
                 <button onClick={async () => { setActiveTab('liked'); if (likedPosts.length === 0) { try { const res = await api.get('/posts/liked'); setLikedPosts(res.data.posts || []); } catch(e) { console.error(e); } } }} className={`pb-4 px-2 font-bold transition-colors ${activeTab === 'liked' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>Liked Content</button>
                 <button onClick={async () => { setActiveTab('bookmarked'); if (bookmarkedPosts.length === 0) { try { const res = await api.get('/posts/bookmarked'); setBookmarkedPosts(res.data.posts || []); } catch(e) { console.error(e); } } }} className={`pb-4 px-2 font-bold transition-colors ${activeTab === 'bookmarked' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>Bookmarks</button>
               </>
             )}
          </div>
          
          <div className="space-y-6">
            {activeTab === 'my_posts' && (myPosts.length === 0 ? <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200"><p className="text-gray-400 font-bold italic">{isOwnProfile ? "You haven't authored any posts yet." : 'No posts yet.'}</p></div> : myPosts.map(post => {
              const thumb = getThumbnailUrl(post.media_urls || post.media_url);
              const isExpanded = expandedComments[post.id];
              return (
                <div key={post.id} id={`post-${post.id}`} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col gap-6 hover:border-indigo-200 hover:shadow-xl transition-all duration-300">
                  <div className="flex flex-col sm:flex-row gap-6">
                    {thumb && <div className="w-full sm:w-40 h-40 shrink-0"><img src={thumb} alt="Post thumbnail" className="w-full h-full object-cover rounded-2xl shadow-md" /></div>}
                    <div className="flex flex-col gap-3 flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-black text-gray-900 text-2xl tracking-tight">{post.title}</h3>
                        <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                           <span className="text-[10px] font-black uppercase text-gray-400">{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 leading-relaxed whitespace-pre-wrap font-medium">{post.content_text}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-auto">
                        <span className="text-[10px] font-black tracking-widest uppercase bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg shadow-sm">
                          {post.category_name || 'Uncategorized'}
                        </span>
                        
                        <div className="flex items-center gap-4 ml-auto">
                           <div className="flex items-center gap-1.5 text-gray-400 font-black text-xs">
                             <ThumbsUp size={16} /> {post.likes_count || 0}
                           </div>
                           <div className="flex items-center gap-1.5 text-gray-400 font-black text-xs">
                             <ThumbsDown size={16} /> {post.dislikes_count || 0}
                           </div>
                           <button 
                             onClick={() => toggleComments(post.id)}
                             className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-xs transition-all ${isExpanded ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'}`}
                           >
                             <MessageSquare size={16} /> {post.comments_count || 0} {isExpanded ? 'Hide' : 'Manage'}
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 pt-6 animate-in slide-in-from-top-4 duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Post Comments</h4>
                        {isOwnProfile && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Author Mode</span>}
                      </div>

                      <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-4 custom-scrollbar">
                        {commentsData[post.id]?.length === 0 ? (
                          <p className="text-center py-4 text-sm text-gray-400 font-bold italic">No comments yet.</p>
                        ) : (
                          commentsData[post.id]?.map(comment => (
                            <div key={comment.id} className={`bg-white p-4 rounded-2xl border border-gray-50 shadow-sm ${comment.parent_id ? 'ml-8 border-l-2 border-l-indigo-200' : ''}`}>
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-gray-900 text-xs">@{comment.author_username}</span>
                                    {comment.user_id === post.user_id && <span className="bg-indigo-100 text-indigo-600 text-[8px] px-1.5 py-0.5 rounded font-black uppercase">Author</span>}
                                  </div>
                                  <span className="text-[10px] text-gray-400 font-bold">{new Date(comment.created_at).toLocaleTimeString()}</span>
                               </div>
                               <p className="text-sm text-gray-600 font-medium mb-3">{comment.text}</p>
                               {!comment.parent_id && (
                                 <button 
                                   onClick={() => setReplyTargets(prev => ({ ...prev, [post.id]: comment }))}
                                   className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider"
                                 >
                                   Reply
                                 </button>
                               )}
                            </div>
                          ))
                        )}
                      </div>

                      <form onSubmit={(e) => handleAddComment(post.id, e, replyTargets[post.id]?.id)} className="relative">
                        {replyTargets[post.id] && (
                          <div className="flex items-center justify-between bg-indigo-50 px-4 py-2 rounded-t-xl border-x border-t border-indigo-100 mb-[-1px] animate-in slide-in-from-bottom-2 duration-200">
                             <span className="text-[10px] font-bold text-indigo-700">Replying to <span className="font-black">@{replyTargets[post.id].author_username}</span></span>
                             <button type="button" onClick={() => setReplyTargets(prev => ({ ...prev, [post.id]: null }))} className="text-[10px] font-black text-gray-400 hover:text-red-500">Cancel</button>
                          </div>
                        )}
                        <input 
                          type="text"
                          value={newComment[post.id] || ''}
                          onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder={replyTargets[post.id] ? "Write your reply..." : "Reply to your readers..."}
                          className={`w-full bg-white border border-gray-200 py-3 pl-4 pr-12 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all ${replyTargets[post.id] ? 'rounded-b-2xl' : 'rounded-2xl'}`}
                        />
                        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:scale-110 transition-transform">
                          <Send size={20} />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            }))}

            {activeTab === 'liked' && (likedPosts.length === 0 ? <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200"><p className="text-gray-400 font-bold italic">You haven't liked any posts yet.</p></div> : likedPosts.map(post => {
              const thumb = getThumbnailUrl(post.media_urls || post.media_url);
              return (
                <Link to={'/feed'} key={post.id} className="block bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col sm:flex-row gap-4 hover:border-indigo-200 hover:shadow-md transition-all group no-underline">
                  {thumb && <div className="w-full sm:w-32 h-40 sm:h-32 shrink-0"><img src={thumb} alt="Post thumbnail" className="w-full h-full object-cover rounded-xl shadow-sm" /></div>}
                  <div className="flex flex-col gap-2 flex-1">
                    <h3 className="font-bold text-gray-900 text-xl group-hover:text-indigo-600 transition-colors">{post.title}</h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap line-clamp-2 sm:line-clamp-3">{post.content_text}</p>
                    <div className="flex items-center gap-3 mt-auto pt-2">
                      <span className="text-[10px] font-black tracking-widest uppercase bg-pink-100 text-pink-700 px-3 py-1.5 rounded-lg shadow-sm">
                        ❤ Liked
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">By @{post.author_username}</span>
                    </div>
                  </div>
                </Link>
            )}))}

            {activeTab === 'bookmarked' && (bookmarkedPosts.length === 0 ? <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200"><p className="text-gray-400 font-bold italic">You haven't bookmarked any posts yet.</p></div> : bookmarkedPosts.map(post => {
              const thumb = getThumbnailUrl(post.media_urls || post.media_url);
              return (
                <Link to={'/feed'} key={post.id} className="block bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col sm:flex-row gap-4 hover:border-indigo-200 hover:shadow-md transition-all group no-underline">
                  {thumb && <div className="w-full sm:w-32 h-40 sm:h-32 shrink-0"><img src={thumb} alt="Post thumbnail" className="w-full h-full object-cover rounded-xl shadow-sm" /></div>}
                  <div className="flex flex-col gap-2 flex-1">
                    <h3 className="font-bold text-gray-900 text-xl group-hover:text-indigo-600 transition-colors">{post.title}</h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap line-clamp-2 sm:line-clamp-3">{post.content_text}</p>
                    <div className="flex items-center gap-3 mt-auto pt-2">
                      <span className="text-[10px] font-black tracking-widest uppercase bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg shadow-sm">
                        🔖 Bookmarked
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">By @{post.author_username}</span>
                    </div>
                  </div>
                </Link>
            )}))}
          </div>
        </div>
      </div>

      {followModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-lg text-gray-900 capitalize">
                {followModal.type}
              </h3>
              <button 
                onClick={() => setFollowModal({ ...followModal, show: false })}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 flex-1">
              {followModal.loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : followModal.data.length === 0 ? (
                <div className="text-center py-8 text-gray-500 font-medium text-sm">
                  No {followModal.type} found.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {followModal.data.map(u => (
                    <Link 
                      key={u.id} 
                      to={`/profile/${u.id}`}
                      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0 overflow-hidden">
                        {u.profile_pic_url ? (
                          <img src={getOptimizedAvatar(u.profile_pic_url)} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          u.username?.charAt(0).toUpperCase() || '?'
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {u.full_name || u.username}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          @{u.username}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-md border border-gray-100 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-2xl font-black text-gray-900">{user?.hasPassword ? 'Change Password' : 'Set Password'}</h3>
               <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} className="text-gray-400" />
               </button>
            </div>

            {passwordStatus.message && (
              <div className={`mb-6 p-4 rounded-2xl text-sm font-bold flex items-center gap-2 ${
                passwordStatus.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
              }`}>
                {passwordStatus.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
                {passwordStatus.message}
              </div>
            )}
            
            <form onSubmit={handlePasswordChange} className="space-y-5">
              {user?.hasPassword && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Current Password</label>
                  <input
                    type="password"
                    className="block w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    value={passwordForm.oldPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">New Password</label>
                <input
                  type="password"
                  className="block w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  className="block w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 mt-4"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
