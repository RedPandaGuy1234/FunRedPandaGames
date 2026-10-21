import random

import chess
import chess.engine

DIFFICULTY_LEVELS = {
    "normal": 1400,
    "hard": 2000,
}
STOCKFISH_PATH = "stockfish"

PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 0,
}


def new_game():
    return chess.Board()


def make_move(board: chess.Board, move_uci: str) -> bool:
    try:
        move = chess.Move.from_uci(move_uci)
        if move in board.legal_moves:
            board.push(move)
            return True
        return False
    except ValueError:
        return False


def get_game_over_message(board: chess.Board) -> str:
    if board.is_checkmate():
        winner = "Black" if board.turn == chess.WHITE else "White"
        return f"Checkmate! {winner} wins."
    if board.is_stalemate():
        return "Stalemate! The game is a draw."
    if board.is_insufficient_material():
        return "Draw by insufficient material."
    if board.is_seventyfive_moves():
        return "Draw by the 75-move rule."
    if board.can_claim_threefold_repetition():
        return "Draw by threefold repetition."
    return "The game has ended in a draw."


def start_engine(path: str = STOCKFISH_PATH) -> chess.engine.SimpleEngine:
    """Launch Stockfish as a subprocess and open a UCI connection to it.

    Raises FileNotFoundError if the `stockfish` binary isn't on PATH.
    """
    return chess.engine.SimpleEngine.popen_uci(path)


def choose_bot_move(
    engine: chess.engine.SimpleEngine,
    board: chess.Board,
    elo: int,
    think_time: float = 1.0,
) -> chess.Move:

    engine.configure({"UCI_LimitStrength": True, "UCI_Elo": elo})
    result = engine.play(board, chess.engine.Limit(time=think_time))
    return result.move


def evaluate_board(board: chess.Board) -> int:
    if board.is_checkmate():
        return -100000 if board.turn == chess.WHITE else 100000
    value = 0
    for piece_type in PIECE_VALUES:
        value += len(board.pieces(piece_type, chess.WHITE)) * PIECE_VALUES[piece_type]
        value -= len(board.pieces(piece_type, chess.BLACK)) * PIECE_VALUES[piece_type]
    return value


def minimax(
    board: chess.Board,
    depth: int,
    alpha: float,
    beta: float,
    maximizing: bool,
) -> float:
    if depth == 0 or board.is_game_over():
        return evaluate_board(board)

    if maximizing:
        best = -float("inf")
        for move in board.legal_moves:
            board.push(move)
            best = max(best, minimax(board, depth - 1, alpha, beta, False))
            board.pop()
            alpha = max(alpha, best)
            if beta <= alpha:
                break
        return best

    best = float("inf")
    for move in board.legal_moves:
        board.push(move)
        best = min(best, minimax(board, depth - 1, alpha, beta, True))
        board.pop()
        beta = min(beta, best)
        if beta <= alpha:
            break
    return best


def choose_minimax_move(
    board: chess.Board,
    depth: int = 1,
    blunder_chance: float = 0.35,
) -> chess.Move:
    legal_moves = list(board.legal_moves)

    if random.random() < blunder_chance:
        return random.choice(legal_moves)

    maximizing = board.turn == chess.WHITE
    best_move = legal_moves[0]
    best_value = -float("inf") if maximizing else float("inf")

    for move in legal_moves:
        board.push(move)
        value = minimax(board, depth, -float("inf"), float("inf"), not maximizing)
        board.pop()
        value += random.uniform(-30, 30)

        if maximizing and value > best_value:
            best_value = value
            best_move = move
        elif not maximizing and value < best_value:
            best_value = value
            best_move = move

    return best_move


def choose_difficulty() -> str:
    choice = (
        input(
            "Choose a difficulty — Easy (~600 elo, no Stockfish needed), "
            "Normal (~1400 elo), or Hard (~2000 elo)? (e/n/h): "
        )
        .strip()
        .lower()
    )
    if choice == "e":
        return "easy"
    if choice == "h":
        return "hard"
    return "normal"


def choose_bot_color() -> bool:
    choice = (
        input("Should the bot play White, Black, or Random? (w/b/r): ").strip().lower()
    )
    if choice == "w":
        return chess.WHITE
    if choice == "b":
        return chess.BLACK
    return random.choice([chess.WHITE, chess.BLACK])


def bot_wants_draw(
    engine: chess.engine.SimpleEngine,
    board: chess.Board,
    bot_color: bool,
    think_time: float = 1.0,
) -> bool:
    info = engine.analyse(board, chess.engine.Limit(time=think_time))
    score = info["score"].pov(bot_color).score(mate_score=100000)
    if score is None:
        return False
    return score <= 50


def easy_bot_wants_draw(board: chess.Board, bot_color: bool) -> bool:
    material = evaluate_board(board)
    score = material if bot_color == chess.WHITE else -material
    return score <= 100


def play_game():
    board = new_game()

    print("Welcome to Chess! Enter moves in UCI format (e.g. e2e4).")
    print("Type 'quit' to exit, 'resign' to resign, or 'draw' to offer a draw.\n")

    bot_color = None
    bot_difficulty = None
    engine = None

    play_bot = input("Play against the bot? (y/n): ").strip().lower()
    if play_bot == "y":
        bot_color = choose_bot_color()
        bot_difficulty = choose_difficulty()

        if bot_difficulty != "easy":
            try:
                engine = start_engine()
            except FileNotFoundError:
                print(
                    "\nCouldn't find the Stockfish engine on your PATH. See the "
                    "README for install instructions for your OS. Continuing as "
                    "a human vs. human game instead.\n"
                )
                bot_color = None
                bot_difficulty = None

    try:
        while not board.is_game_over(claim_draw=True):
            print(board)
            turn_name = "White" if board.turn == chess.WHITE else "Black"
            print(f"\n{turn_name} to move.")

            if bot_color is not None and board.turn == bot_color:
                if bot_difficulty == "easy":
                    bot_move = choose_minimax_move(board)
                else:
                    elo = DIFFICULTY_LEVELS[bot_difficulty]
                    bot_move = choose_bot_move(engine, board, elo)
                print(f"Bot plays: {bot_move.uci()}\n")
                board.push(bot_move)
                continue

            move_uci = input("Enter your move: ").strip()

            if move_uci.lower() == "quit":
                print("Thanks for playing!")
                return

            if move_uci.lower() == "resign":
                winner = "Black" if board.turn == chess.WHITE else "White"
                print(f"\n{turn_name} resigns. {winner} wins!")
                return

            if move_uci.lower() == "draw":
                if bot_color is not None:
                    opponent_color = not board.turn
                    if bot_difficulty == "easy":
                        wants_draw = easy_bot_wants_draw(board, opponent_color)
                    else:
                        wants_draw = bot_wants_draw(engine, board, opponent_color)
                    if wants_draw:
                        print("\nThe bot accepts your draw offer. The game is a draw.")
                        return
                    print("The bot declines your draw offer.\n")
                    continue
                accept = (
                    input("Does the other player accept the draw? (y/n): ")
                    .strip()
                    .lower()
                )
                if accept == "y":
                    print("\nDraw agreed. The game is a draw.")
                    return
                print("Draw declined.\n")
                continue

            if make_move(board, move_uci):
                print()
            else:
                print("That's not a legal move. Please try again (e.g. e2e4).\n")

        print(board)
        print(f"\n{get_game_over_message(board)}")
    finally:
        if engine is not None:
            engine.quit()


def main():
    play_game()


if __name__ == "__main__":
    main()
