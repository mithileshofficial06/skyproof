"use client";
// The problem, with its proof beside it. Every line comes from docs/Deep_Research_2026-11-05.md and links
// to its source. Wording follows the research's "things not to say" (no blaming AI, no "Amazon hid data").
import { CountUp, Reveal } from "@/components/motion";
import { cx } from "@/components/ui";

type Src = [string, string];
interface Case {
  when: string;
  where: string;
  harm: string;
  happened: string;
  gap: string;
  src: Src[];
  india?: boolean;
}

const CASES: Case[] = [
  {
    when: "Jul 2019",
    where: "Barcarès, France",
    harm: "3 people injured",
    happened: "A DJI Inspire 2 filming a festival came down on the crowd. The operator blamed a “battery failure” alert.",
    gap: "The investigator could not check that story: “the flight logs were no longer present on the drone, the pilot's tablet or the cameraman's phone.”",
    src: [["BEA report 2019-0416", "https://bea.aero/fileadmin/user_upload/BEA2019-0416_1.pdf"]],
  },
  {
    when: "Dec 2024",
    where: "Lake Eola, Orlando, USA",
    harm: "7-year-old needed open-heart surgery",
    happened: "Show drones fell into the crowd. The NTSB final report blamed configuration errors that no cross-check caught.",
    gap: "About 5 drones went into the lake and their data was lost. The lawsuit names four defendants and turns on flight data the defendants hold.",
    src: [
      ["FOX 35 · NTSB", "https://www.fox35orlando.com/news/orlando-drone-show-errors-led-lake-eola-crash-seriously-injured-7-year-old-ntsb"],
      ["Unmanned Airspace", "https://www.unmannedairspace.info/uncategorized/ntsb-report-into-orlando-drone-accident-finds-multiple-errors/"],
      ["DroneDJ · lawsuit", "https://dronedj.com/2025/08/29/orlando-drone-show-mishap-lawsuit/"],
    ],
  },
  {
    when: "2024",
    where: "Dublin, Ireland",
    harm: "Man struck by a propeller blade",
    happened: "A Manna delivery drone shed a propeller blade that hit a man mowing his lawn.",
    gap: "The air-accident unit noted Manna had not notified it as required.",
    src: [["Irish Times · AAIU", "https://www.irishtimes.com/ireland/dublin/2024/11/08/man-injured-by-fallen-drone-propeller-while-mowing-lawn-investigators-say"]],
  },
  {
    when: "Feb 2024",
    where: "Gurugram, India",
    harm: "Delivery drone crashed into homes",
    happened: "A Skye Air delivery drone carrying a package crashed into a residential area. Police filed an FIR against the company.",
    gap: "The flight record that would settle the case sits with the company being investigated.",
    src: [["ThePrint · PTI", "https://theprint.in/india/drone-carrying-package-crashes-in-gurugram-locality-fir-against-company/1969281/"]],
    india: true,
  },
  {
    when: "Oct 2025",
    where: "Tolleson, Arizona, USA",
    harm: "2 drones hit the same crane",
    happened: "Two Amazon MK30s struck the same crane boom within minutes; one caught fire. The FAA and NTSB opened investigations.",
    gap: "Flights resumed about 48 hours later on Amazon's own review of its own telemetry, before any public finding. The record had a single custodian.",
    src: [["CNBC", "https://www.cnbc.com/2025/10/02/amazon-drone-crash-faa-ntsb.html"]],
  },
  {
    when: "Jul 2026",
    where: "Darlington, UK",
    harm: "Crash into a residential garden",
    happened: "The UK AAIB classified it as an accident.",
    gap: "Amazon said the drone “responded as designed”. Nobody independent could check the decision log.",
    src: [["DroneXL · AAIB", "https://dronexl.co/2026/08/17/amazon-drone-crash-darlington-aaib-caa-verdict/"]],
  },
  {
    when: "2026",
    where: "Highway 6, Houston, USA",
    harm: "Parachuted into live traffic lanes",
    happened: "A Zipline drone deployed its parachute and came down on the highway.",
    gap: "Cause “under investigation”; some answers to safety questions were called “proprietary”.",
    src: [["DroneXL", "https://dronexl.co/2026/09/16/zipline-answers-drone-safety-questions-amazon-wing-silent/"]],
  },
];

const RULES: { where: string; rule: string; src: Src }[] = [
  { where: "EU", rule: "Regulation 2019/947: the operator must simply “keep a record”.", src: ["legislation.gov.uk", "https://legislation.gov.uk/eur/2019/947/annex/part/B/adopted/data.pdf"] },
  { where: "UK", rule: "CAA: digital records kept for 3 years, by the operator.", src: ["UK CAA", "https://www.caa.co.uk/drones/specific-category/pdra01-operational-authorisation/uas-operator-responsibilities/"] },
  { where: "US", rule: "Proposed Part 108 BVLOS: an operator-run flight data system; the operator can be its own data provider.", src: ["Inside Unmanned Systems", "https://insideunmannedsystems.com/new-bvlos-rule-proposes-comprehensive-pathway-for-routine-operations/"] },
  { where: "India", rule: "Tamper-proof NPNT logging was mandated in March 2021, then deferred five months later.", src: ["ORF", "https://www.orfonline.org/expert-speak/the-road-ahead-for-drone-regulations-in-india"] },
];

