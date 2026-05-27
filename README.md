# Multi-Login — MeshCentral Plugin

Bulk Windows login automation for MeshCentral. Select multiple computers, enter credentials once, and the plugin connects to each machine's KVM session and types the username + password as if you were sitting at the keyboard.

Built for IT admins managing classroom/lab fleets where the same maintenance account needs to be logged on dozens of locked machines.

## Features

- **Multi-select** computers across one or more device groups
- **Group-aware selection** — pick a group (e.g. `ROOM-H108`) and all its computers get selected
- **Live online indicator** (`● green` / `○ red`) — offline machines are skipped automatically
- **Saved credentials** stored server-side, shared across all MeshCentral admins
- **Sequential KVM automation** — Ctrl+Alt+Del → username → Tab → password → Enter, on each selected node
- **Survives iframe refreshes** — the worker runs in the parent MeshCentral window context
- **Searchable groups and nodes** lists
- **Progress indicator** with optional detailed logs

## Requirements

- MeshCentral 1.1.0 or later
- Plugins enabled in MeshCentral (`settings.plugins.enabled = true` in MeshCentral's `config.json`)
- Target machines: Windows with MeshAgent installed and online
- Modern browser (Chromium, Firefox)

## Installation

### Option 1 — Via the MeshCentral Plugin Manager (recommended)

1. Open MeshCentral as an administrator
2. Go to **My Server → Plugins** (called *Modules* in some localized UIs)
3. Click **Download Plugin** (or *Télécharger le module*)
4. Paste this URL as the plugin `config.json` location:
   ```
   https://raw.githubusercontent.com/V3locidad/multilogin-meshcentral/main/config.json
   ```
5. The plugin appears in the list. Click the action menu → **Install**
6. Toggle the plugin **enabled**
7. **Restart the MeshCentral server** (`systemctl restart meshcentral` or your equivalent)
8. Reload the MeshCentral UI in your browser — a new **Multi-Login** tab appears on each device's page

### Option 2 — Manual install

1. Clone this repository into your MeshCentral plugins directory:
   ```bash
   cd <meshcentral-data>/plugins
   git clone https://github.com/V3locidad/multilogin-meshcentral.git multilogin
   ```
2. Enable the plugin in MeshCentral's plugins admin panel
3. Restart MeshCentral

## Usage

1. Open any device in MeshCentral, then click the **Multi-Login** tab
2. **Select an account**:
   - Pick a saved account from the dropdown, OR
   - Type a username and password manually, then click **Enregistrer** (Save) to store it server-side
3. **Select target computers**:
   - Tick individual computers in the right pane, OR
   - Tick an entire group in the left pane to select all its computers
   - Use the search boxes to filter long lists
4. Click **Lancer la connexion sur les postes coches** (Launch)
5. Offline computers are detected and you're asked whether to skip them
6. The plugin sequentially:
   - Opens a KVM tunnel to each machine
   - Sends Ctrl+Alt+Del
   - Types the username
   - Presses Tab
   - Types the password
   - Presses Enter
7. The progress indicator shows `X/Y` completed. Detailed logs are available via the **Logs** button if needed.

## How it works

The plugin uses MeshCentral's internal `CreateAgentRedirect` + `CreateAgentRemoteDesktop` functions — the same code path used when you click "Desktop" in the MeshCentral UI. This guarantees protocol compatibility across MeshCentral versions.

Keystrokes are sent via the agent's KVM input channel:

- `SendCtrlAltDelMsg()` for Ctrl+Alt+Del
- `SendKeyUnicode(action, codepoint)` for each character of username/password
- `SendKeyMsgKC(action, VK_TAB)` and `SendKeyMsgKC(action, VK_RETURN)` for Tab and Enter

The MeshAgent on Windows runs as `SYSTEM` and uses `SendInput` to inject keys, so input reaches the Windows secure desktop (Winlogon) the same way as a physical keyboard.

## Security notes

- **Saved account passwords are stored in plain text** in `accounts.json` inside the plugin directory on the MeshCentral server. The file is readable only by the MeshCentral process user. Treat this file like any other secrets file.
- Account writes/deletes currently use GET requests with credentials in URL parameters (MeshCentral's `/pluginadmin.ashx` endpoint rejects POSTs). The transit is HTTPS so on-the-wire interception is not a concern, but **MeshCentral access logs may contain the URLs** with credentials. If this matters for your threat model, see the *Roadmap* below — moving to WebSocket-based RPC is on the list.
- Anyone with admin access to MeshCentral can read, write, and delete all saved accounts.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `HTTP 401` when saving an account | Outdated plugin (v0.0.22 or older) | Update to ≥ v0.0.23 |
| Login types into username field but Tab/Enter don't fire | Wrong key codes in older versions | Update to ≥ v0.0.18 |
| Status stays at `0/N` forever | The iframe is being refreshed before completion | Update to ≥ v0.0.17 (worker runs in parent window) |
| `Worker non injecte` alert | Cross-frame access blocked | Make sure MeshCentral and the plugin iframe are same-origin |
| Plugin tab doesn't appear | Plugin not enabled, or server not restarted | Check **My Server → Plugins**, toggle on, then `systemctl restart meshcentral` |
| Nothing happens on screen | Target is offline, or another KVM viewer is holding input | Verify the green ● indicator; close other KVM sessions on the same node |
| `Aucune donnee agent recue` | The target machine's agent is unreachable | Check agent status in MeshCentral, retry later |

To see the raw step-by-step log, click the **Logs** button on the Multi-Login pane.

## Roadmap / Possible improvements

- [ ] Switch credential storage RPC from HTTP GET to MeshCentral WebSocket messages (no credentials in URLs/logs)
- [ ] Encrypt `accounts.json` at rest using a key derived from MeshCentral's master secret
- [ ] Parallel execution with controllable concurrency (currently sequential)
- [ ] Per-machine credentials (CSV import: `nodeid,user,pass`)
- [ ] Selection presets — save and recall sets of computers
- [ ] Domain-aware username (auto-prepend `DOMAIN\` or `user@domain`)
- [ ] Audit log on the server side — who used which account on which nodes, when
- [ ] Per-account ACL (limit certain accounts to specific admin users or device groups)
- [ ] Re-attempt on failure with backoff
- [ ] Configurable keystroke timings via the UI
- [ ] Custom post-login actions (run a script, open an application…)
- [ ] Dark mode matching MeshCentral's theme
- [ ] Replace `prompt`/`alert`/`confirm` with proper modals
- [ ] i18n (currently mixed FR/EN in the UI)
- [ ] Status icon per machine after a run (success / failed / skipped)

## License

MIT
