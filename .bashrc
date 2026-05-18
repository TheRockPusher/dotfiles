#
# ~/.bashrc
#

# Aliases (kept in sync with ~/.config/zsh/.zshrc)
# Keep this before the interactive guard so tools can `source ~/.bashrc` for aliases.
shopt -s expand_aliases 2>/dev/null
alias ls='ls --color=auto'
alias ll='ls -lh'
alias la='ll -A'
alias grep='grep --color=auto'

alias gs="git status --short"
alias gd="git diff"
alias ga="git add"
alias gap="git add --patch"
alias gch="git checkout"
alias gc="git commit --verbose"
alias gp="git push"
alias gu="git pull"
alias gl='git log --graph --all --pretty=format:"%C(magenta)%h %C(white) %an  %ar%C(blue)  %D%n%s%n"'
alias gb="git branch"
alias gcl="git clone"

# If not running interactively, don't do anything else
[[ $- != *i* ]] && return

PS1='[\u@\h \W]\$ '

export HISTFILE="$XDG_STATE_HOME"/bash/history

export $(envsubst < ~/.env_shared)

# Generated for envman. Do not edit.
[ -s "$HOME/.config/envman/load.sh" ] && source "$HOME/.config/envman/load.sh"
