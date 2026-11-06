"use client";
// For drone operators and technical visitors: the live console, the sealed flights and the 3D story, in one place.
import { ChoiceCard, Icon } from "@/components/simple";

export default function Operator() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pt-2">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#15171a]">For drone operators</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#55595f]">
          Fly a mission and watch every decision as it happens, open the black box of any past flight, or check for yourself that a record was never changed.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <ChoiceCard href="/live" icon={<Icon name="live" />} title="Watch a live flight" text="See the drone fly, ask the 0G AI before every move, and seal its black box as it goes." cta="Open live console" />
        <ChoiceCard href="/flights" icon={<Icon name="folder" />} title="Past flights" text="Replay any finished flight, read its plain-English summary, and see whether it broke a rule." cta="Browse flights" />
        <ChoiceCard href="/#check" icon={<Icon name="search" />} title="Check a record yourself" text="Your browser re-checks a flight against the public record. If anyone changed a single line, it fails." cta="Run the check" />
        <ChoiceCard href="/experience" icon={<Icon name="cube" />} title="The 3D story" text="A guided 3D walk-through of what SkyProof does, from take-off to payout." cta="Start the story" />
      </div>
    </div>
  );
}
