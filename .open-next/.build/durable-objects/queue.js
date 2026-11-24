globalThis.openNextDebug = false;globalThis.openNextVersion = "4.1.16";globalThis.nextVersion = "16.4.6";

// node_modules/@opennextjs/aws/dist/utils/error.js
var IgnorableError = class extends Error {
  __openNextInternal = true;
  canIgnore = true;
  logLevel = 0;
  constructor(message) {
    super(message);
    this.name = "IgnorableError";
  }
};
var RecoverableError = class extends Error {
  __openNextInternal = true;
  canIgnore = true;
  logLevel = 1;
  constructor(message) {
    super(message);
    this.name = "RecoverableError";
  }
};
var FatalError = class extends Error {
  __openNextInternal = true;
  canIgnore = false;
  logLevel = 2;
  constructor(message) {
    super(message);
    this.name = "FatalError";
  }
};
function isOpenNextError(e) {
  try {
    return "__openNextInternal" in e;
  } catch {
    return false;
  }
}

// node_modules/@opennextjs/aws/dist/adapters/logger.js
function debug(...args) {
  if (globalThis.openNextDebug) {
    console.log(...args);
  }
}
function warn(...args) {
  console.warn(...args);
}
var DOWNPLAYED_ERROR_LOGS = [
  {
    clientName: "S3Client",
    commandName: "GetObjectCommand",
    errorName: "NoSuchKey"
  }
];
var isDownplayedErrorLog = (errorLog) => DOWNPLAYED_ERROR_LOGS.some((downplayedInput) => downplayedInput.clientName === errorLog?.clientName && downplayedInput.commandName === errorLog?.commandName && (downplayedInput.errorName === errorLog?.error?.name || downplayedInput.errorName === errorLog?.error?.Code));
function error(...args) {
  if (args.some((arg) => isDownplayedErrorLog(arg))) {
    return debug(...args);
  }
  if (args.some((arg) => isOpenNextError(arg))) {
    const error2 = args.find((arg) => isOpenNextError(arg));
    if (error2.logLevel < getOpenNextErrorLogLevel()) {
      return;
    }
    if (error2.logLevel === 0) {
      return console.log(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    if (error2.logLevel === 1) {
      return warn(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    return console.error(...args);
  }
  console.error(...args);
}
function getOpenNextErrorLogLevel() {
  const strLevel = process.env.OPEN_NEXT_ERROR_LOG_LEVEL ?? "1";
  switch (strLevel.toLowerCase()) {
    case "debug":
    case "0":
      return 0;
    case "error":
    case "2":
      return 2;
    default:
      return 1;
  }
}

// node_modules/@opennextjs/cloudflare/dist/api/durable-objects/queue.js
import { DurableObject } from "cloudflare:workers";
var DEFAULT_MAX_REVALIDATION = 5;
var DEFAULT_REVALIDATION_TIMEOUT_MS = 1e4;
var DEFAULT_RETRY_INTERVAL_MS = 2e3;
var DEFAULT_MAX_RETRIES = 6;
var DOQueueHandler = class extends DurableObject {
  /**
   * Revalidations in progress, keyed by deduplication id.
   *
   * Used to dedupe messages and to limit the number of concurrent revalidations.
   * It is only kept in memory: revalidations run in `waitUntil`, so the Durable Object is expected to
   * stay alive until they end.
   */
  ongoingRevalidations = /* @__PURE__ */ new Map();
  /** SQLite storage of the Durable Object. */
  sql;
  /**
   * Failed revalidations waiting to be retried by the alarm, keyed by deduplication id.
   *
   * Messages with a deduplication id in this map are skipped by `revalidate`.
   * Entries are persisted to the `failed_state` table unless SQLite is disabled.
   */
  routeInFailedState = /* @__PURE__ */ new Map();
  /** Service binding to the Worker itself, used to send the revalidation requests. */
  service;
  // Configurable params
  /**
   * Maximum number of revalidations running at the same time.
   *
   * Set with `NEXT_CACHE_DO_QUEUE_MAX_REVALIDATION`, defaults to {@link DEFAULT_MAX_REVALIDATION}.
   */
  maxRevalidations;
  /**
   * Time in milliseconds after which a revalidation request is aborted.
   *
   * Set with `NEXT_CACHE_DO_QUEUE_REVALIDATION_TIMEOUT_MS`, defaults to {@link DEFAULT_REVALIDATION_TIMEOUT_MS}.
   */
  revalidationTimeout;
  /**
   * Base interval in milliseconds of the exponential backoff between retries.
   *
   * Set with `NEXT_CACHE_DO_QUEUE_RETRY_INTERVAL_MS`, defaults to {@link DEFAULT_RETRY_INTERVAL_MS}.
   */
  revalidationRetryInterval;
  /**
   * Maximum number of retries of a failed revalidation.
   *
   * Set with `NEXT_CACHE_DO_QUEUE_MAX_RETRIES`, defaults to {@link DEFAULT_MAX_RETRIES}.
   */
  maxRetries;
  /**
   * Whether SQLite is disabled.
   *
   * Set `NEXT_CACHE_DO_QUEUE_DISABLE_SQLITE` to `"true"` to disable it. Failed revalidations are then lost
   * on restart and messages are never skipped based on the last successful revalidation.
   */
  disableSQLite;
  /**
   * Creates the queue and restores its persisted state.
   *
   * The state is restored in `blockConcurrencyWhile`, so no event is handled before it is ready.
   *
   * @param ctx Durable Object state and storage.
   * @param env Cloudflare environment with the service binding and the queue configuration.
   * @throws {IgnorableError} When the `WORKER_SELF_REFERENCE` service binding is missing.
   */
  constructor(ctx, env) {
    super(ctx, env);
    if (!env.WORKER_SELF_REFERENCE) {
      throw new IgnorableError("No service binding for cache revalidation worker");
    }
    this.service = env.WORKER_SELF_REFERENCE;
    this.sql = ctx.storage.sql;
    this.maxRevalidations = parseIntEnv(env.NEXT_CACHE_DO_QUEUE_MAX_REVALIDATION, DEFAULT_MAX_REVALIDATION);
    this.revalidationTimeout = parseIntEnv(env.NEXT_CACHE_DO_QUEUE_REVALIDATION_TIMEOUT_MS, DEFAULT_REVALIDATION_TIMEOUT_MS);
    this.revalidationRetryInterval = parseIntEnv(env.NEXT_CACHE_DO_QUEUE_RETRY_INTERVAL_MS, DEFAULT_RETRY_INTERVAL_MS);
    this.maxRetries = parseIntEnv(env.NEXT_CACHE_DO_QUEUE_MAX_RETRIES, DEFAULT_MAX_RETRIES);
    this.disableSQLite = env.NEXT_CACHE_DO_QUEUE_DISABLE_SQLITE === "true";
    ctx.blockConcurrencyWhile(async () => {
      debug(`Restoring the state of the durable object`);
      await this.initState();
    });
    debug(`Durable object initialized`);
  }
  /**
   * Starts the revalidation of a route.
   *
   * The message is skipped when a revalidation with the same deduplication id is in progress, when it
   * is in the failed state (the alarm retries it), or when the route was successfully revalidated after
   * the message's `lastModified`.
   *
   * When `maxRevalidations` revalidations are in progress, waits until one of them ends.
   * The revalidation then runs in `waitUntil`: the returned promise does not wait for it.
   *
   * @param msg Message sent by the queue override.
   * @returns A promise that resolves once the revalidation is started or skipped.
   * @throws When a revalidation it waits for rejects (see `executeRevalidation`).
   */
  async revalidate(msg) {
    if (this.ongoingRevalidations.size > 2 * this.maxRevalidations) {
      warn(`Your durable object has 2 times the maximum number of revalidations (${this.maxRevalidations}) in progress. If this happens often, you should consider increasing the NEXT_CACHE_DO_QUEUE_MAX_REVALIDATION or the number of durable objects with the MAX_REVALIDATE_CONCURRENCY env var.`);
    }
    if (this.ongoingRevalidations.has(msg.MessageDeduplicationId))
      return;
    if (this.routeInFailedState.has(msg.MessageDeduplicationId))
      return;
    if (this.checkSyncTable(msg))
      return;
    if (this.ongoingRevalidations.size >= this.maxRevalidations) {
      debug(`The maximum number of revalidations (${this.maxRevalidations}) is reached. Blocking until one of the revalidations finishes.`);
      while (this.ongoingRevalidations.size >= this.maxRevalidations) {
        const ongoingRevalidations = this.ongoingRevalidations.values();
        debug(`Waiting for one of the revalidations to finish`);
        await Promise.race(ongoingRevalidations);
      }
    }
    const revalidationPromise = this.executeRevalidation(msg);
    this.ongoingRevalidations.set(msg.MessageDeduplicationId, revalidationPromise);
    this.ctx.waitUntil(revalidationPromise);
  }
  /**
   * Retries the failed revalidations when the alarm fires.
   *
   * Retries, one after the other, every failed revalidation that is due, plus the earliest one that is
   * not due yet. A retry that fails again is added back to the failed state, which sets a new alarm.
   * An alarm is then set for the failed revalidations that were not retried.
   *
   * @returns A promise that resolves when all the retries are done and the next alarm is set.
   * @throws When a retry rejects (see `executeRevalidation`), or when setting the alarm fails.
   */
  async alarm() {
    const currentDateTime = Date.now();
    const expiredEvents = [];
    let nextEventToRetry;
    for (const event of this.routeInFailedState.values()) {
      if (event.nextAlarmMs <= currentDateTime) {
        expiredEvents.push(event);
      } else if (!nextEventToRetry || event.nextAlarmMs < nextEventToRetry.nextAlarmMs) {
        nextEventToRetry = event;
      }
    }
    if (nextEventToRetry) {
      debug(`Retrying revalidation for ${getRouteKey(nextEventToRetry.msg)}`);
      await this.executeRevalidation(nextEventToRetry.msg);
    }
    for (const event of expiredEvents) {
      debug(`Retrying revalidation for ${getRouteKey(event.msg)}`);
      await this.executeRevalidation(event.msg);
    }
    await this.addAlarm();
  }
  /**
   * Revalidates a route, then updates the failed state and the sync table.
   *
   * Sends a `HEAD` request to the route through the service binding, with the preview mode id inlined
   * at build time in `x-prerender-revalidate`. The request is aborted after `revalidationTimeout`.
   *
   * The outcome depends on the response:
   * - `200` with `x-nextjs-cache: REVALIDATED`: success, the start time is stored in the sync table and
   *   the route is removed from the failed state;
   * - `200` without it: logged as a `FatalError`, the route is removed from the failed state;
   * - `404`: logged as an `IgnorableError`, the route is removed from the failed state;
   * - `500`: logged as an `IgnorableError`, the route is added to the failed state;
   * - any other status: logged as a `RecoverableError`, the route is added to the failed state.
   *
   * Any other error (network error, timeout, ...) is logged and adds the route to the failed state.
   * When done, the deduplication id is removed from `ongoingRevalidations` and the response body is
   * cancelled.
   *
   * @param msg Message of the route to revalidate.
   * @returns A promise that resolves when the revalidation is done.
   * @throws When adding the route to the failed state fails after an unexpected error.
   */
  async executeRevalidation(msg) {
    let response;
    const revalidationStartSeconds = Math.floor(Date.now() / 1e3);
    try {
      const routeKey = getRouteKey(msg);
      debug(`Revalidating ${routeKey}`);
      const protocol = msg.MessageBody.host.includes("localhost") ? "http" : "https";
      response = await this.service.fetch(`${protocol}://${routeKey}`, {
        method: "HEAD",
        headers: {
          // This is defined during build
          "x-prerender-revalidate": "c9dd77182cf11dc41b97fbce26ff3756",
          "x-isr": "1"
        },
        signal: AbortSignal.timeout(this.revalidationTimeout)
      });
      if (response.status === 200 && response.headers.get("x-nextjs-cache") !== "REVALIDATED") {
        this.removeFromFailedState(msg.MessageDeduplicationId);
        throw new FatalError(`The revalidation for ${routeKey} cannot be done. This error should never happen.`);
      } else if (response.status === 404) {
        this.removeFromFailedState(msg.MessageDeduplicationId);
        throw new IgnorableError(`The revalidation for ${routeKey} cannot be done because the page is not found. It's either expected or an error in user code itself`);
      } else if (response.status === 500) {
        await this.addToFailedState(msg);
        throw new IgnorableError(`Something went wrong while revalidating ${routeKey}`);
      } else if (response.status !== 200) {
        await this.addToFailedState(msg);
        throw new RecoverableError(`An unknown error occurred while revalidating ${routeKey}`);
      }
      if (!this.disableSQLite) {
        this.sql.exec(
          "INSERT OR REPLACE INTO sync (id, lastSuccess, buildId) VALUES (?, ?, ?)",
          // We cannot use the deduplication id because it's not unique per route - every time a route is revalidated, the deduplication id is different.
          routeKey,
          revalidationStartSeconds,
          "BAnXMMIeVHRrYMyPs2c8q"
        );
      }
      this.removeFromFailedState(msg.MessageDeduplicationId);
    } catch (e) {
      if (!isOpenNextError(e)) {
        await this.addToFailedState(msg);
      }
      error(e);
    } finally {
      this.ongoingRevalidations.delete(msg.MessageDeduplicationId);
      try {
        await response?.body?.cancel();
      } catch {
      }
    }
  }
  /**
   * Adds a route to the failed state, or updates its entry, and sets an alarm to retry it.
   *
   * The first retry is scheduled 2 seconds later. The next ones are scheduled
   * `2 ** (retryCount + 1) * revalidationRetryInterval` later, where `retryCount` is the number of
   * previous failures. Once the route has failed `maxRetries` times, an error is logged and the route is
   * removed from the failed state instead.
   *
   * The entry is persisted to the `failed_state` table unless SQLite is disabled.
   *
   * @param msg Message of the failed revalidation.
   * @returns A promise that resolves when the failed state is updated and the alarm is set.
   * @throws When the SQL write or setting the alarm fails.
   */
  async addToFailedState(msg) {
    debug(`Adding ${getRouteKey(msg)} to the failed state`);
    const existingFailedState = this.routeInFailedState.get(msg.MessageDeduplicationId);
    let updatedFailedState;
    if (existingFailedState) {
      if (existingFailedState.retryCount >= this.maxRetries) {
        error(`The revalidation for ${getRouteKey(msg)} has failed after ${this.maxRetries} retries. It will not be tried again, but subsequent ISR requests will retry.`);
        this.removeFromFailedState(msg.MessageDeduplicationId);
        return;
      }
      const nextAlarmMs = Date.now() + Math.pow(2, existingFailedState.retryCount + 1) * this.revalidationRetryInterval;
      updatedFailedState = {
        ...existingFailedState,
        retryCount: existingFailedState.retryCount + 1,
        nextAlarmMs
      };
    } else {
      updatedFailedState = {
        msg,
        retryCount: 1,
        nextAlarmMs: Date.now() + 2e3
      };
    }
    this.routeInFailedState.set(msg.MessageDeduplicationId, updatedFailedState);
    if (!this.disableSQLite) {
      this.sql.exec("INSERT OR REPLACE INTO failed_state (id, data, buildId) VALUES (?, ?, ?)", msg.MessageDeduplicationId, JSON.stringify(updatedFailedState), "BAnXMMIeVHRrYMyPs2c8q");
    }
    await this.addAlarm();
  }
  /**
   * Removes a route from the failed state.
   *
   * Also deletes its persisted row so that `initState()` does not restore it. Every persisted row is in
   * `routeInFailedState`, so the `DELETE` is skipped when the route is not there.
   *
   * @param id Deduplication id of the route.
   * @throws When the SQL delete fails.
   */
  removeFromFailedState(id) {
    if (this.routeInFailedState.delete(id) && !this.disableSQLite) {
      this.sql.exec("DELETE FROM failed_state WHERE id = ?", id);
    }
  }
  /**
   * Sets an alarm for the earliest failed revalidation.
   *
   * Does nothing when an alarm is already set or when no revalidation is in the failed state.
   * When the earliest retry time is in the past, the alarm is set `revalidationRetryInterval` from now.
   *
   * @returns A promise that resolves when the alarm is set.
   * @throws When reading or setting the alarm fails.
   */
  async addAlarm() {
    const existingAlarm = await this.ctx.storage.getAlarm({ allowConcurrency: false });
    if (existingAlarm)
      return;
    if (this.routeInFailedState.size === 0)
      return;
    let nextAlarmToSetup = Math.min(...Array.from(this.routeInFailedState.values()).map(({ nextAlarmMs }) => nextAlarmMs));
    if (nextAlarmToSetup < Date.now()) {
      nextAlarmToSetup = Date.now() + this.revalidationRetryInterval;
    }
    await this.ctx.storage.setAlarm(nextAlarmToSetup);
  }
  /**
   * Restores the state persisted in SQLite.
   *
   * Creates the `failed_state` and `sync` tables, deletes the rows written by other builds, restores
   * the failed revalidations and sets the alarm to retry them. Revalidations that were in progress are
   * not restored, as their outcome is unknown. Does nothing when SQLite is disabled.
   *
   * @returns A promise that resolves when the state is restored.
   * @throws When a SQL statement fails, a row cannot be parsed, or setting the alarm fails.
   */
  async initState() {
    if (this.disableSQLite)
      return;
    this.sql.exec("CREATE TABLE IF NOT EXISTS failed_state (id TEXT PRIMARY KEY, data TEXT, buildId TEXT)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS sync (id TEXT PRIMARY KEY, lastSuccess INTEGER, buildId TEXT)");
    this.sql.exec("DELETE FROM failed_state WHERE buildId != ?", "BAnXMMIeVHRrYMyPs2c8q");
    this.sql.exec("DELETE FROM sync WHERE buildId != ?", "BAnXMMIeVHRrYMyPs2c8q");
    const failedStateCursor = this.sql.exec("SELECT * FROM failed_state");
    for (const row of failedStateCursor) {
      this.routeInFailedState.set(row.id, JSON.parse(row.data));
    }
    await this.addAlarm();
  }
  /**
   * Checks whether the route was successfully revalidated after the message's `lastModified`.
   *
   * This happens when the message comes from a stale copy of an eventually consistent incremental cache
   * (e.g. KV, or a regional cache) read after the revalidation. Times are compared in seconds.
   *
   * A `lastModified` of `1` (entry stale by tag) or `0` (unknown) is not a time: such messages are never
   * skipped.
   *
   * @param msg Message of the route to check.
   * @returns `true` if the route was revalidated after the message's `lastModified`, `false` otherwise,
   *   when `lastModified` is not a time, when SQLite is disabled, or when the query fails.
   */
  checkSyncTable(msg) {
    try {
      if (this.disableSQLite)
        return false;
      if (msg.MessageBody.lastModified <= 1)
        return false;
      return this.sql.exec("SELECT 1 FROM sync WHERE id = ? AND lastSuccess > ? LIMIT 1", getRouteKey(msg), Math.round(msg.MessageBody.lastModified / 1e3)).toArray().length > 0;
    } catch {
      return false;
    }
  }
};
function parseIntEnv(value, defaultValue) {
  return value ? parseInt(value) : defaultValue;
}
function getRouteKey(msg) {
  return `${msg.MessageBody.host}${msg.MessageBody.url}`;
}
export {
  DOQueueHandler
};
