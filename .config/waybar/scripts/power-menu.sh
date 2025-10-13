#!/bin/bash

# Power menu options
options="󰌾 Lock
󰍃 Logout
󰜉 Reboot
󰐥 Shutdown
󰤄 Suspend"

# Show menu with fuzzel
chosen=$(echo "$options" | fuzzel --dmenu --prompt "Power Menu: " --width 25)

# Execute chosen option
case $chosen in
    "󰌾 Lock")
        hyprlock
        ;;
    "󰍃 Logout")
        hyprctl dispatch exit
        ;;
    "󰜉 Reboot")
        systemctl reboot
        ;;
    "󰐥 Shutdown")
        systemctl poweroff
        ;;
    "󰤄 Suspend")
        systemctl suspend
        ;;
esac
