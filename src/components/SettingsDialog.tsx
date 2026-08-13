import { useState } from "react";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import {
  clearIgdbCredentials,
  dataDir,
  errorMessage,
  saveIgdbCredentials,
} from "../lib/api";
import type { SampleCounts } from "../lib/db";
import { Modal } from "./Modal";

interface SettingsDialogProps {
  igdbEnabled: boolean;
  /** Counted per table rather than summed - they are different things. */
  sampleCounts: SampleCounts;
  onIgdbChanged: (enabled: boolean) => void;
  onLoadSamples: () => Promise<void>;
  onClearSamples: () => Promise<void>;
  onClose: () => void;
}

const TWITCH_CONSOLE = "https://dev.twitch.tv/console/apps";

export function SettingsDialog({
  igdbEnabled,
  sampleCounts,
  onIgdbChanged,
  onLoadSamples,
  onClearSamples,
  onClose,
}: SettingsDialogProps) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [sampleBusy, setSampleBusy] = useState(false);

  async function connect() {
    setTesting(true);
    setResult(null);
    try {
      await saveIgdbCredentials(clientId, clientSecret);
      setClientId("");
      setClientSecret("");
      setResult({ ok: true, text: "Connected. You can now search IGDB when adding a game." });
      onIgdbChanged(true);
    } catch (cause) {
      setResult({ ok: false, text: errorMessage(cause) });
    } finally {
      setTesting(false);
    }
  }

  async function disconnect() {
    try {
      await clearIgdbCredentials();
      setResult({ ok: true, text: "Disconnected. Manual entry still works as normal." });
      onIgdbChanged(false);
    } catch (cause) {
      setResult({ ok: false, text: errorMessage(cause) });
    }
  }

  // Spelled out rather than summed. "15 samples" would be adding nine games to
  // six wishlist entries, which are not the same kind of thing - the same
  // reason the app header never puts the two counts on one line.
  const total = sampleCounts.games + sampleCounts.wishlist;
  const parts: string[] = [];
  if (sampleCounts.games > 0) {
    parts.push(`${sampleCounts.games} sample game${sampleCounts.games === 1 ? "" : "s"}`);
  }
  if (sampleCounts.wishlist > 0) {
    parts.push(
      `${sampleCounts.wishlist} wishlist entr${sampleCounts.wishlist === 1 ? "y" : "ies"}`,
    );
  }
  const removeLabel = total === 0 ? "Remove samples" : `Remove ${parts.join(" and ")}`;

  async function runSample(action: () => Promise<void>) {
    setSampleBusy(true);
    try {
      await action();
    } finally {
      setSampleBusy(false);
    }
  }

  return (
    <Modal
      title="Settings"
      onClose={onClose}
      wide
      footer={
        <button type="button" className="button primary" onClick={onClose}>
          Done
        </button>
      }
    >
      <section className="settings-section">
        <h3>
          Game search (IGDB)
          <span className={igdbEnabled ? "pill on" : "pill"}>
            {igdbEnabled ? "Connected" : "Not connected"}
          </span>
        </h3>
        <p className="settings-help">
          Connecting IGDB lets you search for a game when adding it, and fills in the cover art,
          description and release date for you. It is completely optional — you can always type
          games in by hand.
        </p>

        <details className="settings-steps">
          <summary>How to get your Client ID and Client Secret</summary>
          <ol>
            <li>
              Go to{" "}
              <button
                type="button"
                className="link"
                onClick={() => void openUrl(TWITCH_CONSOLE).catch(() => undefined)}
              >
                dev.twitch.tv/console/apps
              </button>{" "}
              and sign in with a Twitch account. (IGDB is owned by Twitch, which is why the
              sign-in happens there.)
            </li>
            <li>Click <strong>Register Your Application</strong>.</li>
            <li>
              Give it any name, set the OAuth Redirect URL to{" "}
              <code>http://localhost</code>, choose any category, then click{" "}
              <strong>Create</strong>.
            </li>
            <li>
              Click <strong>Manage</strong> on your new application. Copy the{" "}
              <strong>Client ID</strong>, then click <strong>New Secret</strong> and copy the{" "}
              <strong>Client Secret</strong>.
            </li>
            <li>Paste both below and click Connect.</li>
          </ol>
        </details>

        {igdbEnabled ? (
          <div className="settings-actions">
            <p className="settings-help">
              Credentials are saved on this computer. They are never shown again — to change
              them, disconnect and enter a new pair.
            </p>
            <button type="button" className="button danger-subtle" onClick={() => void disconnect()}>
              Disconnect IGDB
            </button>
          </div>
        ) : (
          <div className="settings-form">
            <label className="field">
              <span className="field-label">Client ID</span>
              <input
                type="text"
                value={clientId}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setClientId(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Client Secret</span>
              <input
                type="password"
                value={clientSecret}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setClientSecret(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="button primary"
              onClick={() => void connect()}
              disabled={testing || !clientId.trim() || !clientSecret.trim()}
            >
              {testing ? "Checking…" : "Connect"}
            </button>
          </div>
        )}

        {result && (
          <p className={result.ok ? "notice success" : "notice error"}>{result.text}</p>
        )}
      </section>

      <section className="settings-section">
        <h3>Sample data</h3>
        <p className="settings-help">
          Adds nine example games and six wishlist entries, so you can see how both tabs look
          with something in them. The wishlist entries cover all three priorities, because that
          is what the wishlist groups by — an empty one shows none of its shape. Everything is
          tagged as a sample and can be removed in one click.
        </p>
        <div className="settings-actions row">
          <button
            type="button"
            className="button subtle"
            disabled={sampleBusy}
            onClick={() => void runSample(onLoadSamples)}
          >
            Load sample data
          </button>
          <button
            type="button"
            className="button danger-subtle"
            disabled={sampleBusy || total === 0}
            onClick={() => void runSample(onClearSamples)}
          >
            {removeLabel}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>Your data</h3>
        <p className="settings-help">
          Everything — the database and every cover image — is stored in one folder on this
          computer. Nothing is uploaded anywhere.
        </p>
        <button
          type="button"
          className="button subtle"
          onClick={() => void dataDir().then((path) => openPath(path)).catch(() => undefined)}
        >
          Open data folder
        </button>
      </section>
    </Modal>
  );
}
