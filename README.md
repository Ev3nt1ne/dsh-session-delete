# dsh-session-delete

[切换到中文 / Switch to Chinese](README.zh-CN.md)

Real session deletion for DSH (DeepSeek Harness). Archiving only hides a session from the sidebar
while its disk log keeps growing — this plugin adds a real delete, with a recovery step first.

- **Delete (recoverable)** — moves the session to a Recycle Bin; restore puts it back in the sidebar
- **Permanently delete** — irreversible; confirmations are worded so the two are never confused
- **All-sessions manager** — search, filter, select-all, batch delete, grouped by workspace
- **Recycle Bin** — batch restore / permanently delete / empty it in one click
- Running sessions refuse to delete; deleting the open session switches to a blank one

## Fork additions

- **Bilingual UI** (`src/locales/{zh,en}.js`) with a plugin config `locale`:
  `'zh' | 'en' | 'auto'`. Default stays **`'zh'`** (upstream's language); `'auto'` follows the
  browser language. A missing key falls back to Chinese — never a raw key.
- **Optional sidebar delete button** — config `sidebarButton` (default **off**). Adds a trash
  button at the sidebar footer with a two-step confirm: first press arms it, a second press within
  4 seconds deletes — to the Recycle Bin, never permanent.
- `npm test` also checks the zh/en string catalogues stay in sync.

## Install

```sh
dsh plugin --profile web add github:Ev3nt1ne/dsh-session-delete
```

Zero build (plain JS, no bundler), so a git install never misses a build step. Configure the new
options under **Settings → Plugins → Archived sessions**.

## Usage

1. Open **Settings → Archived sessions**
2. Right-click an archived session, or manage everything (archived + live) under **All sessions**
3. Delete goes to the Recycle Bin (`~/.dsh/trash/sessions/`) first; *Permanently delete* is only
   for items you are sure about
4. DSH versions that cannot un-archive online fall back automatically; run
   `node tools/unhide.mjs <sessionId>` while DSH is stopped to rescue a session offline

## Development

```sh
npm test   # smoke + render + locales (checks zh/en key parity)
```

## License

Apache-2.0
