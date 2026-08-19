import { ChildProcess, fork } from "child_process";

// Usage example:
// ts-node burst-request.test.ts --url http://localhost:3000/api/test --method POST --body '{"key":"value"}'

const args = process.argv.slice(2);

/**
 * Retrieves the value of a command-line argument.
 *
 * @param name The name of the argument to retrieve.
 * @param defaultValue The default value if the argument is not found.
 * @returns The value of the argument or the default value.
 */
const getArg = (name: string, defaultValue?: string) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return defaultValue;
  return args[index + 1] ?? defaultValue;
};

/**
 * Parses the headers argument, which can be either a JSON string or a semicolon-separated list of key:value pairs.
 *
 * @param input The raw headers input string.
 * @returns An object representing the headers to be used in the fetch request.
 */
const parseHeadersArg = (input?: string): HeadersInit => {
  if (!input) return {};

  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    const entries = input
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf(":");
        if (separator === -1) return null;
        const key = part.slice(0, separator).trim();
        const value = part.slice(separator + 1).trim();
        if (!key) return null;
        return [key, value] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null);

    return Object.fromEntries(entries);
  }

  return {};
};

const TARGET = getArg("url", "http://localhost:3000") as string;
const METHOD = (getArg("method", "GET") as string).toUpperCase();
const BODY = getArg("body");
const INFINITE = args.includes("--infinite") || !args.includes("--count");
const COUNT = parseInt(getArg("count", "0") as string, 10);
const TIMEOUT = parseInt(getArg("timeout", "0") as string, 10);
const WAIT = parseInt(getArg("wait", "0") as string, 10);
const WORKERS = parseInt(getArg("workers", "1") as string, 10);
const HEADERS = parseHeadersArg(getArg("headers"));
const KILL_ON_ERROR = args.includes("--kill-on-error");
const KILL_ON_TOO_MANY_REQUESTS = args.includes("--kill-on-429");

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

if (!ALLOWED_METHODS.has(METHOD)) {
  console.error(
    `Invalid --method "${METHOD}". Allowed: GET, POST, PUT, PATCH, DELETE`,
  );
  process.exit(1);
}

if (process.argv.includes("--child")) {
  /**
   * Simple sleep function to pause execution for a given number of milliseconds.
   *
   * @param ms Number of milliseconds to sleep.
   * @returns A promise that resolves after the specified time.
   */
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  let sent = 0;
  const start = Date.now();
  let stop = false;

  const stopChild = (reason: string) => {
    if (stop) return;
    stop = true;
    console.log(`[${process.pid}] Stopping child (${reason})`);
  };

  process.on("SIGINT", () => stopChild("SIGINT"));
  process.on("SIGTERM", () => stopChild("SIGTERM"));
  process.on("disconnect", () => stopChild("parent disconnected"));

  /**
   * Main function to perform the burst of requests based on the provided configuration.
   */
  const run = async () => {
    while (!stop) {
      if (!INFINITE && sent >= COUNT) break;
      if (TIMEOUT && Date.now() - start > TIMEOUT) break;

      const requestInit: RequestInit = {
        method: METHOD,
        headers: HEADERS,
      };

      if (BODY !== undefined && METHOD !== "GET") {
        requestInit.body = BODY;
      }

      try {
        const res = await fetch(TARGET, requestInit);

        if (KILL_ON_TOO_MANY_REQUESTS && res.status === 429) {
          console.error(
            `[${process.pid}] Received 429 Too Many Requests. Exiting.`,
          );
          process.exit(1);
        } else {
          console.log(
            `[${process.pid}] ${METHOD} ${TARGET} -> ${res.status} ${res.statusText}`,
          );
        }
      } catch {
        if (KILL_ON_ERROR) {
          console.error(`[${process.pid}] Error occurred. Exiting.`);
          process.exit(1);
        } else {
          console.error(`[${process.pid}] ${METHOD} ${TARGET} -> ERROR`);
        }
      }

      sent++;
      if (WAIT && !stop) await sleep(WAIT);
    }

    process.exit(0);
  };

  run();
} else {
  const children = new Map<number, ChildProcess>();
  let shuttingDown = false;
  let finishedWorkers = 0;

  /**
   * Send SIGKILL to child processes
   */
  const forceKillAll = () => {
    for (const child of children.values()) {
      if (!child.killed) {
        try {
          child.kill("SIGKILL");
        } catch {
          // noop
        }
      }
    }
  };

  /**
   * Gracefully shutdown child processes on main process exit or termination signals. If workers do not exit within 1 second, they will be forcefully killed.
   *
   * @param reason The reason for shutdown, used for logging purposes.
   * @returns void
   */
  const shutdownChildren = (reason: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n[MAIN] ${reason}. Stopping ${children.size} worker(s)...`);

    for (const child of children.values()) {
      if (!child.killed) {
        try {
          child.kill("SIGTERM");
        } catch {
          // noop
        }
      }
    }

    setTimeout(() => {
      forceKillAll();
      process.exit(0);
    }, 1000);
  };

  process.on("SIGINT", () => shutdownChildren("Ctrl+C detected"));
  process.on("SIGTERM", () => shutdownChildren("SIGTERM detected"));
  process.on("exit", () => forceKillAll());

  console.log(`Starting test:
URL: ${TARGET}
Method: ${METHOD}
Workers: ${WORKERS}
Infinite: ${INFINITE}
Count: ${COUNT || "N/A"}
Timeout: ${TIMEOUT || "None"}
Wait: ${WAIT || 0}ms
Headers: ${Object.keys(HEADERS).length ? JSON.stringify(HEADERS) : "None"}
Body: ${BODY ?? "None"}
`);

  for (let i = 0; i < WORKERS; i++) {
    const child = fork(__filename, ["--child", ...process.argv.slice(2)]);
    if (!child.pid) continue;

    children.set(child.pid, child);

    child.on("exit", (code, signal) => {
      console.log(
        `[MAIN] Worker ${child.pid} exited (code=${code ?? "null"}, signal=${signal ?? "null"}).`,
      );
      children.delete(child.pid!);
      finishedWorkers += 1;

      // Do NOT respawn workers.
      if (!shuttingDown && finishedWorkers >= WORKERS) {
        process.exit(0);
      }
    });
  }
}
