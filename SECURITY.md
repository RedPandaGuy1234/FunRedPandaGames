# Security Policy

## Supported Versions

This repo is a small, actively maintained collection of games. Only the latest
released version (see the [Releases](https://github.com/RedPandaGuy1234/Games/releases)
page, managed via `release-please`) is supported with security fixes. Older
versions will not receive backported patches — please update to the latest
release before reporting an issue.

| Version | Supported          |
| ------- | ------------------- |
| Latest  | :white_check_mark:  |
| Older   | :x:                  |

## Reporting a Vulnerability

If you find a security vulnerability in this repo (for example, something
that could let arbitrary code run, leak data, or affect people playing the
browser-based games), please **do not open a public issue**.

Instead, please report it privately using one of these methods:

1. **Preferred:** Open a [GitHub Security Advisory](https://github.com/RedPandaGuy1234/Games/security/advisories/new)
   for this repository. This is private by default and goes straight to the
   maintainer.
2. If that's not available to you, open a new [Discussion](https://github.com/RedPandaGuy1234/Games/discussions)
   and @mention `RedPandaGuy1234`, asking for a private channel to share
   details — please don't include exploit details in the discussion itself.

When reporting, please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce it (a minimal example is very helpful)
- Which game/file/workflow is affected (e.g. `docs/chess.html`, a GitHub
  Actions workflow, a dependency, etc.)

## What to Expect

This is a hobby project maintained by one person, so response times may vary,
but reports will be acknowledged as soon as possible. Once a fix is ready, it
will be released through the normal `release-please` versioning flow and
credited in the [Changelog](CHANGELOG.md) unless you'd prefer to stay
anonymous.

## Scope

This policy covers the code in this repository — the terminal games under
`mainfile/`, the browser games under `docs/`, and the CI/CD workflows under
`.github/`. It does not cover third-party dependencies themselves (Pyodide,
`python-chess`, Stockfish, etc.); please report vulnerabilities in those
projects directly to their maintainers, though a heads-up here is still
appreciated so this repo can update pinned versions.
