import { spawn } from "child_process";

const rpc = process.env.RPC_FOR_FORK || "https://rpc.soniclabs.com";
const block = process.env.FORK_BLOCK || "latest";
const port = process.env.PORT || "8545";

console.log("✅ Starting anvil...");
console.log("   RPC URL   :", rpc);
console.log("   Block     :", block);

const args = [
  "--fork-url", rpc,
  "--fork-block-number", block,
  "--auto-impersonate",
  "--host", "0.0.0.0",
  "--port", port
];

let anvil = spawn("anvil", args, { stdio: ["ignore", "pipe", "pipe"] });

// Forward stdout/stderr with prefixes
anvil.stdout.on("data", (data) => {
  process.stdout.write(`[ANVIL] ${data}`);
});

anvil.stderr.on("data", (data) => {
  process.stderr.write(`[ANVIL-ERR] ${data}`);
});

anvil.on("close", (code) => {
  console.log(`⚠️ Anvil exited with code ${code}`);
  // Optional: auto-restart
  // console.log("♻️ Restarting anvil...");
  // anvil = spawn("anvil", args, { stdio: ["ignore", "pipe", "pipe"] });
});

// Handle shutdown signals (Render sends SIGTERM on deploys/restarts)
function shutdown() {
  console.log("🛑 Caught shutdown signal, stopping anvil...");
  if (anvil) {
    anvil.kill("SIGTERM");
  }
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
