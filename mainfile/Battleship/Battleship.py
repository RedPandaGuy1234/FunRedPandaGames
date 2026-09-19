import random
import sys

COLS = "ABCDEFGHIJ"

SHIPS = [
    ("patrol", "Patrol Boat", 2),
    ("destroyer", "Destroyer", 3),
    ("submarine", "Submarine", 3),
    ("battleship", "Battleship", 4),
    ("carrier", "Carrier", 5),
]


def make_empty_board():
    return [[None for _ in range(10)] for _ in range(10)]


def parse_cell(cell_str):
    cell_str = cell_str.strip().upper()
    if len(cell_str) < 2:
        return None
    col = cell_str[0]
    if col not in COLS:
        return None
    row_part = cell_str[1:]
    if not row_part.isdigit():
        return None
    row = int(row_part)
    if not (1 <= row <= 10):
        return None
    return (COLS.index(col), row - 1)


def cells_between(c1, r1, c2, r2, length):
    if r1 == r2 and abs(c1 - c2) == length - 1:
        step = 1 if c2 > c1 else -1
        return [(c1 + step * i, r1) for i in range(length)]
    if c1 == c2 and abs(r1 - r2) == length - 1:
        step = 1 if r2 > r1 else -1
        return [(c1, r1 + step * i) for i in range(length)]
    return None


def is_valid_placement(cells, board):
    for c, r in cells:
        if not (0 <= c < 10 and 0 <= r < 10):
            return False
        if board[r][c] is not None:
            return False
    return True


def place_ship_cells(board, ships, ship_id, cells):
    for c, r in cells:
        board[r][c] = ship_id
    ships[ship_id] = set(cells)


def random_place_all(board, ships):
    for ship_id, name, length in SHIPS:
        placed = False
        while not placed:
            horizontal = random.choice([True, False])
            if horizontal:
                r = random.randint(0, 9)
                c = random.randint(0, 10 - length)
                cells = [(c + i, r) for i in range(length)]
            else:
                c = random.randint(0, 9)
                r = random.randint(0, 10 - length)
                cells = [(c, r + i) for i in range(length)]
            if is_valid_placement(cells, board):
                place_ship_cells(board, ships, ship_id, cells)
                placed = True


def prompt_ship_placement(board, ships, ship_id, name, length):
    print(f"\nPlace your {name} ({length} cells).")
    while True:
        first_input = input(f"Enter the first coordinate for the {name} (e.g. E4): ")
        first = parse_cell(first_input)
        if first is None:
            print(
                "That wasn't a valid coordinate. Use a letter A-J followed by a number 1-10."
            )
            continue
        c1, r1 = first
        if board[r1][c1] is not None:
            print("That cell is already occupied by another ship. Choose another.")
            continue
        break

    while True:
        second_input = input(
            f"Enter the other end of the {name} ({length - 1} cell(s) away, same row or column): "
        )
        second = parse_cell(second_input)
        if second is None:
            print(
                "That wasn't a valid coordinate. Use a letter A-J followed by a number 1-10."
            )
            continue
        c2, r2 = second
        cells = cells_between(c1, r1, c2, r2, length)
        if cells is None:
            print(
                f"That doesn't line up as a {length}-cell ship. Pick a coordinate in the "
                f"same row or column as {first_input.strip().upper()}, exactly {length - 1} away."
            )
            continue
        if not is_valid_placement(cells, board):
            print(
                "That placement overlaps another ship or goes off the board. Try again."
            )
            continue
        place_ship_cells(board, ships, ship_id, cells)
        break


def place_all_player_ships():
    board = make_empty_board()
    ships = {}
    choice = input("Randomize your fleet automatically? (y/n): ").strip().lower()
    if choice == "y":
        random_place_all(board, ships)
        print("Your fleet has been placed randomly.")
        return board, ships
    for ship_id, name, length in SHIPS:
        prompt_ship_placement(board, ships, ship_id, name, length)
    return board, ships


def ship_at(ships, c, r):
    for ship_id, cells in ships.items():
        if (c, r) in cells:
            return ship_id
    return None


def ship_name(ship_id):
    for sid, name, length in SHIPS:
        if sid == ship_id:
            return name
    return ship_id


def all_sunk(ships, shots):
    for ship_id, cells in ships.items():
        if not cells.issubset(shots):
            return False
    return True


