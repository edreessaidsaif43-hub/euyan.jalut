import Link from "next/link";

export function Brand({ name, school }: { name: string; school: string }) {
  return (
    <Link className="brand" href="/" aria-label={`${name}، الرئيسية`}>
      <svg className="brand-mark" viewBox="0 0 52 52" width="48" height="48" aria-hidden="true">
        <rect x="1" y="1" width="50" height="50" rx="13" fill="#087d75"/>
        <path d="M11 18c6-1 11 1 15 5 4-4 9-6 15-5v16c-6-1-11 1-15 5-4-4-9-6-15-5V18Z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M26 23v15M15 28h5l2-4 3 7 3-5 2 2h7" fill="none" stroke="#f2c56b" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M26 8v8m-4-4h8m6 1v4m-2-2h4" stroke="#f2c56b" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      <span><strong>{name}</strong><small>{school}</small></span>
    </Link>
  );
}
