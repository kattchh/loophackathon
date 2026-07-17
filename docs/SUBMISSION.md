# LADDER — Devpost submission checklist (deadline 4:30 PM PT)

Submit at **loop-engineering-hackathon.devpost.com**. Copy from `DEVPOST.md`.

## Required fields
- [ ] **Project name:** LADDER
- [ ] **Tagline:** from `DEVPOST.md` line 3
- [ ] **"What it does" / story:** paste `DEVPOST.md`
- [ ] **Public GitHub repo:** https://github.com/kattchh/loophackathon  ← must be public + pushed
- [ ] **3-min demo video** (recorded) — script in `DEMO_SCRIPT.md`
- [ ] **Built with** tags: python, node.js, claude-agent-sdk, zero.xyz, x402, viem, akashml, akash, nexla, usdc, base
- [ ] **Team:** everyone on the Devpost submission (rule: all members listed)
- [ ] **Links:** live Akash dashboard URL (below)

## Sponsor tools — check the boxes and name them explicitly
- [ ] **Zero.xyz** — CLI installed, $5 wallet claimed, `search→get→fetch→review` loop; one **LIVE** paid run (money left the wallet) for the $2k track
- [ ] **Nexla** — events → webhook source `125742` → nexset `435614` (verified live)
- [ ] **Akash** — Console deploy (dashboard, DSEQ 1784322581604) **AND** AkashML (buyer's brain, `Llama-3.3-70B`)
- [ ] **x402 / Base** — real shop + autonomous buyer, USDC settlement, BaseScan tx

Live Akash dashboard:
http://ohorsvu8c59r19u6irvos216mg.ingress.h6i-dedicated.eu-se-1.digitalfrontier.so

## Map to the 5 judging criteria (20% each) — say these out loud in the video
1. **Autonomy (acts on real-time data):** two agents negotiate a price with no human — the
   buyer reasons on AkashML, the seller marks down, they converge and settle on-chain. The
   spend brain plans→acts→observes→self-corrects with hard-coded money guards.
2. **Idea:** an agent that both *spends and earns* in the machine economy — a real, card-free
   economic participant. The red-paperclip ladder to a real Amazon gift card.
3. **Technical implementation:** real x402 on Base (EIP-3009 gasless), Claude Agent SDK brain
   with guarded tools, deploy-ready (env-driven URLs + central event sink), honest dry/live split.
4. **Tool use:** 3 sponsors used deeply + the x402/Base rail — each doing a *different* job
   (Zero=spend, Nexla=books, Akash=host+inference, x402=earn).
5. **Presentation:** projector-grade live dashboard; 3 money moments (first spend, real sale
   with tx, gift-card finale).

## Pre-submit sanity
- [ ] Repo pushed to `main` (Akash SDLs pull from raw GitHub — push before relying on them)
- [ ] No secrets committed (keys live in `~/.ladder-env`, gitignored/outside repo)
- [ ] `events.jsonl` not committed (runtime artifact)
- [ ] Demo video shows: real spend, the AkashML buyer reasoning, a real `tx ↗`, the finale
- [ ] Submitted with buffer before **4:30 PM PT** (no late submissions)
