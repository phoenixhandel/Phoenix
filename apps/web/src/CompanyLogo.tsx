const logoToken = import.meta.env.VITE_LOGO_DEV_PUBLISHABLE_KEY ?? "";

export const CompanyLogo = ({ domain, name, size = 24 }: { domain: string; name: string; size?: number }) => <img src={`https://img.logo.dev/${domain}?token=${logoToken}&size=${size}&format=webp&theme=auto&retina=true&fallback=monogram`} alt={`${name} logo`} width={size} height={size} loading="lazy" className="shrink-0 object-contain" />;
