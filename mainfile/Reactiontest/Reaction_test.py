import random
import time
import sys

how_long = random.randint(1, 30)
input(
    "Hello! This will test your reaction time! Press enter to start, and then enter once I say 'NOW!'"
)
time.sleep(how_long)
start = time.time()
input("NOW!")
end = time.time()

time_take = end - start
print(
    f"It took you {time_take} seconds to react, after waiting for {how_long} seconds! Goodbye!"
)
sys.exit()
