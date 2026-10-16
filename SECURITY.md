# Security Policy

## Reporting a vulnerability

Please do not open a public issue for security problems. Email
chris@dimedata.cloud with a description of the problem, the steps to reproduce
it, and the affected URL or file. You can expect an acknowledgement within a
few days. Credible reports will be fixed on `main` and credited if you want
credit.

## Supported versions

Only the latest `main` branch is supported. Older commits and branches are not
patched.

## Secrets

This repository must not contain credentials. `tools/check-content.mjs` scans
tracked files for common key shapes and runs in CI. If you find a committed
secret, report it through the channel above so it can be revoked.
