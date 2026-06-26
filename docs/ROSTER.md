# Roster

Roster is a lightweight shift planning and documentation-tracking feature. It is not payroll, award interpretation, accounting, NDIS claiming automation, or a full workforce management system.

## Purpose

Roster helps teams see who is working with which participant, when the support is happening, where it is happening, and whether a progress note still needs to be completed after the shift.

## What It Does

- Shows day and week roster views.
- Lets managers create a simple shift in demo mode.
- Displays worker, participant, support type, time, location, and instructions.
- Tracks shift status and progress-note status.
- Uses consistent employee colours across cards, week blocks, filters, modals, and the legend.
- Gives the dashboard a small operational summary of today's shifts and documentation follow-up risk.

## What It Does Not Do

- Payroll
- Award interpretation
- Accounting
- NDIS claiming automation
- Timesheet approval
- Leave management
- Full workforce management

## Employee Colour Schemes

- Mary: teal
- James: blue
- Dennis: indigo
- Sarah: purple
- Default: grey

Colour is always paired with visible worker names and shift status text, so the interface does not rely on colour alone.

## Day And Week Views

The day view is optimised for immediate shift operations. It sorts shifts by start time and keeps documentation status visible on every card.

The week view is designed for scanning team coverage across the week. Each worker keeps the same colour treatment in every column.

## Accessibility

Roster uses readable labels, visible status badges, keyboard-focusable cards and buttons, and text labels alongside colour indicators. Empty states explain what is missing without blocking the user.

## Database

Production storage should use the `roster_shifts` table in `supabase/schema.sql`. The table links each shift to an organisation, participant/client, worker, optional progress note, and creator. Progress notes can also link back to a roster shift through `progress_notes.roster_shift_id`.

Access control should keep roster records organisation-scoped. Workers should see their own assigned shifts and participant/client context. Managers, admins, service managers, owners, and sole providers should manage roster shifts within their organisation.

## Future Roadmap

- Recurring shifts
- Shift conflict warnings
- Mobile check-in/check-out
- Worker availability
- Leave and unavailability placeholders
- Calendar export
- Real-time Supabase updates
- Linking shift completion directly into progress-note creation
