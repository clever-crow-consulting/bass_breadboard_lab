set shell := ["bash", "-euo", "pipefail", "-c"]

nvm_v22_bin := env("HOME", "") + "/.nvm/versions/node/v22.16.0/bin"
export PATH := if path_exists(nvm_v22_bin) == "true" { nvm_v22_bin + ":" + env("PATH", "") } else { env("PATH", "") }

default:
    @just --list

site-serve port="8765":
    PORT="{{port}}" node scripts/serve_local.mjs

site-test:
    node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON --test tests/*.test.mjs

site-lint:
    node scripts/check_site.mjs

site-check: site-lint site-test
