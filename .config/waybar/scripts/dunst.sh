#!/bin/bash

# Check if dunst is paused
if dunstctl is-paused | grep -q "true"; then
    # DND mode - show muted/crossed bell
    COUNT=$(dunstctl count waiting)
    if [ "$COUNT" != "0" ]; then
        printf '{"text":"󰂛","class":"dnd-notification","tooltip":"%s notifications (DND)"}' "$COUNT"
    else
        printf '{"text":"󰂛","class":"dnd-none","tooltip":"Do Not Disturb"}'
    fi
else
    # Normal mode - show bell or ringing bell
    COUNT=$(dunstctl count displayed)
    WAITING=$(dunstctl count waiting)
    TOTAL=$((COUNT + WAITING))
    
    if [ "$TOTAL" != "0" ]; then
        printf '{"text":"󰂚","class":"notification","tooltip":"%s notifications"}' "$TOTAL"
    else
        printf '{"text":"󰂜","class":"none","tooltip":"No notifications"}'
    fi
fi
