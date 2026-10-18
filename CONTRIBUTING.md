# Contributing to Fun Red Panda Games

Contributions are welcome, whether that's a fix or addition to an existing game, new trivia questions, or an entirely new game for the collection. Please read the [Code of Conduct](CODE_OF_CONDUCT.md) before you start.

## Table of Contents
- [Ways to Contribute](#ways-to-contribute)
- [Before You Start](#before-you-start)
- [How to Open a Pull Request](#how-to-open-a-pull-request)
- [Naming Your Pull Request](#naming-your-pull-request)
- [Code Style](#code-style)
- [Repository Layout](#repository-layout)
- [Working on Each Part of the Repo](#working-on-each-part-of-the-repo)
- [Adding Questions to The Questions](#adding-questions-to-the-questions)
- [Proposing a New Game](#proposing-a-new-game)
- [Testing Your Changes](#testing-your-changes)
- [Automated Checks](#automated-checks)
- [Reporting Bugs and Suggesting Features](#reporting-bugs-and-suggesting-features)
- [Reporting Security Issues](#reporting-security-issues)
- [License](#license)

## Ways to Contribute

1. Fix a bug or improve an existing game
2. Add new questions to The Questions
3. Improve the website, the docs, or the repo's automation
4. Start creating a new game (needs approval in the discussions tab first)

## Before You Start

- Search the existing [issues](https://github.com/RedPandaGuy1234/FunRedPandaGames/issues) and [discussions](https://github.com/RedPandaGuy1234/FunRedPandaGames/discussions) so you don't duplicate someone else's work.
- For anything bigger than a small fix, open an issue or a discussion first so we can agree on the approach.
- Brand-new games must be approved in the discussions tab before you start building.

## How to Open a Pull Request

If you don't know how, here's how to open a PR:

1. Fork the repo
2. Create a branch on your fork and commit your changes there
3. Push the branch to your fork
4. Open the pull request with the "Compare & pull request" button on GitHub
5. Fill out the pull request template, and give the PR a title that starts with one of the prefixes below

If I haven't approved your PR yet, feel free to reach out and @mention me.

## Naming Your Pull Request

Every pull request title must start with one of these prefixes. The Label Check workflow fails otherwise, and the PR can't be merged until the title is fixed. The prefix also decides how your change shows up in the changelog, which is built automatically by release-please.

| Prefix | Use it for | Changelog section |
| ------ | ---------- | ----------------- |
| `fix:` | Fixing something that's broken | Bug Fixes |
| `feat:` | Starting a new addition | Features |
| `cont:` | Continuing something that's already in progress | Continuations |
| `feat!:` | A major change, like finalizing a new addition | Features (marked as a breaking change) |
| `other:` | Anything else you want mentioned in the next release, like docs or repo maintenance | Other |

For example: `fix: stop the bot from firing at the same cell twice`.

Use `feat!:` sparingly. It marks a breaking change and bumps the major version.

## Code Style

- **Python:** format everything with [Black](https://black.readthedocs.io). Install the repo's dependencies with `pip install -r requirements.txt`, then run `black .` in your terminal before you commit.
- **JavaScript (functions and browser games):** match the style of the file you're editing, including the two-space indentation and double quotes already used in `functions/`.
- **HTML games:** keep each browser game in a single self-contained file, and reuse the existing look (the felt-green background, cream text, and gold buttons) so the games feel like one collection.
- Follow the existing code style for whichever game you're touching.
- Keep each game's files self-contained within its own folder (`mainfile/<Game>/` for the terminal version and `docs/<game>.html` for the browser version), so that it can be moved or deployed on its own.
- Please include tests where applicable.

## Repository Layout

```text
.
├── docs/                 Browser games and the site (served as the website)
├── mainfile/             Terminal versions of the games
├── functions/            Cloudflare Pages Functions (accounts and online rooms)
│   ├── _lib/             Shared auth and room helpers
│   └── api/              API routes
├── schema.sql            D1 database schema
├── requirements.txt      Python dependencies
└── .github/              Workflows, issue and PR templates, Dependabot
```

Pull requests are labeled automatically based on the files they change: `Docs` for anything in `docs/`, `Terminal` for anything in `mainfile/`, and `Github` for anything in `.github/`.

## Working on Each Part of the Repo

**Terminal games (`mainfile/`)**
- Written in plain Python 3. Run a game with `python3 <file>.py` from its folder.
- Terminal Chess depends on the `chess` package, and Normal and Hard difficulty also need the Stockfish engine. See the README for install steps.

**Browser games (`docs/`)**
- The Python games run in the browser with [Pyodide](https://pyodide.org), so the game logic stays as real Python inside the page. If you change a terminal game that has a browser version, check whether the matching `docs/` file needs the same change.
- The Questions is written in JavaScript in a single HTML file.
- Open `docs/index.html` in your browser to test locally.
- Add a card for any new game to `docs/index.html`, and add it to the README as well.

**Backend (`functions/` and `schema.sql`)**
- Accounts and online rooms run on Cloudflare Pages Functions with a Cloudflare D1 database bound as `DB`.
- These features only work on the live site, not when you open the HTML files locally.
- If you change the database, update `schema.sql` in the same pull request.
- Keep the existing safety checks on every endpoint: the same-origin check, input validation, and size limits. Never store or log plain-text passwords.

## Adding Questions to The Questions

Questions live in the `BANK` object in `docs/thequestions.html`, grouped by category: `geo`, `hist`, `sci`, `ent`, `sport`, and `art`. There are three formats:

- **Open answer** is a pair of strings: the question, then the answer. These are only used when playing on one device, because the other players judge the answer out loud.
- **Multiple choice** is an object with the question, a list of choices, and the index of the correct choice, counting from 0.
- **True or false** is a multiple-choice object whose question starts with "True or False:" and whose choices are `"True"` and `"False"`.

Guidelines:
- Online rooms only use multiple-choice and true/false questions, so those are the most useful additions.
- Make sure the answer is correct and not likely to change over time.
- Avoid duplicates. Search the file before adding a question.
- Keep each question clear and to one fact.
- Put the new question in the right category.

## Proposing a New Game

1. Open a discussion in the discussions tab describing the game, whether it's solo or multiplayer, and whether it will have a terminal version, a browser version, or both.
2. Wait for approval before you start building.
3. Once approved, keep the game self-contained in its own folder and add a browser version in `docs/` if it fits.
4. Add a card to `docs/index.html` and a section to the README.
5. Use `feat:` for the first pull request, `cont:` for follow-ups, and `feat!:` for the one that finalizes the game.

## Testing Your Changes

Before you open a pull request, please check that:

- You ran `black .` on any Python files you touched.
- Terminal games run start to finish without errors.
- Browser games load and play through in a browser. For the Pyodide games, open the page's console and make sure there are no errors.
- If you changed the menu or navigation, every link on `docs/index.html` still works.
- If you changed `functions/` or `schema.sql`, you tested it against a D1 database, or you've said in the pull request that you couldn't.
- In the opened pull request, Cloudflare will have written a comment with a link to test out your changes, so you have used this link and made sure that the changes are successful.

## Automated Checks

These run on pull requests, and some on a schedule:

- **Label Check:** fails if the PR title doesn't start with an allowed prefix.
- **Labeler:** adds `Docs`, `Github`, or `Terminal` labels automatically.
- **CodeQL and Bandit:** scan the Python code for security problems.
- **CI and Dependency Check:** run only when the repo has a `package.json`.
- **Dependabot:** opens weekly pull requests for Python package and GitHub Actions updates.
- **release-please:** builds the changelog and version numbers after changes are merged into `main`.

## Reporting Bugs and Suggesting Features

Use the issue templates on GitHub: Bug, Feature, or Enhancement. For questions and ideas, use the [discussions tab](https://github.com/RedPandaGuy1234/FunRedPandaGames/discussions).

## Reporting Security Issues

Please don't open a public issue for a vulnerability. Follow the steps in [SECURITY.md](SECURITY.md) instead.

## License

By contributing, you agree that your contributions will be released under the repo's [GPL-3.0 License](LICENSE).
