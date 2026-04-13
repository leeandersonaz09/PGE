interface UserAvatarProps {
  fotoUrl?: string | null;
  nomeUser: string;
  size?: number; // em pixels, padrão 14 (w-14 h-14)
}

export function UserAvatar({ fotoUrl, nomeUser, size = 14 }: UserAvatarProps) {
  const sizeClass = `w-${size} h-${size}`;

  return fotoUrl ? (
    <img
      src={fotoUrl}
      alt="Avatar"
      className={`${sizeClass} rounded-full border-4 border-white dark:border-slate-800 shadow-md object-cover`}
      referrerPolicy="no-referrer"
    />
  ) : (
    <div
      className={`${sizeClass} rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-2xl border-4 border-white dark:border-slate-800 shadow-md`}
    >
      {nomeUser.charAt(0).toUpperCase()}
    </div>
  );
}