def print_board(board, ships, shots, reveal):
    header = "   " + "  ".join(COLS)
    print(header)
    for r in range(10):
        row_cells = []
        for c in range(10):
            occupied = board[r][c] is not None
            shot = (c, r) in shots
            if occupied and shot:
                row_cells.append("X")
            elif shot:
                row_cells.append("O")
            elif occupied and reveal:
                row_cells.append("S")
            else:
                row_cells.append(".")
        row_label = f"{r + 1:>2}"
        print(f"{row_label} " + "  ".join(row_cells))


def print_ship_status(title, ships, shots):
    print(f"\n{title}:")
    for ship_id, name, length in SHIPS:
        if ship_id not in ships:
            continue
        sunk = ships[ship_id].issubset(shots)
        print(f"  {'[SUNK]' if sunk else '[    ]'} {name}")


def add_hunt_targets(hunt_queue, shots, c, r):
    for dc, dr in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
        nc, nr = c + dc, r + dr
        if (
            0 <= nc < 10
            and 0 <= nr < 10
            and (nc, nr) not in shots
            and (nc, nr) not in hunt_queue
        ):
            hunt_queue.append((nc, nr))


def recompute_hunt_queue(hunt_queue, shots, active_hits):
    """Once two or more hits on the same ship are known, only keep hunt
    targets that continue along the ship's revealed orientation — a real
    ship can't bend, so cells off that line are never worth trying."""
    if not active_hits:
        return
    if len(active_hits) == 1:
        c, r = active_hits[0]
        add_hunt_targets(hunt_queue, shots, c, r)
        return

    rows = set(r for c, r in active_hits)
    cols = set(c for c, r in active_hits)
    candidates = []
    if len(rows) == 1:
        r = next(iter(rows))
        cs = [c for c, _ in active_hits]
        candidates = [(min(cs) - 1, r), (max(cs) + 1, r)]
    elif len(cols) == 1:
        c = next(iter(cols))
        rs = [rr for _, rr in active_hits]
        candidates = [(c, min(rs) - 1), (c, max(rs) + 1)]

    hunt_queue[:] = [
        (nc, nr)
        for nc, nr in candidates
        if 0 <= nc < 10 and 0 <= nr < 10 and (nc, nr) not in shots
    ]


def choose_bot_shot(hunt_queue, shots):
    while hunt_queue:
        c, r = hunt_queue.pop(0)
        if (c, r) not in shots:
            return (c, r)
    while True:
        c = random.randint(0, 9)
        r = random.randint(0, 9)
        if (c, r) not in shots:
            return (c, r)


def player_turn(bot_board, bot_ships, player_shots):
    while True:
        cell_input = input("\nEnter a coordinate to fire at (e.g. E4): ")
        parsed = parse_cell(cell_input)
        if parsed is None:
            print(
                "That wasn't a valid coordinate. Use a letter A-J followed by a number 1-10."
            )
            continue
        c, r = parsed
        if (c, r) in player_shots:
            print("You already fired there. Choose another cell.")
            continue
        break

    player_shots.add((c, r))
    hit_ship = ship_at(bot_ships, c, r)
    if hit_ship:
        cells = bot_ships[hit_ship]
        if cells.issubset(player_shots):
            print(f"Hit! You sank the enemy {ship_name(hit_ship)}!")
        else:
            print("Hit!")
    else:
        print("Miss.")

    return all_sunk(bot_ships, player_shots)


def bot_turn(
    player_board, player_ships, bot_shots, hunt_queue, active_hits, hunting_ship
):
    c, r = choose_bot_shot(hunt_queue, bot_shots)
    bot_shots.add((c, r))
    col_letter = COLS[c]
    row_num = r + 1
    hit_ship = ship_at(player_ships, c, r)
    if hit_ship:
        cells = player_ships[hit_ship]

        if hunting_ship["id"] != hit_ship:
            # A different ship than the one we were tracking — start a
            # fresh hit cluster so orientation is computed for this ship.
            active_hits.clear()
            hunting_ship["id"] = hit_ship
        active_hits.append((c, r))

        if cells.issubset(bot_shots):
            print(
                f"The enemy fires at {col_letter}{row_num} — hit, and they sank your {ship_name(hit_ship)}!"
            )
            hunt_queue[:] = [t for t in hunt_queue if t not in cells]
            active_hits.clear()
            hunting_ship["id"] = None
        else:
            print(f"The enemy fires at {col_letter}{row_num} — hit!")
            recompute_hunt_queue(hunt_queue, bot_shots, active_hits)
    else:
        print(f"The enemy fires at {col_letter}{row_num} — miss.")

    return all_sunk(player_ships, bot_shots)


def pass_device(prompt):
    """Blank the scrollback with newlines and wait for the next player to
    confirm they're the one now looking at the screen."""
    print("\n" * 40)
    input(prompt)
    print("\n" * 40)


