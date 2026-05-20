import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import type { BashOperations, ExtensionAPI } from "@earendil-works/pi-coding-agent";

const DEFAULT_SHELL = "/usr/bin/zsh";
const SHELL_ENV_VAR = "PI_BANG_SHELL";
const USE_PTY_ENV_VAR = "PI_BANG_USE_PTY";

function killProcessTree(pid: number) {
  if (process.platform === "win32") {
    spawn("taskkill", ["/F", "/T", "/PID", String(pid)], {
      stdio: "ignore",
      detached: true,
    });
    return;
  }

  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Already gone.
    }
  }
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function resolveScriptPath() {
  if (process.env[USE_PTY_ENV_VAR] === "0") return undefined;
  const result = spawnSync("sh", ["-c", "command -v script"], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim().split(/\r?\n/)[0] : undefined;
}

function createInteractiveShellOperations(shellPath: string): BashOperations {
  const scriptPath = resolveScriptPath();

  return {
    exec(command, cwd, { onData, signal, timeout, env }) {
      return new Promise((resolve, reject) => {
        if (!existsSync(shellPath)) {
          reject(new Error(`Shell not found: ${shellPath}. Set ${SHELL_ENV_VAR}=/path/to/zsh if needed.`));
          return;
        }
        if (!existsSync(cwd)) {
          reject(new Error(`Working directory does not exist: ${cwd}`));
          return;
        }

        const usePty = scriptPath && existsSync(scriptPath);
        const child = usePty
          ? spawn(scriptPath, ["-q", "-e", "-c", `${shellQuote(shellPath)} -i -c ${shellQuote(command)}`, "/dev/null"], {
              cwd,
              detached: process.platform !== "win32",
              env: { ...process.env, ...env, SHELL: shellPath },
              stdio: ["ignore", "pipe", "pipe"],
            })
          : spawn(shellPath, ["-i", "-c", command], {
              cwd,
              detached: process.platform !== "win32",
              env: { ...process.env, ...env, SHELL: shellPath },
              stdio: ["ignore", "pipe", "pipe"],
            });

        let settled = false;
        let timedOut = false;
        let timeoutHandle: NodeJS.Timeout | undefined;

        const onAbort = () => {
          if (child.pid) killProcessTree(child.pid);
        };

        const cleanup = () => {
          if (timeoutHandle) clearTimeout(timeoutHandle);
          if (signal) signal.removeEventListener("abort", onAbort);
        };

        const finish = (fn: () => void) => {
          if (settled) return;
          settled = true;
          cleanup();
          fn();
        };

        const handleData = (data: Buffer) => {
          // util-linux script emits CRLF because it allocates a pseudo-TTY.
          // Normalize it before Pi captures/displays the output.
          onData(Buffer.from(data.toString("utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n")));
        };

        child.stdout?.on("data", handleData);
        child.stderr?.on("data", handleData);

        child.on("error", (err) => finish(() => reject(err)));
        child.on("close", (code) => {
          finish(() => {
            if (signal?.aborted) reject(new Error("aborted"));
            else if (timedOut) reject(new Error(`timeout:${timeout}`));
            else resolve({ exitCode: code });
          });
        });

        if (timeout !== undefined && timeout > 0) {
          timeoutHandle = setTimeout(() => {
            timedOut = true;
            if (child.pid) killProcessTree(child.pid);
          }, timeout * 1000);
        }

        if (signal) {
          if (signal.aborted) onAbort();
          else signal.addEventListener("abort", onAbort, { once: true });
        }
      });
    },
  };
}

export default function (pi: ExtensionAPI) {
  const shellPath = process.env[SHELL_ENV_VAR] || DEFAULT_SHELL;
  const operations = createInteractiveShellOperations(shellPath);

  pi.on("user_bash", () => ({ operations }));

  pi.registerCommand("bang-shell", {
    description: `Show the shell used for ! and !! commands (${SHELL_ENV_VAR} overrides it)`,
    handler: async (_args, ctx) => {
      const scriptPath = resolveScriptPath();
      const ptyPart = scriptPath ? ` via PTY (${scriptPath})` : " without PTY";
      ctx.ui.notify(`! commands use: ${shellPath} -i -c <command>${ptyPart}`, existsSync(shellPath) ? "info" : "error");
    },
  });
}