export function Problem() {
  return (
    <section id="problem" className="scroll-mt-24">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        {/* the claim (sticky) */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#c2410c]">The problem is real</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] text-[#15171a] md:text-[42px]">After a drone crash, the only record belongs to the party being investigated.</h2>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[#45484e]">
              Drones already make safety-critical decisions on their own: detect-and-avoid, auto-landing, parachute release. When one goes wrong, the operator holds the log. Investigators, insurers and victims can only take their word for it.
            </p>
          </Reveal>
          <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-[#e3ded3] bg-[#e3ded3]">
            {[
              { n: 4250, f: (x: number) => `~${Math.round(x).toLocaleString()}`, l: "drone injuries in US emergency rooms, 2015–2020", s: ["UF/IFAS", "https://edis.ifas.ufl.edu/publication/AE560"] as Src },
              { n: 1859, f: (x: number) => Math.round(x).toLocaleString(), l: "drone sighting reports near US airports in 2025", s: ["FAA", "https://www.faa.gov/uas/resources/public_records/uas_sightings_report"] as Src },
              { n: 1, f: (x: number) => `${x.toFixed(x < 1 ? 1 : 0)}M+`, l: "Walmart US drone deliveries by May 2026 (company figure)", s: ["DroneXL", "https://dronexl.co/2026/05/31/walmart-1m-drone-deliveries-40/"] as Src },
            ].map((k, i) => (
              <Reveal key={i} delay={i * 120} className="bg-[#fffdf8] p-4">
                <div className="font-mono text-2xl font-semibold text-[#15171a]">
                  <CountUp to={k.n} format={k.f} />
                </div>
                <div className="mt-1 text-[11px] leading-snug text-[#55595f]">{k.l}</div>
                <a href={k.s[1]} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[10px] text-[#8a8d93] underline decoration-[#cfc8ba] hover:text-[#15171a]">
                  {k.s[0]} ↗
                </a>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <p className="mt-4 text-xs leading-relaxed text-[#8a8d93]">Injury data specific to delivery drones barely exists yet, so the counts above are mostly consumer drones. The cases on the right are the documented ones.</p>
          </Reveal>
        </div>

        {/* the proof (scrolls past) */}
        <ol className="relative space-y-5 border-l-2 border-[#e3ded3] pl-6">
          {CASES.map((c, i) => (
            <Reveal as="li" key={c.where} delay={60} className="relative">
              <span className={cx("absolute -left-[33px] top-5 h-4 w-4 rounded-full border-[3px] border-[#f4f1ea]", c.india ? "bg-[#c2410c]" : "bg-[#b91c1c]")} />
              <article className="rounded-lg border border-[#e3ded3] bg-[#fffdf8] p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_10px_30px_rgba(20,22,26,0.07)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a8d93]">
                    {c.when} · {c.where}
                    {c.india && <span className="ml-2 rounded bg-[#c2410c] px-1.5 py-0.5 text-[9px] text-white">India</span>}
                  </p>
                  <span className="rounded border border-[#b7dcd6] bg-[#ecf7f5] px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-[#0f5f59]">CONFIRMED</span>
                </div>
                <p className="mt-2 text-xl font-semibold tracking-tight text-[#b91c1c]">{c.harm}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#45484e]">{c.happened}</p>
                <div className="mt-3 border-l-[3px] border-[#c2410c] bg-[#faf6ee] px-3 py-2 text-sm leading-relaxed text-[#15171a]">
                  <span className="mr-1.5 font-mono text-[10px] uppercase tracking-wider text-[#c2410c]">Evidence gap</span>
                  {c.gap}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                  {c.src.map(([l, u]) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer" className="text-[11px] text-[#55595f] underline decoration-[#cfc8ba] underline-offset-2 hover:text-[#15171a]">
                      {l} ↗
                    </a>
                  ))}
                </div>
              </article>
              {i === 0 && <span className="sr-only">Sources open in a new tab.</span>}
            </Reveal>
          ))}
        </ol>
      </div>

      {/* the rules don't fix it */}
      <div className="mt-16">
        <Reveal>
          <h3 className="text-xl font-semibold tracking-tight text-[#15171a]">And the rules don&apos;t fix it. None we checked requires the log to be tamper-evident or held by anyone else.</h3>
        </Reveal>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {RULES.map((r, i) => (
            <Reveal key={r.where} delay={i * 110} className="rounded-lg border border-[#e3ded3] bg-[#fffdf8] p-4">
              <div className="font-mono text-xs font-semibold tracking-wider text-[#c2410c]">{r.where}</div>
              <p className="mt-2 text-sm leading-relaxed text-[#33363b]">{r.rule}</p>
              <a href={r.src[1]} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] text-[#55595f] underline decoration-[#cfc8ba] hover:text-[#15171a]">
                {r.src[0]} ↗
              </a>
            </Reveal>
          ))}
        </div>
        <Reveal delay={150}>
          <div className="mt-6 rounded-lg border border-dashed border-[#cfc8ba] p-4 text-sm leading-relaxed text-[#45484e]">
            <span className="font-semibold text-[#15171a]">What already exists, honestly: </span>
            hash-chained drone logs have been tried before (Red Cat on GoChain, 2019; a Southampton student team, 2026). They prove a log wasn&apos;t edited. SkyProof adds what they lack: the decision is made and sealed <em>outside</em> the operator&apos;s hands at the moment it happens, and an objective breach pays the victim automatically.{" "}
            <a href="https://techcrunch.com/2019/03/06/red-cat-wants-to-track-drone-flight-data-on-the-blockchain" target="_blank" rel="noreferrer" className="text-[11px] text-[#55595f] underline">
              TechCrunch ↗
            </a>{" "}
            <a href="https://www.southampton.ac.uk/news/2026/03/student-engineers-achieve-worldfirst-in-blockchain-black-box-for-drones-.page" target="_blank" rel="noreferrer" className="text-[11px] text-[#55595f] underline">
              Southampton ↗
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
