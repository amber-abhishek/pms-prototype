/** Placeholder org mark (Logoipsum shield, Figma 3884:39807) until each university uploads its own. */
export function OrgLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size * 0.9} height={size} viewBox="0 0 24 26" fill="none" aria-hidden className="shrink-0 text-[#193070] dark:text-[#9DB0E8]">
      <path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M3.67603 5.28048V10.1915C4.06096 10.0982 4.43898 9.97522 4.80656 9.82296C5.73719 9.43747 6.5828 8.87244 7.29501 8.16017C8.00728 7.44796 8.57231 6.60233 8.95781 5.67173C9.19872 5.09011 9.36651 4.48239 9.45853 3.86248C7.48963 4.0531 5.54155 4.52577 3.67603 5.28048ZM0.0664062 2.90723V10.4068V14.0164V14.1293C0.0664062 20.4213 5.16717 25.5221 11.4593 25.5221C17.7514 25.5221 22.8521 20.4213 22.8521 14.1293V14.0164V10.4068V2.90723L21.1838 2.18101C14.9818 -0.518671 7.9367 -0.518671 1.73473 2.18101L0.0664062 2.90723ZM3.67669 14.2319C3.72314 17.8235 6.20217 20.8283 9.54167 21.6745C9.54002 20.6714 9.34165 19.6784 8.95781 18.7516C8.57231 17.8209 8.00728 16.9753 7.29501 16.263C6.5828 15.5508 5.73719 14.9858 4.80656 14.6003C4.43918 14.4482 4.06139 14.3252 3.67669 14.2319ZM11.3464 15.5665C10.9148 14.8982 10.4127 14.2759 9.84745 13.7107C9.28217 13.1454 8.65988 12.6433 7.99162 12.2116C8.65988 11.78 9.28217 11.2778 9.84745 10.7126C10.4127 10.1473 10.9148 9.52504 11.3464 8.85678C11.7781 9.52504 12.2803 10.1473 12.8455 10.7126C13.4107 11.2778 14.0331 11.78 14.7013 12.2116C14.0331 12.6433 13.4107 13.1454 12.8455 13.7107C12.2803 14.2759 11.7781 14.8982 11.3464 15.5665ZM13.1513 21.728C16.6201 20.9591 19.2184 17.8755 19.2423 14.1808C18.7795 14.2782 18.3255 14.4184 17.8864 14.6003C16.9557 14.9858 16.1102 15.5508 15.3979 16.263C14.6856 16.9753 14.1206 17.8209 13.7351 18.7516C13.3497 19.6822 13.1513 20.6796 13.1513 21.6869V21.728ZM17.8864 9.82296C18.3255 10.0048 18.7796 10.1451 19.2425 10.2425V5.28049C17.3048 4.49656 15.278 4.01694 13.2313 3.84163C13.3226 4.46876 13.4915 5.08359 13.7351 5.67173C14.1206 6.60233 14.6856 7.44796 15.3979 8.16017C16.1102 8.87244 16.9557 9.43747 17.8864 9.82296Z" />
    </svg>
  );
}

/** The signed-in person's photo (demo: Priya has one), else initials on a soft ground. */
export function PersonPhoto({ name, size = 32, square }: { name: string; size?: number; /** r10 tile instead of a circle (the Overview greeting). */ square?: boolean }) {
  const shape = square ? 'rounded-[10px]' : 'rounded-full';
  if (name === 'Priya Shah') return <img src={`${import.meta.env.BASE_URL}avatars/priya.jpg`} alt="" width={size} height={size} className={shape + ' object-cover shrink-0'} style={{ width: size, height: size }} />;
  const ini = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return <span className={shape + ' bg-[#C0DBFF] text-[#123768] font-medium flex items-center justify-center shrink-0'} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>{ini}</span>;
}
