Low_Bound = 0
High_Bound = 0
Computer_Guess = 0
number_of_guesses = 0

def set_bound(bound_call):
    while True:
        bound_being_set = input(f"Please tell me what the {bound_call} bound will be.")
        if isinstance(bound_being_set, int) and bound_being_set >= 0:
            print("Thank you!")
            break
        else:
            print("The number you put in was either not an integer, or is not greater than or equal to 0. Please try again.")
            continue
    return bound_being_set

Low_Bound = set_bound(lowest)
High_Bound = set_bound(highest)


