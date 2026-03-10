import Link from 'next/link';

export const metadata = {
  title: 'Company — RUNASH Digital Innovation',
  description: 'RUNASH Digital Innovation Technologies — company overview, mission, founders and contact.',
}

export default function CompanyPage() {
  const company = {
    name: 'RUNASH DIGITAL INNOVATION TECHNOLOGIES PRIVATE LIMITED',
    status: 'Active',
    cin: 'U52590JH2021PTC016339',
    registrationNumber: '016339',
    incorporatedOn: 'Apr 06, 2021',
    registeredState: 'RoC-Jharkhand',
    registeredOffice: 'C/o Ram Murmu, Manjhaladih Post Balidih, PS Balidih North Gorabali, Bokaro, Jharkhand 827014, INDIA',
    contactEmail: 'admin@runash.in',
    brief: 'We build a live streaming marketplace for retail businesses. Our mission is to enable retailers to create real, engaging selling experiences through live video, product demonstrations, and commerce-first integrations.',
    founders: 'Brothers — Ram & co-founder (family-run retail background since 2007)',
    milestones: [
      'Incorporated Apr 06, 2021',
      'Joined YC Startup School community',
      'Building live retail streaming hybrid platform for unorganized retailers',
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header Section */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                ● {company.status}
              </span>
              <h1 className="text-4xl font-black tracking-tight text-foreground">{company.name}</h1>
              <p className="text-muted-foreground font-mono text-sm">CIN: {company.cin}</p>
            </div>
            <div className="bg-muted/40 p-4 rounded-lg border border-border">
              <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Official Contact</p>
              <a href={`mailto:${company.contactEmail}`} className="text-blue-600 font-semibold hover:underline">
                {company.contactEmail}
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-12 space-y-8">
        {/* Mission Section */}
        <section className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-8 md:p-12">
            <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-4xl">{company.brief}</p>
            
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <div className="group p-6 bg-muted/40 rounded-xl border border-border hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                <h3 className="font-bold text-lg">What we do</h3>
                <p className="mt-2 text-muted-foreground leading-snug">
                  Building a new live streaming marketplace environment where retailers meet buyers and demonstrate products live.
                </p>
                <Link href="/about" className="text-blue-600 font-medium mt-4 inline-block hover:gap-2 transition-all">
                  Learn more &rarr;
                </Link>
              </div>

              <div className="group p-6 bg-muted/40 rounded-xl border border-border hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                <h3 className="font-bold text-lg">Our Focus</h3>
                <p className="mt-2 text-muted-foreground leading-snug">
                  A hybrid platform focused on affordability and sustainability for unorganized retailers globally.
                </p>
                <Link href="/about" className="text-blue-600 font-medium mt-4 inline-block hover:gap-2 transition-all">
                  Learn more &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Official Registry Details */}
          <section className="md:col-span-2 bg-card p-8 rounded-xl shadow-sm border border-border">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              Official Registry Details
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 text-sm">
              <Detail label="Registration Number" value={company.registrationNumber} />
              <Detail label="Incorporated On" value={company.incorporatedOn} />
              <Detail label="Registered State" value={company.registeredState} />
              <div className="sm:col-span-2 pt-4 border-t border-border">
                <dt className="font-bold text-muted-foreground uppercase text-[10px] tracking-widest mb-1">Registered Office</dt>
                <dd className="text-foreground/90 leading-relaxed">{company.registeredOffice}</dd>
              </div>
            </dl>
          </section>

          {/* Founder & Story */}
          <section className="bg-card text-foreground p-8 rounded-xl shadow-sm border border-border">
            <h3 className="text-xl font-bold mb-4">Founder & Story</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {company.founders}
            </p>

            <h4 className="font-bold text-sm uppercase tracking-widest text-foreground/80 mb-3">Milestones</h4>
            <ul className="space-y-3">
              {company.milestones.map((m, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="text-foreground font-bold">0{i+1}</span>
                  {m}
                </li>
              ))}
            </ul>

            <div className="mt-10 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground">Supported by open-source communities & initiatives including:</p>
              <div className="mt-2 flex gap-3 font-bold text-sm text-muted-foreground">
                <span>MIT</span> • <span>GitHub</span> • <span>YC School</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border pb-2">
      <dt className="font-bold text-muted-foreground uppercase text-[10px] tracking-widest mb-1">{label}</dt>
      <dd className="text-foreground/90 font-medium">{value}</dd>
    </div>
  );
      }
