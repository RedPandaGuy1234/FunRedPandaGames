import { sha256Hex } from "./auth.js";

const MODEL = "@cf/meta/llama-3.1-8b-instruct";
const MIN_PIECE = 4;
const MAX_PIECE = 9;
const MAX_INPUT = 40;

const LEET = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  "$": "s",
  "!": "i",
};

const BLOCKED_HASHES = new Set([
  "06a1d8bf7fc210de23d9540ab35744ae9db310afa0afbabe9529333e175a850f",
  "158869a97379229b7681efae9d7f9c9214134e836d649ba53477c0c111414d59",
  "2a6937d721b14cdd7331c1ad1caf6a3cfa37a266650807101d44cdcd0acb132f",
  "362234c02fd606c43f7d5411590962016ec17372cd17c089bc85d8aeade6bb50",
  "566f532d486c947709d3d0e6b7575af8380248db66dada211d58eb00ad585297",
  "59cc3cb8a42973019cddacdee59e0aa7746ba6c203af78cefb453cb3a1b6610d",
  "63bd9333b1a0b11da8d0b206c4b86cd2a5be63fb5e7b59cc5ac7131f3a257489",
  "6ac3c336e4094835293a3fed8a4b5fedde1b5e2626d9838fed50693bba00af0e",
  "7c4a5c242b72a23d999bb2801c6544a368f49a3ab869ef578e171079b44a9ad8",
  "85fc17f7069acd39a5c636cd0a6530651096128da447959f5e250824857dc559",
  "9ae315a94e428a7ee3b5e48adae6541965d93b86acf10ffa1c45b93b6fe577b4",
  "b1106bd2a8594910c2e8e1c5b0e8cc948694f0fdc5235bfbbc41f5ec3e04d25e",
  "b262cd219f7d412268d5db14d28e382bfbdd93efa4ac40a9a5127782a3048fcc",
  "bdb1cc258d6976aafd3a0c3399dfff42a486e63a6948d8bc2e10e7c36fab7611",
  "c2c3b68b48832afd9a4dbdd474c1b6c81c8baecdb71446f9947dac72dd0fe93d",
  "d75a838dc758ba17f28bd8dbac605cb70c35465263d5733164521de2f7ef7926",
  "dd92623b0a4b255f87cc4aaee7990ee182d91db49189df6229ce65b5e9d960da",
  "e512a05583448f44790783f986b1f36925c8cfc42338ca0e1caa637755bd15ae",
  "f01abade17b3337e1bf386075c8bd46c34884867b218aac8841eaff8010d12c1",
  "fd70ad909b94deb27b460692084d9f2b1dbc9df3c6bcfd3caee571e707031e3f",
]);

function normalize(text) {
  let out = "";
  for (const ch of text.toLowerCase()) out += LEET[ch] || ch;
  return out
    .replace(/[^a-z]/g, "")
    .replace(/(.)\1+/g, "$1")
    .slice(0, MAX_INPUT);
}

async function hitsBlocklist(text) {
  const flat = normalize(text);
  const pieces = new Set();
  for (let start = 0; start < flat.length; start++) {
    for (let len = MIN_PIECE; len <= MAX_PIECE; len++) {
      if (start + len > flat.length) break;
      pieces.add(flat.slice(start, start + len));
    }
  }
  const hashes = await Promise.all([...pieces].map((piece) => sha256Hex(piece)));
  return hashes.some((hash) => BLOCKED_HASHES.has(hash));
}

async function classify(env, text) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/run/${MODEL}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CF_AI_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "You are a strict content moderator for a kids-friendly game site. The user message is a username or display name. Reply with exactly one word: BLOCK if it contains profanity, slurs, sexual terms, hate, harassment, or a disguised or misspelled version of any of these, in any language. Otherwise reply ALLOW.",
        },
        { role: "user", content: text },
      ],
      max_tokens: 3,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    console.error("Moderation request failed", response.status, await response.text());
    return true;
  }

  const data = await response.json();
  const answer =
    data && data.result && typeof data.result.response === "string"
      ? data.result.response
      : "";
  return !/block/i.test(answer);
}

export async function isAllowed(env, text) {
  if (typeof text !== "string" || !text.trim()) return true;
  if (await hitsBlocklist(text)) return false;

  try {
    return await classify(env, text);
  } catch (err) {
    console.error("Moderation request error", err);
    return true;
  }
}
