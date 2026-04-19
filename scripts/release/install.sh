#!/usr/bin/env sh
set -eu

REPOSITORY="${UCR_GITHUB_REPOSITORY:-nesste/ucr}"
INSTALL_DIR="${UCR_INSTALL_DIR:-$HOME/.local/bin}"
REQUESTED_VERSION="${1:-latest}"

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

case ":$PATH:" in
  *":$INSTALL_DIR:"*)
    echo "ucr installed to $INSTALL_DIR/ucr"
    ;;
  *)
    echo "ucr installed to $INSTALL_DIR/ucr"
    echo "Add $INSTALL_DIR to PATH to run 'ucr' directly."
    ;;
esac
