#! /bin/bash

pacman -Sc
rm -rf ~/.local/share/Trash/files ~/.local/share/Trash/info
uv run rmshit.py