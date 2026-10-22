# Architecture rules
- Existing RPC modules in `src/server/*.functions.ts` and `booking-engine.ts` are the only server-directory exceptions to client import protection; their handlers are stripped by TanStack while provider/helper modules stay protected.
- Flight payload validation lives in a browser-safe module and supplier preparation/fulfillment lives in a dynamically imported server-only helper so payment paths share the same provider contract.
- Keep the optional Node launch script under scripts, not root server.js, because Nitro auto-discovers root server.js as a production entry.