def choose_game_mode():
    choice = (
        input("Play against the bot, or two-player pass-and-play? (b/t): ")
        .strip()
        .lower()
    )
    if choice == "t":
        return "two_player"
    return "bot"


def play_bot_game():
    player_board, player_ships = place_all_player_ships()

    bot_board = make_empty_board()
    bot_ships = {}
    random_place_all(bot_board, bot_ships)

    player_shots = set()
    bot_shots = set()
    hunt_queue = []
    active_hits = []
    hunting_ship = {"id": None}

    while True:
        print("\nYour Fleet:")
        print_board(player_board, player_ships, bot_shots, reveal=True)
        print("\nEnemy Waters:")
        print_board(bot_board, bot_ships, player_shots, reveal=False)
        print_ship_status("Your Fleet Status", player_ships, bot_shots)
        print_ship_status("Enemy Fleet Status", bot_ships, player_shots)

        player_won = player_turn(bot_board, bot_ships, player_shots)
        if player_won:
            print("\nYou sank the entire enemy fleet! You win!")
            break

        bot_won = bot_turn(
            player_board, player_ships, bot_shots, hunt_queue, active_hits, hunting_ship
        )
        if bot_won:
            print("\nYour fleet has been destroyed. The enemy wins.")
            break

    print("\nFinal boards:")
    print("\nYour Fleet:")
    print_board(player_board, player_ships, bot_shots, reveal=True)
    print("\nEnemy Waters:")
    print_board(bot_board, bot_ships, player_shots, reveal=True)
    print_ship_status("Your Fleet Status", player_ships, bot_shots)
    print_ship_status("Enemy Fleet Status", bot_ships, player_shots)


def play_two_player_game():
    print("Two-player Battleship! Pass the device between turns.\n")

    print("Player 1, place your fleet.")
    player1_board, player1_ships = place_all_player_ships()

    pass_device(
        "\nPlayer 1's fleet is set. Pass the device to Player 2, then press Enter to continue."
    )

    print("Player 2, place your fleet.")
    player2_board, player2_ships = place_all_player_ships()

    pass_device(
        "\nPlayer 2's fleet is set. Pass the device to Player 1, then press Enter to begin the battle."
    )

    player1_shots = set()  # shots fired by player 1 onto player 2's board
    player2_shots = set()  # shots fired by player 2 onto player 1's board
    current = 1

    while True:
        if current == 1:
            print("Player 1's turn.\n")
            print("Your Fleet:")
            print_board(player1_board, player1_ships, player2_shots, reveal=True)
            print("\nOpponent's Waters:")
            print_board(player2_board, player2_ships, player1_shots, reveal=False)
            print_ship_status("Your Fleet Status", player1_ships, player2_shots)
            print_ship_status("Opponent's Fleet Status", player2_ships, player1_shots)

            won = player_turn(player2_board, player2_ships, player1_shots)
            if won:
                pass_device(
                    "\nPlayer 1 sank the entire enemy fleet and wins! Press Enter to see the final boards."
                )
                break
            next_player = 2
        else:
            print("Player 2's turn.\n")
            print("Your Fleet:")
            print_board(player2_board, player2_ships, player1_shots, reveal=True)
            print("\nOpponent's Waters:")
            print_board(player1_board, player1_ships, player2_shots, reveal=False)
            print_ship_status("Your Fleet Status", player2_ships, player1_shots)
            print_ship_status("Opponent's Fleet Status", player1_ships, player2_shots)

            won = player_turn(player1_board, player1_ships, player2_shots)
            if won:
                pass_device(
                    "\nPlayer 2 sank the entire enemy fleet and wins! Press Enter to see the final boards."
                )
                break
            next_player = 1

        pass_device(
            f"\nEnd of turn. Pass the device to Player {next_player}, then press Enter to continue."
        )
        current = next_player

    print("\nFinal boards:")
    print("\nPlayer 1's Fleet:")
    print_board(player1_board, player1_ships, player2_shots, reveal=True)
    print("\nPlayer 2's Fleet:")
    print_board(player2_board, player2_ships, player1_shots, reveal=True)
    print_ship_status("Player 1 Fleet Status", player1_ships, player2_shots)
    print_ship_status("Player 2 Fleet Status", player2_ships, player1_shots)


def play_game():
    print("Welcome to Battleship!\n")
    mode = choose_game_mode()

    if mode == "two_player":
        play_two_player_game()
    else:
        play_bot_game()


if __name__ == "__main__":
    play_game()
    sys.exit()
