#!/usr/bin/env sh
set -eu

REPOSITORY="${UCR_GITHUB_REPOSITORY:-nesste/ucr}"
INSTALL_DIR="${UCR_INSTALL_DIR:-$HOME/.local/bin}"
REQUESTED_VERSION="${1:-latest}"
CONFIG_ROOT="${XDG_CONFIG_HOME:-$HOME/.config}"
UCR_ENV_DIR="${CONFIG_ROOT}/ucr"
UCR_ENV_SH="${UCR_ENV_DIR}/env.sh"
UCR_FISH_DIR="${CONFIG_ROOT}/fish/conf.d"
UCR_FISH_ENV="${UCR_FISH_DIR}/ucr.fish"
SHELL_NAME="$(basename "${SHELL:-sh}")"

path_contains() {
  case ":$1:" in
    *":$2:"*) return 0 ;;
    *) return 1 ;;
  esac
}

shell_single_quote() {
  printf "%s" "$1" | sed "s/'/'\\\\''/g"
}

ensure_line() {
  file="$1"
  line="$2"

  mkdir -p "$(dirname "$file")"
  [ -f "$file" ] || : > "$file"

  if grep -Fqx "$line" "$file" 2>/dev/null; then
    return 1
  fi

  printf '\n%s\n' "$line" >> "$file"
  return 0
}

write_posix_env() {
  quoted_install_dir="$(shell_single_quote "$INSTALL_DIR")"

  mkdir -p "$UCR_ENV_DIR"
  cat > "$UCR_ENV_SH" <<EOF
case ":\$PATH:" in
  *:'$quoted_install_dir':*)
    ;;
  *)
    export PATH='$quoted_install_dir':"\$PATH"
    ;;
esac
EOF
}

write_fish_env() {
  quoted_install_dir="$(shell_single_quote "$INSTALL_DIR")"

  mkdir -p "$UCR_FISH_DIR"
  cat > "$UCR_FISH_ENV" <<EOF
if not contains -- '$quoted_install_dir' \$PATH
  set -gx PATH '$quoted_install_dir' \$PATH
end
EOF
}

uname_s="$(uname -s)"
uname_m="$(uname -m)"

case "$uname_s" in
  Linux) os="linux" ;;
  Darwin) os="darwin" ;;
  *)
    echo "ucr installer: unsupported operating system: $uname_s" >&2
    exit 1
    ;;
esac

case "$uname_m" in
  x86_64|amd64) arch="x64" ;;
  arm64|aarch64)
    if [ "$os" = "darwin" ]; then
      arch="arm64"
    else
      echo "ucr installer: unsupported architecture for this release: $uname_m" >&2
      exit 1
    fi
    ;;
  *)
    echo "ucr installer: unsupported architecture: $uname_m" >&2
    exit 1
    ;;
esac

asset="ucr-${os}-${arch}"
base_url="https://github.com/${REPOSITORY}/releases"

if [ "$REQUESTED_VERSION" = "latest" ]; then
  download_url="${base_url}/latest/download/${asset}"
else
  download_url="${base_url}/download/${REQUESTED_VERSION}/${asset}"
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

mkdir -p "$INSTALL_DIR"

echo "Downloading ${download_url}"
curl -fsSL "$download_url" -o "$tmpdir/ucr"
chmod +x "$tmpdir/ucr"
mv "$tmpdir/ucr" "$INSTALL_DIR/ucr"

write_posix_env

case "$SHELL_NAME" in
  bash)
    ensure_line "$HOME/.profile" 'UCR_ENV_SH="${XDG_CONFIG_HOME:-$HOME/.config}/ucr/env.sh"; [ -f "$UCR_ENV_SH" ] && . "$UCR_ENV_SH"' >/dev/null || true
    ensure_line "$HOME/.bashrc" 'UCR_ENV_SH="${XDG_CONFIG_HOME:-$HOME/.config}/ucr/env.sh"; [ -f "$UCR_ENV_SH" ] && . "$UCR_ENV_SH"' >/dev/null || true
    ;;
  zsh)
    ensure_line "$HOME/.zprofile" 'UCR_ENV_SH="${XDG_CONFIG_HOME:-$HOME/.config}/ucr/env.sh"; [ -f "$UCR_ENV_SH" ] && . "$UCR_ENV_SH"' >/dev/null || true
    ensure_line "$HOME/.zshrc" 'UCR_ENV_SH="${XDG_CONFIG_HOME:-$HOME/.config}/ucr/env.sh"; [ -f "$UCR_ENV_SH" ] && . "$UCR_ENV_SH"' >/dev/null || true
    ;;
  fish)
    write_fish_env
    ;;
  *)
    ensure_line "$HOME/.profile" 'UCR_ENV_SH="${XDG_CONFIG_HOME:-$HOME/.config}/ucr/env.sh"; [ -f "$UCR_ENV_SH" ] && . "$UCR_ENV_SH"' >/dev/null || true
    ;;
esac

echo "ucr installed to $INSTALL_DIR/ucr"

if ! path_contains "$PATH" "$INSTALL_DIR"; then
  echo "Configured PATH for future shells."
  echo "If you ran this with 'curl | sh', open a new shell to use 'ucr'."
fi
