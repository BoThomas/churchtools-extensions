# Running Dinner

Organize and manage Running Dinner events directly in ChurchTools.

> [!IMPORTANT]
> **Extension Key:** `runningdinner` — You'll need this key when installing the extension in ChurchTools.

> [!CAUTION]
> This Extension is in exploratory development and not yet ready for production use.
> It may be replaced by the [Running Dinner Groups](../running-dinner-groups/README.md) extension which offers deeper ChurchTools integration.

## What is a Running Dinner?

A Running Dinner (also known as a Progressive Dinner) is a social dining event where participants travel between different locations for each course of a meal. Each group hosts one course and visits other groups for the remaining courses – a fun way to meet new people and share food together!

**Example**: For a 3-course dinner (starter, main, dessert), participants might:

1. Host the starter at their home for visiting guests
2. Travel to another home for the main course
3. End at yet another location for dessert

## Features

### 🎉 Event Management

- Create and manage multiple Running Dinner events
- Set event details: date, location, registration deadlines
- Configure menu timing for each course
- Optional after-party setup

### 👥 Participant Registration

- Self-service registration for community members
- Collect dietary restrictions and allergies
- Meal preferences (which course to host)
- Partner preferences (register with a friend/spouse)
- Single or couple registrations

### 🏠 Smart Group Creation

- Automatic group formation based on preferences
- Considers dietary restrictions when grouping
- Respects partner preferences
- Manual override options for organizers

### 🗺️ Route Assignment

- Intelligent route planning algorithm
- Ensures each group visits different hosts
- Balances travel between locations
- Considers hosting capacity constraints

### 📧 Communication

- Generate personalized route information
- Share schedules and addresses with participants
- Clear overview of who visits whom when

## How It Works

### For Organizers

1. **Create Event**: Set up a new Running Dinner with date, location, and menu times
2. **Open Registration**: Participants can register and set their preferences
3. **Create Groups**: Once registration closes, form dining groups (automatic or manual)
4. **Assign Routes**: Let the algorithm create optimal routes for each course
5. (Work in Progress) **Notify Participants**: Send out route information to all participants

### For Participants

1. **Register**: Sign up with your dietary preferences and which meal you'd like to host
2. **Get Matched**: You'll be grouped with other participants
3. **Receive Route**: Get your personalized schedule showing where to go for each course
4. **Enjoy!**: Host one course and travel to others for a unique dining experience

## Event Workflow

```
Draft → Published → Registration Closed → Groups Created → Routes Assigned → Completed
```

Each stage unlocks different actions:

- **Draft**: Edit event details
- **Published**: Participants can register
- **Registration Closed**: No new sign-ups, prepare for grouping
- **Groups Created**: Review and adjust groups
- **Routes Assigned**: Ready to send notifications
- **Completed**: Event finished, view statistics
