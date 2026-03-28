# create-dubhe

Create a new Dubhe project.

## Quick Start

```bash
pnpm create dubhe
```

## One-Click Installer (Cross-Platform)

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/0xobelisk/dubhe/main/scripts/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/0xobelisk/dubhe/main/scripts/install.ps1 | iex
```

### Windows (CMD)

```cmd
curl -fsSL -o install.ps1 https://raw.githubusercontent.com/0xobelisk/dubhe/main/scripts/install.ps1 && powershell -ExecutionPolicy Bypass -File .\install.ps1
```

## Installer Options

Both installers support:

- `--manager <auto|pnpm|npm>`
- `--version <tag>`
- `--install-deps` / `-InstallDeps` (auto-install missing Node.js/pnpm)
- `--dry-run` / `-DryRun`
- pass-through args after `--` to `create-dubhe`

Terminal coverage:

- macOS/Linux: Bash/Zsh/Fish via `install.sh` (Bash runtime)
- Windows: PowerShell via `install.ps1`, CMD via `install.cmd`

Example:

```bash
./scripts/install.sh --manager pnpm -- --projectName my-app --chain sui
```
