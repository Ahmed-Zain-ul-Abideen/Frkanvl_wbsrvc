import { spawn, exec } from "child_process";

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


/**
 * Runs npm setup scripts, retries until success
 */

function runSetup() {
  return new Promise((resolve) => {
    console.log("⚡ Running setup scripts...");
    const setup = exec("npm run setup");

    let sawSuccessLog = false;

    setup.stdout.on("data", (d) => {
      const out = d.toString();
      process.stdout.write(out);

      if (out.includes("Script ran successfully")) {
        sawSuccessLog = true;
      }
    });

    setup.stderr.on("data", (d) => process.stderr.write(d.toString()));

    setup.on("close", (code) => {
      if (code === 0 || sawSuccessLog) {
        console.log("✅ Setup scripts finished successfully (stopping retries)");
        resolve(true);
      } else {
        console.log("⚠️ Setup scripts failed with code:", code);
        resolve(false);
      }
    });
  });
}



function runSetupOld() {
  return new Promise((resolve) => {
    console.log("⚡ Running setup scripts...");
    const setup = exec("npm run setup");

    setup.stdout.on("data", (d) => process.stdout.write(d.toString()));
    setup.stderr.on("data", (d) => process.stderr.write(d.toString()));

    setup.on("close", (code) => {
      if (code === 0) {
        console.log("✅ Setup scripts finished successfully");
        resolve(true);
      } else {
        console.log("⚠️ Setup scripts failed with code:", code);
        // run forge clean before retry
        exec("forge clean", (err, stdout, stderr) => {
          if (err) {
            console.error("❌ forge clean failed:", stderr || err.message);
          } else {
            console.log("✅ forge clean done");
            if (stdout) console.log(stdout);
          }
          resolve(false); // still a failure, but now cleaned for next attempt
        });
      }
    });
  });
}

/**
 * Retry loop: runs setup every 60s until success
 */
async function retrySetupUntilSuccess() {
  let success = false;
  while (!success) {
    success = await runSetupOld();
    if (!success) {
      console.log("⏳ Retrying setup in 60 seconds...");
      await new Promise((r) => setTimeout(r, 60_000));
    }
  }
}



// Forward stdout/stderr with prefixes
anvil.stdout.on("data", (data) => {
  const out = data.toString();
  process.stdout.write(out);

  // Once Anvil is live, run setup scripts
  if (out.includes("Listening on")) {
    console.log("✅ Anvil is live, starting setup retry loop...");
    retrySetupUntilSuccess();
  }
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
