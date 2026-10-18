Low_Bound = 0
High_Bound = 0
Computer_Guess = 0

def set_bound(bound_call):   
    while True: 
        try:       
            bound_being_set = int(input(f"Hello! Tell me the {bound_call} number that I can guess! "))       
          
            if bound_being_set <= 0:         
                print("This is not a number that is greater than zero. Please try again.")         
                continue                            
            
            return bound_being_set  # Added return so you can actually use the number
            
        except ValueError:       
            print("You didn't put in a number or the number is not an integer. Please try again.")


Low_Bound = set_bound(lowest)
High_Bound = set_bound(highest)



