# Fun Red Panda Games

A small collection of games, built by me, and hopefully you too. This repo started as a single Python Battleship implementation and has grown into a home for multiple games — most of them playable both in your terminal and right in your browser.

**Play in your browser:** https://redpandaguy1234.github.io/Games/

## Table of Contents
- [Playing in Your Browser](#playing-in-your-browser)
- [Games in This Repo](#games-in-this-repo)
  - [Battleship](#battleship)
  - [The Questions](#the-questions)
  - [Number Guesser](#number-guesser)
  - [Chess](#chess)
  - [Reaction Test](#reaction-test)
  - [Wordle (Coming Soon)](#wordle-coming-soon)
- [Requirements](#requirements)
- [Installation](#installation)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Playing in Your Browser

Battleship, Number Guesser, Chess, and Reaction Test all have browser versions in the `docs/` folder, alongside the original terminal versions in `mainfile/`. The Questions has only ever lived in the browser, and its files live in `docs/` too.

The browser versions run entirely client-side using [Pyodide](https://pyodide.org) (Python compiled to WebAssembly) — your actual game logic runs as real Python inside the page, not a JavaScript rewrite. No installation, no Python setup, no server of your own required. (The Questions is the one exception — it's plain HTML/JS with no Pyodide dependency.)

**To test the browser versions locally**, run:
```
cd docs
open index.html
```
This allows you to choose what ever game you want to play locally in your browser. If you do not have a browser, you can play the games (except for The Questions) in your terminal, with instructions on how to do so underneath.  
## Games in This Repo

### Battleship
Classic Battleship, playable in your terminal or your browser, with a bot opponent and local multiplayer support.

**Features**
- Classic Battleship gameplay (place ships, call shots, sink the enemy fleet)
- Single-player mode vs. a bot opponent that hunts adjacent cells once it lands a hit, rather than firing blindly
- Coordinate-based input/clicks with validation
- Browser version includes a "Randomize My Fleet" option for instant setup

**Run it in your terminal**

    cd mainfile/Battleship
    python3 Set_Up_Ships.py

**Gameplay basics**
- Board coordinates use letters for columns and numbers for rows (e.g., A1, B7).
- Ship sizes: Carrier (5), Battleship (4), Destroyer (3), Submarine (3), and Patrol Boat (2).
- Fire at a coordinate; the game reports Hit, Miss, or Sunk.
- Win by sinking every ship in the opposing fleet.

### The Questions
A browser-based trivia game for 1–5 players (or solo against computer opponents), inspired by classic wedge-collecting trivia board games. Runs entirely in a single HTML file — no install required.

**Features**
- A 36-space board with six trivia categories: Geography, History, Science, Entertainment, Sports, and Arts & Words
- Roll a die, choose a direction, and answer whatever category you land on
- Open-answer, multiple-choice, and true/false question formats
- A "deciding question" mechanic — once you've collected all six wedges, the other players choose your final category
- 1–5 player support, including any mix of human and bot players
- Optional Hard Mode: missing a question in a category you've already won costs you that wedge
- Optional Play to Last Place mode: keep playing until everyone but one player has finished

**Play it**
```
cd docs
open The Questions
```

### Number Guesser
A simple guessing game where you try to guess a randomly selected number within a given range. Playable in your terminal or your browser.

**Features**
- Simple number guessing mechanics
- Feedback on each guess (too high, too low, or correct)
- Adjustable range
- Replay functionality

**Run it in your terminal**

    cd mainfile/NumberGuesser
    python3 Creator.py

### Chess
A chess game built on [python-chess](https://github.com/niklasf/python-chess) (a huge thanks to them), handling move legality, board state, and game rules. Includes an optional computer opponent at three difficulty levels.

**Features**
- Full standard chess rules via `python-chess` (legal move generation, check/checkmate detection, castling, en passant, promotion)
- Play moves by typing (terminal) or clicking (browser) the square a piece is on, then the square it's moving to (e.g. e2e4). Castling is entered the same way — move your king two squares toward the rook.
- Resign at any time, or offer a draw
- Optional bot opponent, choice of color (White, Black, or Random), and difficulty level

**A note on difficulty — the terminal and browser versions work differently:**
- **Terminal version:** Easy is a lightweight built-in minimax bot (~600 elo, no external dependencies). Normal (~1400 elo) and Hard (~2000 elo) hand off to the [Stockfish](https://stockfishchess.org/) engine as a separate process.
- **Browser version:** since a browser can't launch an external engine process, all three difficulties (Easy, Normal, Hard) are the same homemade minimax bot at increasing search depth and decreasing blunder chance, with no Stockfish involved. It's a different bot than the terminal's Normal/Hard modes — meaningfully weaker at the top end than real Stockfish play, but fully self-contained and requires no install.
- The browser version currently always promotes pawns to a queen; underpromotion isn't supported.

**Run it in your terminal**

    cd mainfile/Chess
    python3 board.py

When you start the terminal game, you'll be asked whether you want to play against the bot, which color it should play (or Random), and which difficulty level (Easy, Normal, or Hard). **Only the terminal version needs Stockfish installed** — the browser version needs nothing extra. See [Installing Stockfish and OpenSSL](#installing-stockfish-and-openssl) below if you want to play the terminal version's Normal or Hard mode.

#### Installing Stockfish and OpenSSL
*(terminal Chess and terminal Wordle only — the browser versions don't need this)*

**Stockfish**

**macOS**

    brew install stockfish

**Windows**

    winget install Stockfish.Stockfish

Or download the executable from [stockfishchess.org/download](https://stockfishchess.org/download/) and either add it to your PATH or point `STOCKFISH_PATH` in `mainfile/Chess/board.py` at the full path to the `.exe`.

**Linux (Debian/Ubuntu)**

    sudo apt install stockfish

**Linux (Fedora)**

    sudo dnf install stockfish

**Linux (Arch)**

    sudo pacman -S stockfish

**Any OS, manual install**

Download a prebuilt binary from [stockfishchess.org/download](https://stockfishchess.org/download/), unzip it, and either add it to your PATH or set `STOCKFISH_PATH` in `mainfile/Chess/board.py` to the full path of the binary.

**OpenSSL**

The terminal Wordle script depends on `requests` and `urllib3`, which in turn rely on your system having a modern OpenSSL install available to Python. Most systems already have this, but if you hit SSL-related errors when running Wordle, install or update OpenSSL as follows:

**macOS**

    brew install openssl

If you installed Python via Homebrew, it should already link against Homebrew's OpenSSL. If you're using the system Python and still see SSL warnings/errors, consider installing Python via `pyenv` or Homebrew so it picks up a current OpenSSL build.

**Windows**

Most official Python installers for Windows bundle their own OpenSSL, so this is usually a non-issue. If you installed Python from [python.org](https://www.python.org/downloads/) and are still seeing SSL errors, reinstalling the latest Python installer (which bundles a current OpenSSL) typically resolves it.

**Linux (Debian/Ubuntu)**

    sudo apt install openssl libssl-dev

**Linux (Fedora)**

    sudo dnf install openssl openssl-devel

**Linux (Arch)**

    sudo pacman -S openssl

After installing/updating OpenSSL on Linux, you may need to reinstall Python (or rebuild it, if compiled from source) so it picks up the new OpenSSL headers/libraries.

**Any OS, manual install**

Download and build OpenSSL from [openssl.org/source](https://www.openssl.org/source/) if your package manager's version is too old, then reinstall or rebuild Python against it.

### Reaction Test
A quick game that measures how fast your reflexes are, in your terminal or your browser. It waits a random amount of time, tells you to go, then reports how long it took you to react.

**Features**
- Random wait time before the "go" signal
- Measures and reports your reaction time
- Simple, single-run gameplay

**Run it in your terminal**

    cd mainfile/Reactiontest
    python3 Reaction_test

### Wordle (Coming Soon)

🚧 **Not yet playable.** Traditional Wordle is currently in development — the word list files (`Word_Bank.txt` and `Valid_Words.txt`) are in place under `production_stuff/Wordle/`, and word-fetching/validation logic has started, but the core guessing game and win/lose flow aren't implemented yet. There's no browser version planned to start, and the terminal version isn't ready to play. Check back soon, or help build it to make the process quicker!

## Requirements
- **Browser versions (Battleship, The Questions, Number Guesser, Chess, Reaction Test):** any modern web browser. No installs required. First load fetches the Pyodide runtime (and, for Chess, the `python-chess` package), so an internet connection is needed at least once. The Questions has no Pyodide dependency and needs nothing beyond the browser itself.
- **Terminal Battleship:** Python 3 or newer, and a terminal
- **Terminal Number Guesser:** Python 3 or newer, and a terminal
- **Terminal Chess:** Python 3 or newer, and the `chess` package (see [Installation](#installation)). The [Stockfish](https://stockfishchess.org/download/) engine is only needed for Normal/Hard bot difficulty (see [Installing Stockfish and OpenSSL](#installing-stockfish-and-openssl)); Easy mode needs nothing extra.
- **Terminal Reaction Test:** Python 3 or newer, and a terminal
- **Terminal Wordle (coming soon):** Python 3 or newer, OpenSSL (see [Installing Stockfish and OpenSSL](#installing-stockfish-and-openssl)), and a terminal — not yet playable, see the [Wordle](#wordle-coming-soon) section above

## Installation

**To play in your browser**, either visit the live site (link at the top of this README) or clone the repo and use the code mentioned above and here to open the menu and select your game to play.

    git clone https://github.com/RedPandaGuy1234/Games
    cd Games/docs
    open index.html


**To play the terminal versions:**

1. Clone the repository:

       git clone https://github.com/RedPandaGuy1234/Games

2. Enter the project directory:

       cd Games

3. Install dependencies (needed for terminal Chess and terminal Wordle):

       pip install -r requirements.txt

4. If you want to play terminal Chess against the bot on Normal or Hard difficulty, also install the Stockfish engine — see [Installing Stockfish and OpenSSL](#installing-stockfish-and-openssl). Easy mode works without it. If you plan to run the terminal Wordle script once it's ready, make sure OpenSSL is installed too (same section).

5. Regularly update it:

       git pull

6. Jump into whichever game you want to play — see [Games in This Repo](#games-in-this-repo) above for how to run each one.

## License
This project is released under the GPL-3.0 License. See [LICENSE](LICENSE) for details. This license applies repo-wide unless a specific game's folder states otherwise.

## Contributing
Please look at the [contributing](CONTRIBUTING.md) document for further details.

## Credits
This project is dependent on the python-chess library [python-chess](https://github.com/niklasf/python-chess), the [Stockfish](https://github.com/official-stockfish/Stockfish) chess engine, [Pyodide](https://pyodide.org) for running Python in the browser, [wordle-words](https://github.com/seanpatlan/wordle-words) for the Wordle words, and [black](https://github.com/psf/black) for formatting.

## Contact
Maintainer: RedPandaGuy1234
GitHub: https://github.com/RedPandaGuy1234
