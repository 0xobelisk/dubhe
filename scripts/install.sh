#!/usr/bin/env bash

set -euo pipefail

REQUIRED_NODE_MAJOR=22
DEFAULT_PNPM_VERSION="9.12.3"

MANAGER="auto"
CREATE_DUBHE_VERSION="latest"
INSTALL_DEPS="false"
DRY_RUN="false"
CREATE_ARGS=()
SUDO=""

usage() {
  cat <<'EOF'
One-click Dubhe installer (macOS/Linux)

Usage:
  ./scripts/install.sh [options] [-- <create-dubhe args>]

Options:
  -m, --manager <auto|pnpm|npm>   Package manager to use (default: auto)
  -v, --version <tag>             create-dubhe version (default: latest)
      --install-deps              Automatically install missing Node.js/pnpm
      --dry-run                   Print actions without executing them
  -h, --help                      Show this help

Examples:
  ./scripts/install.sh
  ./scripts/install.sh --install-deps
  ./scripts/install.sh --manager pnpm -- --projectName my-app --chain sui
EOF
}

log() {
  printf '[dubhe-install] %s\n' "$*"
}

err() {
  printf '[dubhe-install] ERROR: %s\n' "$*" >&2
  exit 1
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

run_cmd() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    log "(dry-run) $*"
    return 0
  fi
  "$@"
}

node_major() {
  if ! has_cmd node; then
    echo ""
    return 0
  fi
  node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo ""
}

ensure_sudo() {
  if [[ "$(id -u)" -eq 0 ]]; then
    SUDO=""
    return 0
  fi
  has_cmd sudo || err "This action requires root privileges. Install sudo or run as root."
  SUDO="sudo"
}

sudo_cmd() {
  if [[ -n "${SUDO}" ]]; then
    run_cmd "${SUDO}" "$@"
  else
    run_cmd "$@"
  fi
}

install_node_macos() {
  has_cmd brew || err "Homebrew is required for --install-deps on macOS."
  run_cmd brew install node@22

  if [[ "${DRY_RUN}" != "true" ]]; then
    local prefix
    prefix="$(brew --prefix node@22 2>/dev/null || true)"
    if [[ -n "${prefix}" && -d "${prefix}/bin" ]]; then
      export PATH="${prefix}/bin:${PATH}"
    fi
    hash -r || true
  fi
}

