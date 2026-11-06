// live: the published flight plus its anchors read from FlightLog on 0G Galileo right now (specs/05a D12).
// If the chain can't be reached it falls back to replay, and `source` says so (the mode badge follows it).
import { toFlightRecord } from "./map";
import { fetchFlight, replaySource } from "./replay";
import type { Anchor, FlightSource, Hex } from "./types";

export async function anchorsFromChain(flightLog: Hex, chainFlightId: Hex): Promise<Anchor[]> {
  // the RPC client loads only when live mode actually reads the chain (keeps the page's first load small)
  const { createPublicClient, defineChain, http, parseAbi } = await import("viem");
  const galileo = defineChain({ id: 16602, name: "0G Galileo", nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 }, rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } } });
  const abi = parseAbi(["function getAnchors(bytes32 flightId) view returns ((uint64 seq, bytes32 head, bytes32 storageRoot, uint64 time)[])"]);
  const client = createPublicClient({ chain: galileo, transport: http(undefined, { timeout: 8000 }) });
  const a = await client.readContract({ address: flightLog, abi, functionName: "getAnchors", args: [chainFlightId] });
  return a.map((x) => ({ seq: Number(x.seq), head: x.head as Hex }));
}

export const liveSource: FlightSource = {
  async load(id) {
    const f = await fetchFlight(id);
    try {
      return toFlightRecord(f, "live", await anchorsFromChain(f.chain.flightLog as Hex, f.chain.chainFlightId as Hex));
    } catch {
      return replaySource.load(id);
    }
  },
};
