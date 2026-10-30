# Fun Red Panda Games

<p align="center">
  <img src="docs/favicon.svg" width="160" height="160" alt="Fun Red Panda Games logo">
</p>

A small collection of games, built by me, and hopefully you too. This repo started as a single Python Battleship implementation to play and has grown into a home for multiple games, a browser site, leaderboards, optional accounts, and online rooms.

**Play in your browser:** [funredpandagames.com](https://funredpandagames.com)

## Table of Contents
- [Playing in Your Browser](#playing-in-your-browser)
- [Accounts and Online Play](#accounts-and-online-play)
- [Games in This Repo](#games-in-this-repo)
  - [Battleship](#battleship)
  - [The Questions](#the-questions)
  - [Number Guesser](#number-guesser)
  - [Chess](#chess)
  - [Reaction Test](#reaction-test)
  - [Bamboo Bonk](#bamboo-bonk)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Installation](#installation)
- [Hosting and Deployment](#hosting-and-deployment)
- [Repository Automation](#repository-automation)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Credits](#credits)
- [Contact](#contact)

## Playing in Your Browser

Battleship, Number Guesser, Chess, and Reaction Test all have browser versions in the `docs/` folder, alongside the original terminal versions in `mainfile/`. The Questions and Bamboo Bonk have only ever lived in the browser.

The browser versions of the Python games run entirely client-side using [Pyodide](https://pyodide.org) (Python compiled to WebAssembly), so the game logic runs as real Python inside the page. The Questions and Bamboo Bonk are written in JavaScript.

The live site at [funredpandagames.com](https://funredpandagames.com) is the full experience. Accounts, leaderboards, and online rooms need the site's backend, so they only work there. Every game except those features also works when you open the files locally.

**To test the browser versions locally**, run:

```bash
cd docs
open index.html
```

This lets you pick any game and play it locally in your browser. If you can't open a browser, you can still play the terminal versions (except The Questions and Bamboo Bonk).

## Accounts and Online Play

The live site has features that need its backend, a set of Cloudflare Pages Functions in `functions/` backed by a Cloudflare D1 database.

**Accounts**
- Create an account or log in from the button in the top right of the game menu, which opens `account.html`. Once you're logged in, the button shows your username.
- Usernames are 3-20 characters (letters, numbers, and underscores). Passwords are 8-128 characters.
- Passwords are salted and hashed with PBKDF2 (SHA-256) and never stored in plain text. Sessions use an HttpOnly cookie and last 30 days.
- Your username is used to pre-fill your name when you create or join an online room.

**Leaderboards (Reaction Test and Bamboo Bonk)**
- You need to be logged in to save a score and to see the leaderboard, so nobody can post a score under someone else's name.
- Each account keeps one best score. A new score only replaces it if it's better.
- Bamboo Bonk has separate mobile and desktop leaderboards, because tapping a screen is faster than clicking with a mouse. The game picks the right one from your device, and you can have a score on both by logging in on both.
- The top three are shown on a podium, with everyone else listed below.

**Online rooms (The Questions)**
- Create a room to get a 5-character code, then share it with up to four friends.
- The host sets the number of bots, Hard Mode, and Play to Last Place, then starts the game once at least two humans have joined.
- Games stay in sync by polling the server, and the host's browser runs the bots' turns.
- Online rooms only use multiple-choice and true/false questions, so nobody needs to judge answers out loud.
- Rooms are deleted after 24 hours of inactivity, and a game can only be joined while the room is still in the lobby.

**Online rooms (Chess)**
- Pick Online on the Chess page, then create a room to get a 5-character code, or join a friend's room with theirs.
- Rooms hold two players. The game starts as soon as the second player joins, and colors are assigned at random.
- The server checks every move against the rules of chess, so a modified browser can't make illegal moves. Check, checkmate, stalemate, insufficient material, threefold repetition, and the 75-move rule all end the game automatically.
- Either player can resign or offer a draw. The other player can accept or decline.
- After a game ends, either player can start a rematch, and the colors swap.
- Games stay in sync by polling the server. Rooms are deleted after 24 hours of inactivity or when a player leaves.

## Games in This Repo

### Battleship
Classic Battleship, playable in your terminal or your browser, against a bot or in two-player pass-and-play.

**Features**
- Classic Battleship gameplay (place ships, call shots, sink the enemy fleet)
- Single-player mode vs. a bot opponent that hunts adjacent cells once it lands a hit, then follows the ship's orientation instead of firing blindly
- Two-player pass-and-play mode, with a screen that hides your fleet while the device is passed
- Per-ship status lists showing which ships are afloat or sunk
- Coordinate-based input/clicks with validation
- A "Randomize My Fleet" option for instant setup, in both the terminal and browser versions

**Run it in your terminal**

```bash
cd mainfile/Battleship
python3 Battleship.py
```

**Gameplay basics**
- Board coordinates use letters for columns and numbers for rows (e.g., A1, B7).
- Ship sizes: Carrier (5), Battleship (4), Destroyer (3), Submarine (3), and Patrol Boat (2).
- Fire at a coordinate; the game reports Hit, Miss, or Sunk.
- Win by sinking every ship in the opposing fleet.

### The Questions
A browser-based trivia game for 2-5 players (any mix of humans and bots, so you can play solo against computer opponents), inspired by classic wedge-collecting trivia board games. You can play on one device or online with friends in a room.

**Features**
- A 36-space board with six trivia categories: Geography, History, Science, Entertainment, Sports, and Arts & Words
- Roll a die, choose a direction, and answer whatever category you land on
- Open-answer, multiple-choice, and true/false question formats
- A "deciding question" mechanic: once you've collected all six wedges, the other players choose your final category
- 2-5 players, including any mix of human and bot players
- Optional Hard Mode: missing a question in a category you've already won costs you that wedge
- Optional Play to Last Place mode: keep playing until everyone but one player has finished
- Two ways to play: "On this device" (pass the device around, all question formats) and "Online" (rooms with codes, multiple-choice and true/false only)

**Play it**

```bash
cd docs
open thequestions.html
```

Local play works offline. Online rooms need the live site.

### Number Guesser
A simple guessing game where you try to guess a randomly selected number within a range you choose. Playable in your terminal or your browser.

**Features**
- Simple number guessing mechanics
- Feedback on each guess (too high, too low, or correct)
- Adjustable range
- Replay functionality in the browser version

**Run it in your terminal**

```bash
cd mainfile/NumberGuesser
python3 Creator.py
```

### Chess
A chess game built on [python-chess](https://github.com/niklasf/python-chess) (a huge thanks to them), handling move legality, board state, and game rules. It includes an optional computer opponent, and the browser version also has online rooms for playing a friend.

**Features**
- Full standard chess rules via `python-chess` (legal move generation, check/checkmate detection, castling, en passant, promotion)
- Play moves by typing (terminal) or clicking (browser). In the terminal, enter the square a piece is on and the square it's moving to (e.g. e2e4). Castling is entered the same way, by moving the king two squares toward the rook.
- Resign at any time, or offer a draw
- Optional bot opponent, choice of color (White, Black, or Random), and difficulty level
- Browser only: an Online mode with rooms and codes, so you can play a friend on a different device (see [Accounts and Online Play](#accounts-and-online-play))

**A note on difficulty (the terminal and browser versions work differently):**
- **Terminal version:** Easy is a lightweight built-in minimax bot (~600 elo, no external dependencies). Normal (~1400 elo) and Hard (~2000 elo) hand off to the [Stockfish](https://stockfishchess.org) engine.
- **Browser version:** since a browser can't launch an external engine process, all three difficulties (Easy, Normal, Hard) are the same homemade minimax bot at increasing search depth and decreasing blunder chance.
- The browser version currently always promotes pawns to a queen; underpromotion isn't supported.

**A note on online chess:** online rooms don't use `python-chess`. The server runs its own small JavaScript rules engine in `functions/_lib/chess.js` to check moves, and like the rest of the browser version it always promotes pawns to a queen. Online rooms only work on the live site.

**Run it in your terminal**

```bash
cd mainfile/Chess
python3 board.py
```

When you start the terminal game, you'll be asked whether you want to play against the bot, which color it should play (or Random), and which difficulty level (Easy, Normal, or Hard). **Only the Normal and Hard levels need Stockfish.** If it isn't installed, the game tells you and continues as a human vs. human game.

#### Installing Stockfish
*(terminal Chess only; the browser version doesn't need this)*

**macOS**

```bash
brew install stockfish
```

**Windows**

```bash
winget install Stockfish.Stockfish
```

Or download the executable from [stockfishchess.org/download](https://stockfishchess.org/download/) and either add it to your PATH or point `STOCKFISH_PATH` in `mainfile/Chess/board.py` at the full path of the executable.

**Linux (Debian/Ubuntu)**

```bash
sudo apt install stockfish
```

**Linux (Fedora)**

```bash
sudo dnf install stockfish
```

**Linux (Arch)**

```bash
sudo pacman -S stockfish
```

**Any OS, manual install**

Download a prebuilt binary from [stockfishchess.org/download](https://stockfishchess.org/download/), unzip it, and either add it to your PATH or set `STOCKFISH_PATH` in `mainfile/Chess/board.py` to its full path.

### Reaction Test
A quick game that measures how fast your reflexes are, in your terminal or your browser. It waits a random amount of time (1-30 seconds), tells you to go, then reports how long it took you to react.

**Features**
- Random wait time before the "go" signal
- Measures and reports your reaction time
- The browser version tells you if you clicked too soon
- Simple, single-run gameplay

**Run it in your terminal**

```bash
cd mainfile/Reactiontest
python3 Reaction_test.py
```

### Bamboo Bonk
A solo browser game with a leaderboard. Snow leopards pop out of the bamboo grove and duck back down fast. A red panda on the right side of the page swings its bamboo wherever you click or tap, so bonk as many as you can in 30 seconds, then try to beat your best score. Bamboo Bonk is written in JavaScript and only lives in the browser, so there is no terminal version.

**Features**
- A 3x3 grove of holes and a 30-second round
- Every critter is a snow leopard, and they all look the same. Most are worth 1 point, but a random few are secretly faster, hide sooner, and are worth 3 points
- A red panda holding bamboo that whacks wherever you click or tap on the page, and lands a bonk when it hits a snow leopard
- Snow leopards pop up faster and hide sooner as the round goes on
- Works with a mouse or a touchscreen
- Separate mobile and desktop leaderboards, chosen automatically from your device, each with a top-three podium and one best score per account (see [Accounts and Online Play](#accounts-and-online-play))

**Play it**

```bash
cd docs
open bamboobonk.html
```

The game works offline. Saving scores and seeing the leaderboard need the live site and an account.

## Project Structure

```text
.
├── docs/                 Browser games and the site (served as the website)
│   ├── index.html        Game menu
│   ├── account.html      Log in / create account
│   ├── bamboobonk.html
│   ├── battleship.html
│   ├── chess.html
│   ├── numberguesser.html
│   ├── reactiontest.html
│   ├── thequestions.html
│   └── favicon.svg
├── mainfile/             Terminal versions of the games
│   ├── Battleship/
│   ├── Chess/
│   ├── NumberGuesser/
│   └── Reactiontest/
├── functions/            Cloudflare Pages Functions (backend)
│   ├── _lib/             Shared auth, room, and chess rules helpers
│   └── api/              Account, leaderboard, and room endpoints
├── schema.sql            D1 database schema
├── requirements.txt      Python dependencies (terminal Ch)ck)
└── .github/              Workflows, issue and PR templates, Dependabot
```

## Requirements
- **Browser versions (Battleship, The Questions, Number Guesser, Chess, Reaction Test, Bamboo Bonk):** any modern web browser. No installs required. The first load of the Python games fetches the Pyodide runtime (and, for Chess, the `chess` package), so they need an internet connection.
- **Accounts, leaderboards, and online rooms (including online Chess):** the live site at [funredpandagames.com](https://funredpandagames.com) and a secure (https) connection.
- **Terminal Battleship:** Python 3 or newer, and a terminal
- **Terminal Number Guesser:** Python 3 or newer, and a terminal
- **Terminal Chess:** Python 3 or newer, and the `chess` package (see [Installation](#installation)). The [Stockfish](https://stockfishchess.org/download/) engine is only needed for Normal/Hard bot difficulty.
- **Terminal Reaction Test:** Python 3 or newer, and a terminal

## Installation

**To play in your browser**, either visit the live site (link at the top of this README) or clone the repo and open the menu locally:

```bash
git clone https://github.com/RedPandaGuy1234/FunRedPandaGames
cd FunRedPandaGames/docs
open index.html
```

**To play the terminal versions:**

1. Clone the repository:

```bash
git clone https://github.com/RedPandaGuy1234/FunRedPandaGames
```

2. Enter the project directory:

```bash
cd FunRedPandaGames
```

3. Install dependencies (needed for terminal Chess):

```bash
pip install -r requirements.txt
```

4. If you want to play terminal Chess against the bot on Normal or Hard difficulty, also install the Stockfish engine. See [Installing Stockfish](#installing-stockfish). Easy mode works without it.

5. Regularly update it:

```bash
git pull
```

6. Jump into whichever game you want to play. See [Games in This Repo](#games-in-this-repo) above for how to run each one.

## Hosting and Deployment

The site is hosted on Cloudflare Pages at [funredpandagames.com](https://funredpandagames.com) and deployed from GitHub with a Wrangler-based workflow.

- The static site is the `docs/` folder.
- The backend is the `functions/` folder (Pages Functions), which serves the `/api/...` routes for accounts, leaderboards, and online rooms.
- Data (users, sessions, leaderboard scores, and online rooms) lives in a Cloudflare D1 database bound to the functions as `DB`. Its tables are defined in `schema.sql`.

## Repository Automation

- **Releases:** [release-please](https://github.com/googleapis/release-please) builds the changelog and version numbers from PR titles. See [CHANGELOG.md](CHANGELOG.md).
- **PR title check:** a workflow requires PR titles to start with `other:`, `cont:`, `feat:`, `feat!:`, or `fix:`.
- **Labels:** pull requests are labeled automatically (Docs, Github, Terminal) based on the files they change.
- **Security scanning:** CodeQL and Bandit run on pushes, pull requests, and a weekly schedule.
- **Dependencies:** Dependabot checks Python packages and GitHub Actions weekly.
- **CI:** a Node-based CI workflow and a dependency check run when a `package.json` is present.

## Contributing
Please look at the [contributing](CONTRIBUTING.md) document for further details, including how to name your pull request so it shows up in the next release. Please also review our [Code of Conduct](CODE_OF_CONDUCT.md).

## Security
If you find a vulnerability, please don't open a public issue. See [SECURITY.md](SECURITY.md) for how to report it privately.

## License
This project is released under the GPL-3.0 License. See [LICENSE](LICENSE) for details. This license applies repo-wide unless a specific game's folder states otherwise.

## Credits
This project depends on the [python-chess](https://github.com/niklasf/python-chess) library, the [Stockfish](https://github.com/official-stockfish/Stockfish) chess engine, [Pyodide](https://pyodide.org), and [Cloudflare](https://www.cloudflare.com) for hosting.

## Contact
Maintainer: RedPandaGuy1234
GitHub: https://github.com/RedPandaGuy1234
