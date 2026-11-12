// Profile photo, or the person's initials when they have not uploaded one.
export default function Avatar({ user, className = 'h-9 w-9', textClass = 'text-sm' }) {
  const name = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '';
  if (user?.avatar) {
    return <img src={user.avatar} alt={name} className={`${className} rounded-full object-cover`} />;
  }
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || '?';
  return (
    <span
      aria-label={name}
      className={`${className} ${textClass} flex shrink-0 items-center justify-center rounded-full bg-[#0056FF] font-bold text-white`}
    >
      {initials}
    </span>
  );
}
