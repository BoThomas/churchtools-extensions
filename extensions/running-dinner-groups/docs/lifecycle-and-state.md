# Running Dinner: Lifecycle and State

I want to better integrate the CT group features into the lifecycle of the Running Dinner extension.

First, there is the organization/parent group — this is good right now.
Then there are the subgroups that represent an event.

We don’t utilize the CT group lifecycle at the moment. We should do better.
Groups can be in:

- Entwurf
- Aktiv
- Beendet
- Archiviert

After that, they can be deleted.

They can also have visibility:

- Öffentlich
- Intern
- Eingeschränkt
- Versteckt

"Anmeldung" can be:

- geschlossen
- geöffnet

We can also plan an automatic start date for opening or closing the Anmeldung.

So I think we could find a solid lifecycle for Running Dinners that utilizes these features without us needing to implement our own concept and keep track of it in our extension’s KV store. We should just control the group settings and thereby control the event state.

Maybe we can find even more CT features, making it completely unnecessary to store our own KV data. For example:

- We could create a wiki entry from the organization view describing how Running Dinner works.
- We could use "Beschreibung" to link to the wiki entry and provide other sensible information about the event.
- We could use "Beiträge" to notify members about things everyone is allowed to know, like posting pictures after the event is finished.
- We can use "Treffen" to specify meal times.
- We can use "Treffpunkt" for the optional after-event.
- We could better utilize roles (remove the ones we don’t need, but use, e.g., "Organisator" for people helping out with the event).
- We could use the "Routinen" feature to define automations for waitlists or people leaving the event in different states (e.g., sending emails if someone joins from the waitlist, or when someone leaves the event after dinner-group/route planning is done).

Maybe we can even find a way to save dinner groups and routes using CT group features — e.g., using subgroups for dinner groups and "Treffen" for routes/meal times.
