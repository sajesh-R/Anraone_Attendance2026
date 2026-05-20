import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const SHIFT_OPTIONS = ['', 'Morning', 'Evening', 'Night', 'General', 'Flexible'];

const Profile = () => {
  const { user, updateUser } = useAuth();

  const [formData, setFormData] = useState({
    fullName:    user?.fullName    || '',
    department:  user?.department  || '',
    designation: user?.designation || '',
    shiftType:   user?.shiftType   || '',
    phone:       user?.phone       || '',
  });

  const [saving, setSaving]         = useState(false);
  const [success, setSuccess]       = useState('');
  const [error, setError]           = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview]     = useState(user?.profilePhoto || '');

  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  // ── Save Profile Details ──────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.fullName || formData.fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await axios.put('/api/users/profile', formData);
      updateUser(data.user);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Upload Profile Photo ──────────────────────────────────
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);

    setPhotoUploading(true);
    setError('');
    setSuccess('');

    const formPayload = new FormData();
    formPayload.append('profilePhoto', file);

    try {
      const { data } = await axios.put('/api/users/profile/photo', formPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(data.user);
      setSuccess('Profile photo updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Photo upload failed. Please try again.');
      setPhotoPreview(user?.profilePhoto || ''); // Revert preview on failure
    } finally {
      setPhotoUploading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto gradient-bg">
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Page Header */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your personal and professional information.</p>
        </div>

        {/* Photo Upload Section */}
        <div className="bg-white rounded-2xl shadow-premium p-6 mb-5 flex items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Profile"
                className="w-20 h-20 rounded-2xl object-cover ring-2 ring-brand-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center ring-2 ring-brand-100">
                <span className="text-3xl font-bold text-white">
                  {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            {photoUploading && (
              <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            )}
          </div>

          {/* Upload Info */}
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">{user?.fullName}</p>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            <div className="mt-3 flex items-center gap-2">
              <button
                id="btn-upload-photo"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                className="text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {photoUploading ? 'Uploading…' : 'Change Photo'}
              </button>
              <span className="text-xs text-slate-400">JPG, PNG or WEBP · Max 5MB</span>
            </div>
            <input
              ref={fileInputRef}
              id="input-profile-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-premium p-6 space-y-5">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">Personal Information</h2>

          {/* Success Banner */}
          {success && (
            <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2 animate-shake">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider" htmlFor="profile-fullName">
              Full Name *
            </label>
            <input
              id="profile-fullName"
              name="fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={handleChange}
              className="input-base"
              placeholder="Enter your full name"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider" htmlFor="profile-department">
              Department {user?.role !== 'Admin' && <span className="text-[10px] lowercase font-normal italic ml-1 text-slate-400">(locked)</span>}
            </label>
            <input
              id="profile-department"
              name="department"
              type="text"
              disabled={user?.role !== 'Admin'}
              value={formData.department}
              onChange={handleChange}
              className={`input-base ${user?.role !== 'Admin' ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-dashed' : ''}`}
              placeholder="e.g., Engineering, Sales, HR"
            />
          </div>
...
          {/* Designation */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider" htmlFor="profile-designation">
              Designation {user?.role !== 'Admin' && <span className="text-[10px] lowercase font-normal italic ml-1 text-slate-400">(locked)</span>}
            </label>
            <input
              id="profile-designation"
              name="designation"
              type="text"
              disabled={user?.role !== 'Admin'}
              value={formData.designation}
              onChange={handleChange}
              className={`input-base ${user?.role !== 'Admin' ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-dashed' : ''}`}
              placeholder="e.g., Senior Developer, Team Lead"
            />
          </div>

          {/* Shift Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider" htmlFor="profile-shiftType">
              Shift Type {user?.role !== 'Admin' && <span className="text-[10px] lowercase font-normal italic ml-1 text-slate-400">(locked)</span>}
            </label>
            <select
              id="profile-shiftType"
              name="shiftType"
              disabled={user?.role !== 'Admin'}
              value={formData.shiftType}
              onChange={handleChange}
              className={`input-base ${user?.role !== 'Admin' ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-dashed' : ''}`}
            >
              {SHIFT_OPTIONS.map((s) => (
                <option key={s} value={s}>{s || 'Select shift…'}</option>
              ))}
            </select>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider" htmlFor="profile-phone">
              Phone Number
            </label>
            <input
              id="profile-phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="input-base"
              placeholder="+91 98765 43210"
            />
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
              Role (Managed by Admin)
            </label>
            <div className="input-base bg-slate-50 text-slate-400 cursor-not-allowed select-none">
              {user?.role || '—'}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              id="btn-save-profile"
              type="submit"
              disabled={saving}
              className="w-full py-3.5 px-4 rounded-2xl text-white font-bold text-[15px] bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 disabled:opacity-60 shadow-brand hover:shadow-brand-hover hover:-translate-y-0.5 transform active:scale-95 transition-all duration-200"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Saving changes…
                </span>
              ) : 'Save Changes'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default Profile;
