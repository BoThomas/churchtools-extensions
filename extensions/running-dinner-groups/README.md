# Running Dinner Groups

Organize and manage Running Dinner events directly in ChurchTools using native group management.

> [!CAUTION]
> This extension is still under active development and not yet ready for production use.

> [!NOTE]
> The idea for this extension originated from the exploratory [Running Dinner](../running-dinner/README.md) extension.

## What is a Running Dinner?

A Running Dinner (also known as a Progressive Dinner) is a social dining event where participants travel between different locations for each course of a meal. Each group hosts one course and visits other groups for the remaining courses – a fun way to meet new people and share food together!

**Example**: For a 3-course dinner (starter, main, dessert), participants might:

1. Host the starter at their home for visiting guests
2. Travel to another home for the main course
3. End at yet another location for dessert

## What is this Extension?

Running Dinner Groups helps organizers plan and execute Running Dinner events using ChurchTools' native group system. Participants register by joining ChurchTools groups, and all data (preferences, dietary restrictions, etc.) is stored in group custom fields – keeping everything within the ChurchTools ecosystem.

## Features

### 🎉 Event Management

- Create and manage multiple Running Dinner events
- Set event details: date, location, menu times
- Configure optional after-party details
- Track event status: Draft → Active → Finished → Archived

### 📋 ChurchTools-Native Registration

- Participants register by joining a ChurchTools group
- Custom fields capture preferences: meal preference, dietary restrictions, allergens, partner
- Use ChurchTools' existing waitlist and member status features
- Registration open/closed controlled via group settings

### 👥 Smart Group Creation

- Automatic dinner group creation based on preferences
- Algorithm considers:
  - Meal hosting preferences
  - Dietary restrictions and allergies
  - Partner preferences (couples, friends)
- Visual group builder with manual adjustments

### 🗺️ Route Planning

- Smart route assignment algorithm
- Ensures optimal visiting patterns
- Capacity management (max groups per location)

### 📧 Email Notifications

- Send automated welcome emails
- Generate personalized route emails
- Include dietary information for hosts
- Contact details and addresses

## How It Works

### For Organizers

1. **Setup** (one-time): Create a "Running Dinner" parent group in ChurchTools and configure custom fields
2. **Create Event**: Add a new child group for each Running Dinner event
3. **Open Registration**: Participants join the group and fill out their preferences
4. **Close Registration**: Lock the group when ready to plan
5. **Create Groups**: Use the algorithm to form dinner groups based on preferences
6. **Assign Routes**: Generate optimal route assignments for each course
7. **Notify Participants**: Send personalized route emails to all participants

### For Participants

1. **Register**: Join the Running Dinner event group in ChurchTools
2. **Set Preferences**: Fill out custom fields (meal preference, dietary restrictions, partner, etc.)
3. **Get Matched**: Organizers create dinner groups after registration closes
4. **Receive Route**: Get your personalized schedule via email showing where to go for each course
5. **Enjoy!**: Host one course and travel to others for a unique dining experience

## Event Workflow

```
Draft → Active → Registration Closed → Groups Created → Routes Assigned → Completed
```

Each stage unlocks different actions:

- **Draft**: Edit event details, not yet visible to participants
- **Active**: Participants can register by joining the group
- **Registration Closed**: No new sign-ups, prepare for grouping
- **Groups Created**: Review and adjust dinner groups
- **Routes Assigned**: Ready to send notifications
- **Completed**: Event finished, view statistics

## ChurchTools Integration Details

### Group Structure

```
Running Dinner (Parent - Service Group)
├── Summer 2025 (Child Group - Event)
├── Christmas 2025 (Child Group - Event)
└── Easter 2025 (Child Group - Event)
```
