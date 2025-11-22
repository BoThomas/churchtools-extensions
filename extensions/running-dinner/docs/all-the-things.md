# Running Dinner Requirements

This document outlines the requirements for the running dinner extensions for churchtools. It also includes technical details, how we want to implement as well as ideas and todos.

## Requirements

- 2 access levels
  - organizer: can create and manage running dinners; can also join own running dinners
  - participant: can join a running dinner
- flow
  - organizer creates a new running dinner and enters:
    - name
    - description
    - date
    - location (city)
    - max number of participants
    - allow preferred partners (true/false)
      - if true, users can enter preferred partners (via email address) when joining
    - public single signins (true/false)
      - if true, other users can see single signins and join them to form a group as preferred partners
    - preferred group size (default: 2)
    - allow preferred meal
    - registration deadline
    - menu options (starter, main course, dessert) and their start/end times
    - optional after party (time, location)
    - optional info for participants (text field)
  - organizer can save/publish the running dinner, which makes it visible for participants
  - organizer can edit a published running dinner, but gets a warning when changing date, location or other things, that could break stuff
  - organizer can invite participants via deeplink
  - participant can join a running dinner by clicking the deeplink or by going to a list of running dinners and clicking "join"
    - participant enters:
      - name
      - email
      - phone number
      - address (street, zip, city)
      - menu preferences (starter, main course, dessert)
      - food allergies etc (text field)
  - participant can save/join the running dinner
  - participant can edit his/her registration until the registration deadline
  - organizer can see a list of participants
  - after the registration deadline, the organizer can create groups
    - the algorithm should try to
      - respect preferred partners
      - show a warning if a group is too big/small
      - balance menu preferences within groups, but this is lower priority as preferred partners
    - the organizer can manually adjust groups after the algorithm has created them
    - the organizer can rerun the algorithm to recreate groups
  - after groups are created, the organizer can assign meals and dinner routes
    - the algorithm MUST
      - ensure that no group meets another group more than once
      - ensure that each group eats starter, main course and dessert in that order
      - ensure that each group eats the starter, main course and dessert at a different location
    - the algorithm should try to
      - respect preferred meals
  - after meals and routes are assigned, the organizer can publish the groups and routes
    - participants get an email with their group members, meal locations and times, as well as other info about the running dinner and a list of food allergies of their guests, maybe use google maps route links or sth

## Notes

- a running dinner has a needed minimum number of participants to be able to create groups (based on the preferred group size, as well as the number of meals)
  - the organizer should get a warning if too few or too many participants have joined
  - for determining the user that can not participate, the timestamp of joining should be used (last ones to join are the ones that can not participate and will be added to a waiting list)
- use the existing user data from churchtools
- use the existing group data from churchtools
  - would be cool to create events based on existing groups
