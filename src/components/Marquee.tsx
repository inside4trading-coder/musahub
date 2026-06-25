import React from 'react';

const ITEMS = [
  'CRM Pipeline',
  'Prospección Geográfica',
  'Telefonía VoIP',
  'Email Campaigns',
  'Dashboard en Vivo',
  'Backstage',
  'Knowledge Base',
  'Automatizaciones IA',
];

/** Cinta infinita de servicios — separador visual entre hero y servicios. */
const Marquee = () => {
  const row = (ariaHidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden || undefined}>
      {ITEMS.map((item) => (
        <span
          key={item}
          className="flex items-center text-sm font-semibold tracking-[0.18em] uppercase text-musa-dark/60 whitespace-nowrap"
        >
          <span className="mx-6">{item}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-musa-green" aria-hidden="true" />
        </span>
      ))}
    </div>
  );

  return (
    <div className="relative py-5 border-y border-musa-dark/10 bg-white/70 backdrop-blur-sm overflow-hidden">
      <div className="flex w-max animate-marquee motion-reduce:animate-none">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
};

export default Marquee;