install_node_linux() {
  if has_cmd apt-get; then
    ensure_sudo
    sudo_cmd apt-get update
    sudo_cmd apt-get install -y ca-certificates curl gnupg
    if [[ "${DRY_RUN}" == "true" ]]; then
      if [[ -n "${SUDO}" ]]; then
        log "(dry-run) curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -"
      else
        log "(dry-run) curl -fsSL https://deb.nodesource.com/setup_22.x | bash -"
      fi
    else
      if [[ -n "${SUDO}" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
      else
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
      fi
    fi
    sudo_cmd apt-get install -y nodejs
    return 0
  fi

  if has_cmd dnf; then
    ensure_sudo
    if [[ "${DRY_RUN}" == "true" ]]; then
      if [[ -n "${SUDO}" ]]; then
        log "(dry-run) curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -"
      else
        log "(dry-run) curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -"
      fi
    else
      if [[ -n "${SUDO}" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
      else
        curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
      fi
    fi
    sudo_cmd dnf install -y nodejs
    return 0
  fi

  if has_cmd yum; then
    ensure_sudo
    if [[ "${DRY_RUN}" == "true" ]]; then
      if [[ -n "${SUDO}" ]]; then
        log "(dry-run) curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -"
      else
        log "(dry-run) curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -"
      fi
    else
      if [[ -n "${SUDO}" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
      else
        curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
      fi
    fi
    sudo_cmd yum install -y nodejs
    return 0
  fi

  if has_cmd pacman; then
    ensure_sudo
    sudo_cmd pacman -Sy --noconfirm nodejs npm
    return 0
  fi

  if has_cmd apk; then
    ensure_sudo
    sudo_cmd apk add --no-cache nodejs npm
    return 0
  fi

  err "Unsupported Linux package manager for --install-deps. Install Node.js >= ${REQUIRED_NODE_MAJOR} manually."
}

install_node() {
  local os
  os="$(uname -s)"
  case "${os}" in
    Darwin) install_node_macos ;;
    Linux) install_node_linux ;;
    *) err "Unsupported OS '${os}' for --install-deps. Install Node.js manually." ;;
  esac
}

ensure_node() {
  local major
  major="$(node_major)"
  if [[ -n "${major}" && "${major}" -ge "${REQUIRED_NODE_MAJOR}" ]]; then
    return 0
  fi

  if [[ "${INSTALL_DEPS}" != "true" ]]; then
    if [[ -z "${major}" ]]; then
      err "Node.js is required. Re-run with --install-deps or install Node.js >= ${REQUIRED_NODE_MAJOR}."
    fi
    err "Detected Node.js $(node -v). Re-run with --install-deps or upgrade to Node.js >= ${REQUIRED_NODE_MAJOR}."
  fi

  log "Installing Node.js >= ${REQUIRED_NODE_MAJOR}..."
  install_node

  major="$(node_major)"
  if [[ -z "${major}" ]]; then
    err "Node.js installation did not expose 'node' in PATH. Open a new shell and retry."
  fi
  if [[ "${major}" -lt "${REQUIRED_NODE_MAJOR}" ]]; then
    err "Installed Node.js version is still below ${REQUIRED_NODE_MAJOR} (current: $(node -v))."
  fi
}

try_activate_pnpm_with_corepack() {
  has_cmd corepack || return 1
  run_cmd corepack enable || true
  run_cmd corepack prepare "pnpm@${DEFAULT_PNPM_VERSION}" --activate || true
  if [[ "${DRY_RUN}" != "true" ]]; then
    hash -r || true
  fi
  has_cmd pnpm
}

install_pnpm_with_npm() {
  has_cmd npm || return 1
  if run_cmd npm install -g "pnpm@${DEFAULT_PNPM_VERSION}"; then
    return 0
  fi
  if [[ "$(id -u)" -ne 0 ]] && has_cmd sudo; then
    run_cmd sudo npm install -g "pnpm@${DEFAULT_PNPM_VERSION}" && return 0
  fi
  return 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--manager)
      [[ $# -lt 2 ]] && err "Missing value for $1"
      MANAGER="$2"
      shift 2
      ;;
    -v|--version)
      [[ $# -lt 2 ]] && err "Missing value for $1"
      CREATE_DUBHE_VERSION="$2"
      shift 2
      ;;
    --install-deps)
      INSTALL_DEPS="true"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      CREATE_ARGS+=("$@")
      break
      ;;
    *)
      CREATE_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ "${MANAGER}" != "auto" && "${MANAGER}" != "pnpm" && "${MANAGER}" != "npm" ]]; then
  err "Invalid --manager value: ${MANAGER}. Expected: auto, pnpm, npm."
fi

ensure_node

if [[ "${MANAGER}" == "auto" ]]; then
  if has_cmd pnpm; then
    MANAGER="pnpm"
  else
    if has_cmd corepack; then
      log "pnpm not found. Trying to activate pnpm via corepack..."
      if try_activate_pnpm_with_corepack; then
        MANAGER="pnpm"
      elif [[ "${INSTALL_DEPS}" == "true" ]] && install_pnpm_with_npm; then
        MANAGER="pnpm"
      else
        MANAGER="npm"
      fi
    elif [[ "${INSTALL_DEPS}" == "true" ]] && install_pnpm_with_npm; then
      MANAGER="pnpm"
    else
      MANAGER="npm"
    fi
  fi
fi

if [[ "${MANAGER}" == "pnpm" ]]; then
  if ! has_cmd pnpm; then
    try_activate_pnpm_with_corepack || true
  fi
  if ! has_cmd pnpm && [[ "${INSTALL_DEPS}" == "true" ]]; then
    install_pnpm_with_npm || true
  fi
  has_cmd pnpm || err "pnpm is not installed. Re-run with --install-deps or install pnpm manually."
  CMD=(pnpm dlx "create-dubhe@${CREATE_DUBHE_VERSION}")
else
  has_cmd npx || err "npx is required but not found in PATH."
  CMD=(npx --yes "create-dubhe@${CREATE_DUBHE_VERSION}")
fi

log "Node.js $(node -v) detected."
log "Using package manager: ${MANAGER}"
log "Running: ${CMD[*]} ${CREATE_ARGS[*]:-}"

if [[ "${DRY_RUN}" == "true" ]]; then
  log "(dry-run) Create command skipped."
  exit 0
fi

"${CMD[@]}" "${CREATE_ARGS[@]}"
