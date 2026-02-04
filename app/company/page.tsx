'use client' // intentionally using a hybrid approach: top-level server file renders content and imports a client form component


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
    authorizedCapital: '₹ 1,00,000-15,00,000',
    paidUpCapital: '₹ 1,00,000-15,00,000',
    principalActivity:
      'Retail trade, except of motor vehicles and motorcycles; repair of personal & household goods',
    registeredOffice:
      'C/o Ram Murmu, Manjhaladih Post Balidih, PS Balidih North Gorabali, Bokaro, Jharkhand 827014, INDIA',
    contactEmail: 'admin@runash.in',
    brief:
      'We build a live streaming marketplace for retail businesses. Our mission is to enable retailers to create real, engaging selling experiences through live video, product demonstrations, and commerce-first integrations.',
    founders: 'Brothers — Ram & co-founder (family-run retail background since 2007)',
    milestones: [
      'Incorporated Apr 06, 2021',
      'Joined YC Startup School community',
      'Building live retail streaming hybrid platform for unorganized retailers',
    ],
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">{company.name}</h1>
            <p className="text-sm text-gray-600 mt-1">
              Status: <span className="font-medium">{company.status}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm">Contact</p>
            <a className="text-blue-600 font-medium" href={`mailto:${company.contactEmail}`}>
              {company.contactEmail}
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-20">
        <section className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold">Our mission</h2>
          <p className="mt-4 text-lg leading-relaxed">{company.brief}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="p-4 border rounded">
              <h3 className="font-semibold">What we do</h3>
              <p className="mt-2 text-sm">
                We are building a new live streaming marketplace environment where retailers meet buyers and
                demonstrate products live with integrated commerce flows.
              </p>
              <a href="/about">
                <a className="text-blue-600 mt-2 inline-block">Learn more →</a>
              </a>
            </div>

            <div className="p-4 border rounded">
              <h3 className="font-semibold">What we are building</h3>
              <p className="mt-2 text-sm">
                A live retail streaming hybrid platform focused on affordability and sustainability for
                unorganized retailers.
              </p>
              <a href="/about">
                <a className="text-blue-600 mt-2 inline-block">Learn more →</a>
              </a>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-xl font-bold">Company details</h3>
            <dl className="mt-4 space-y-3 text-sm text-gray-700">
              <div>
                <dt className="font-medium">Corporate Identification Number (CIN)</dt>
                <dd>{company.cin}</dd>
              </div>
              <div>
                <dt className="font-medium">Registration Number</dt>
                <dd>{company.registrationNumber}</dd>
              </div>
              <div>
                <dt className="font-medium">Incorporated on</dt>
                <dd>{company.incorporatedOn}</dd>
              </div>
              <div>
                <dt className="font-medium">Registered State</dt>
                <dd>{company.registeredState}</dd>
              </div>
              <div>
                <dt className="font-medium">Authorized capital</dt>
                <dd>{company.authorizedCapital}</dd>
              </div>
              <div>
                <dt className="font-medium">Paid up capital</dt>
                <dd>{company.paidUpCapital}</dd>
              </div>
              <div>
                <dt className="font-medium">Principal business activity</dt>
                <dd>{company.principalActivity}</dd>
              </div>
              <div>
                <dt className="font-medium">Registered office</dt>
                <dd>{company.registeredOffice}</dd>
              </div>
            </dl>

            <div className="mt-6 text-sm">
              <p>
                Download full company profile:{' '}
                <a className="text-blue-600" href="/company.md" target="_blank" rel="noreferrer">
                  company.md
                </a>
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-xl font-bold">Founder & story</h3>
            <p className="mt-3 text-sm text-gray-700">{company.founders}</p>

            <h4 className="mt-6 font-semibold">Milestones</h4>
            <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
              {company.milestones.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>

            <div className="mt-6">
              <p className="text-sm text-gray-600">Backed by: <span className="font-medium">MIT, Github</span></p>
            </div>
          </div>
        </section>

        <section className="mt-8 bg-white p-6 rounded shadow">
          <h3 className="text-xl font-bold">Contact & Attachments</h3>
          <p className="mt-2 text-sm text-gray-700">
            Send us enquiries or upload supporting documents (pitch, deck, registration docs). Files are handled
            securely — for production we recommend S3 or other object storage.
          </p>

          <div className="mt-4">
            
          </div>
        </section>
      </main>
    </div>
  )
  }
