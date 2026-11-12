// src/ProfilePage.jsx
import React, { useRef, useState } from 'react';
import { Camera, Mail, Phone, User, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import CustomerSidebar from './customer/CustomerSidebar';
import CustomerHeader from './customer/CustomerHeader';
import useSidebarState from './hooks/useSidebarState';
import Toast from './customer/Toast';
import { useAuth } from './auth/AuthContext';
import Avatar from './customer/Avatar';


const inputClass = (invalid) => `w-full py-3 border rounded-xl text-sm font-medium outline-none transition-all ${
  invalid
    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
    : 'border-slate-200 focus:ring-2 focus:ring-[#0056FF] focus:border-[#0056FF]'
}`;

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const { mobileOpen, openMobile, closeMobile, collapsed, toggleCollapsed } = useSidebarState({
    storageKey: 'travezia.customer.sidebarCollapsed',
  });

  const fileInputRef = useRef(null);
  const [toast, setToast] = useState('');

  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    mobile: user?.contactNumber ?? user?.mobile ?? '',
    avatar: user?.avatar ?? '',
    age: user?.age ?? '',
    gender: user?.gender ?? '',
  });
  const [errors, setErrors] = useState({});

  const setField = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleAvatarPick = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setToast('Photo is too large. Please choose a file under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setField('avatar', String(reader.result));
      setToast('Photo ready — save changes to apply it.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    const next = {};
    if (profile.name.trim().length < 2) next.name = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) next.email = 'Enter a valid email address.';
    if (profile.mobile.replace(/\D/g, '').length < 10) {
      next.mobile = 'Enter a valid mobile number (at least 10 digits).';
    }
    if (profile.age !== '' && !(Number(profile.age) >= 1 && Number(profile.age) <= 120)) {
      next.age = 'Enter an age between 1 and 120.';
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    try {
      await updateUser({
        name: profile.name.trim(),
        email: profile.email.trim().toLowerCase(),
        contactNumber: profile.mobile.trim(),
        avatar: profile.avatar,
        age: profile.age === '' ? '' : Number(profile.age),
        gender: profile.gender,
      });
      setToast('Personal information saved.');
    } catch (error) {
      setToast(error.message || 'Could not save your changes.');
    }
  };


  return (
    <div className="flex min-h-screen bg-[#F4F7FB] font-sans text-slate-800">

      <CustomerSidebar
        open={mobileOpen}
        onClose={closeMobile}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      <main className="flex flex-1 flex-col">

        <CustomerHeader
          title="My Profile"
          subtitle="Your personal information"
          onOpenMenu={openMobile}
        />

        <div className="px-4 md:px-8 pb-10 max-w-[1100px] mx-auto w-full">

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">My Profile</h1>
            <p className="text-slate-500 text-sm">Keep your personal and contact details up to date.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                  <User className="w-5 h-5 text-[#0056FF]" /> Personal Information
                </h2>

                <form className="space-y-5" onSubmit={handleSaveProfile} noValidate>
                  <div>
                    <label htmlFor="profile-name" className="block text-xs font-bold text-slate-500 mb-2">Full Name</label>
                    <input
                      id="profile-name"
                      type="text"
                      value={profile.name}
                      onChange={(event) => setField('name', event.target.value)}
                      aria-invalid={Boolean(errors.name)}
                      className={inputClass(errors.name)}
                    />
                    {errors.name && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="profile-email" className="block text-xs font-bold text-slate-500 mb-2">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="profile-email"
                        type="email"
                        value={profile.email}
                        onChange={(event) => setField('email', event.target.value)}
                        aria-invalid={Boolean(errors.email)}
                        className={`${inputClass(errors.email)} pl-11 pr-4`}
                      />
                    </div>
                    {errors.email && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="profile-mobile" className="block text-xs font-bold text-slate-500 mb-2">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="profile-mobile"
                        type="tel"
                        value={profile.mobile}
                        onChange={(event) => setField('mobile', event.target.value)}
                        placeholder="+63 912 345 6789"
                        aria-invalid={Boolean(errors.mobile)}
                        className={`${inputClass(errors.mobile)} pl-11 pr-4`}
                      />
                    </div>
                    {errors.mobile && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{errors.mobile}</p>}
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="profile-age" className="block text-xs font-bold text-slate-500 mb-2">Age</label>
                      <input
                        id="profile-age"
                        type="number"
                        min="1"
                        max="120"
                        value={profile.age}
                        onChange={(event) => setField('age', event.target.value)}
                        aria-invalid={Boolean(errors.age)}
                        className={`${inputClass(errors.age)} px-4`}
                      />
                      {errors.age && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{errors.age}</p>}
                    </div>
                    <div>
                      <label htmlFor="profile-gender" className="block text-xs font-bold text-slate-500 mb-2">Gender</label>
                      <select
                        id="profile-gender"
                        value={profile.gender}
                        onChange={(event) => setField('gender', event.target.value)}
                        className={`${inputClass(false)} px-4`}
                      >
                        <option value="">Prefer not to say</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button type="submit" className="bg-[#0056FF] hover:bg-blue-800 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors shadow-md">
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="space-y-6">

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <Avatar user={{ name: profile.name, avatar: profile.avatar }} className="h-full w-full border-4 border-slate-50 shadow-md" textClass="text-4xl" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Change profile photo"
                    className="absolute bottom-0 right-0 bg-[#0056FF] text-white p-2.5 rounded-full border-4 border-white shadow-sm hover:bg-blue-800 transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-1">Profile Photo</h3>
                <p className="text-xs text-slate-500 mb-4">PNG, JPG or GIF. Max 2MB.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif"
                  onChange={handleAvatarPick}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-white border border-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Upload New Photo
                </button>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900">Looking for security and preferences?</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Password, language, currency, travel class, and notification settings are managed in Account Settings.
                </p>
                <Link
                  to="/settings"
                  className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-[#0056FF]/40 hover:text-[#0056FF]"
                >
                  Open Account Settings <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

            </div>

          </div>
        </div>
      </main>

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
