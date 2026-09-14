import warnings
warnings.filterwarnings('ignore', message='urllib3 v2 only supports OpenSSL')
import requests
import sys
import random
import urllib3
urllib3.disable_warnings(urllib3.exceptions.NotOpenSSLWarning)

txt_url = "https://raw.githubusercontent.com/RedPandaGuy1234/Games/refs/heads/main/production_stuff/Wordle/Valid_Words.txt"
response = requests.get(txt_url)

if response.status_code == 200:
    Valid_Words = response.text.splitlines()
else:
    Valid_Words = []
    print("This code has failed because the list for valid words did not show up. Please alert RedPandaGuy1234 of this. Thank you!")
    sys.exit(1)

txt_url = "https://raw.githubusercontent.com/RedPandaGuy1234/Games/refs/heads/main/production_stuff/Wordle/Word_Bank.txt"
response = requests.get(txt_url)

if response.status_code == 200:
    Word_bank = response.text.splitlines()
else:
    Word_bank = []
    print("This code has failed because the list for the word bank did not show up. Please alert RedPandaGuy1234 of this. Thank you!")
    sys.exit(1)

allowed_guesses = set(Valid_Words) | set(Word_bank)

Word = Word_bank[random.randint(1, 2314)]
Guess = "This is a filler!"
guesses = 0
is_guess_incorrect = True
character_one = 0
character_two = 0
character_three = 0
character_four = 0
character_five = 0

def guess_word(guesses, Word):
    is_word_valid = False
    if guesses == 6:
        print(f"I'm sorry, but did not guess the word, {Word}, in 6 guesses. Goodbye!")
        sys.exit()
    guesses = guesses + 1
    while not is_word_valid:
        guessed_word = input("Please enter your word, and use all lowercase.")
        if guessed_word not in allowed_guesses:
            print("Sorry, but either you used an uppercase character, it is not in the Valid word bank (this is a limited word bank, and does not have every single five letter word in the world), you typed a space anywhere, it is not five letters, or this is not a word. Please try again.")
        else:
            print("Ok!")
            is_word_valid = True
            guessed_word = set(guessed_word)
            return guessed_word, guesses

def check_word(Word, Guess):
    if Guess[1] == Word[1]:
        character_one = "Perfect"
    elif Guess[1] in Word:
        character_one = "Somewhere"
    else:
        character_one = "Not here"
    
while is_guess_incorrect:
    Guess, guesses = guess_word(guesses, Word)
