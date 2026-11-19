// src/admin/AdminSettingsPage.jsx
import React, { useRef, useState } from 'react';
import { Bell, ShieldCheck, Save, Ship, Camera } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import Avatar from '../customer/Avatar';

const TOGGLES = [
  { id: 'newBooking', label: 'New booking alerts', description: 'Notify me whenever a reservation is created.', default: true },
  { id: 'cancellations', label: 'Cancellation alerts', description: 'Get notified when a passenger cancels.', default: true },
  { id: 'lowOccupancy', label: 'Low occupancy warnings', description: 'Alert when a departure drops below 40% sold.', default: false },
  { id: 'dailyDigest', label: 'Daily revenue digest', description: 'Email a summary every morning at 8:00 AM.', default: true },
];

export default function AdminSettingsPage() {
  const { user, updateUser } = useAuth();
  const [toggles, setToggles] = useState(() => Object.fromEntries(
    TOGGLES.map((item) => [item.id, user?.adminNotificationSettings?.[item.id] ?? item.default]),
  ));
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarPick = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
      setProfileError('Choose a PNG, JPG, or GIF image.');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileError('Photo is too large. Choose a file under 2 MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setProfileError('Could not read the selected photo.');
        return;
      }
      setAvatar(reader.result);
      setProfileSaved(false);
      setProfileError('');
    };
    reader.onerror = () => setProfileError('Could not read the selected photo.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileSaved(false);
    setProfileError('');
    try {
      await updateUser({ avatar });
      setProfileSaved(true);
    } catch (error) {
      setProfileError(error.message || 'Could not save your profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      await updateUser({ adminNotificationSettings: toggles });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      setSaveError(error.message || 'Could not save notification preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <ShieldCheck className="h-5 w-5 text-[#0056FF]" /> Administrator profile
        </h2>
        <form className="mt-5 space-y-4" onSubmit={handleSaveProfile} noValidate>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative">
              <Avatar
                user={user ? { ...user, avatar } : { name: 'Administrator', avatar }}
                className="h-24 w-24 border border-slate-200"
                textClass="text-2xl"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change administrator photo"
                className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-[#0056FF] p-1.5 text-white hover:bg-blue-700"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif"
                onChange={handleAvatarPick}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Profile photo</p>
              <p className="text-xs text-slate-500">PNG, JPG, or GIF · Max 2 MB</p>
            </div>
          </div>
          {profileError && <p role="alert" className="text-sm text-red-600">{profileError}</p>}
          <div className="flex items-center justify-center gap-3 border-t border-slate-100 pt-4">
            {profileSaved && <span role="status" className="text-sm font-medium text-green-600">Profile saved.</span>}
            <button
              type="submit"
              disabled={isSavingProfile}
              className="flex items-center gap-2 rounded-xl bg-[#0056FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {isSavingProfile ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Role</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">Administrator</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Console</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Ship className="h-4 w-4 text-[#0056FF]" /> LayagExpress Operations
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Bell className="h-5 w-5 text-[#0056FF]" /> Notifications
        </h2>
        <div className="mt-4 divide-y divide-slate-100">
          {TOGGLES.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-500">{item.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-label={item.label}
                aria-checked={toggles[item.id]}
                onClick={() => {
                  setToggles((current) => ({ ...current, [item.id]: !current[item.id] }));
                  setSaved(false);
                  setSaveError('');
                }}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  toggles[item.id] ? 'bg-[#0056FF]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    toggles[item.id] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm font-medium text-green-600">Preferences saved.</span>}
        {saveError && <span role="alert" className="text-sm font-medium text-red-600">{saveError}</span>}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-xl bg-[#0056FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <Save className="h-4 w-4" /> {isSaving ? 'Saving…' : 'Save preferences'}
        </button>
      </div>
    </div>
  );
}
