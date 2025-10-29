unset MAIL             # completely remove the MAIL variable

# Create Zinit dir 
ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"

# Download Zinit, if it's not there yet
if [ ! -d "$ZINIT_HOME" ]; then
    mkdir -p "$(dirname $ZINIT_HOME)"
    git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"
fi

# Source/Load zinit
source "${ZINIT_HOME}/zinit.zsh"


# Shell integrations
# inicialize OMP
#eval "$(oh-my-posh init zsh --config 'https://github.com/JanDeDobbeleer/oh-my-posh/blob/main/themes/catppuccin_mocha.omp.json')" 

eval "$(oh-my-posh init zsh --config ~/.config/oh-my-posh/catppuccin_mocha.omp_dif.json)" 

eval "$(fzf --zsh)" # fuzzy finding
eval "$(zoxide init --cmd cd zsh)" #better cd



#Plugins
zinit light zsh-users/zsh-syntax-highlighting
zinit light zsh-users/zsh-completions
zinit light zsh-users/zsh-autosuggestions
zinit light Aloxaf/fzf-tab
zinit snippet OMZP::colored-man-pages
zinit snippet OMZP::command-not-found

# Load completions
autoload -Uz compinit && compinit

zinit cdreplay -q

#keybindings
bindkey '^p' history-search-backward
bindkey '^n' history-search-forward

# env vars
source ~/.env_shared

# HISTORY
HISTSIZE=5000
HISTFILE="$XDG_STATE_HOME"/zsh/history
SAVEHIST=$HISTSIZE
HISTDUP=erase
setopt appendhistory
setopt sharehistory
setopt hist_ignore_space
setopt hist_ignore_all_dups
setopt hist_save_no_dups
setopt hist_ignore_dups
setopt hist_find_no_dups

# Completion styling
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}'
zstyle ':completion:*' list-colors '${(s.:.)LS_COLORS}' #case insensitive completion 
zstyle ':completion:*' menu no #using fzf

# fuzzy finder on tab
zstyle ':fzf-tab:complete:cd:*' fzf-preview 'ls --color $realpath'
zstyle ':fzf-tab:complete:__zoxide_z:*' fzf-preview 'ls --color $realpath'

# Diff so fancy
zinit ice lucid as"program" pick"bin/git-dsf"
zinit load so-fancy/diff-so-fancy


# Aliases
alias ls='ls --color=auto'
alias ll='ls -lh'
alias la='ll -A'

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

#keybind
bindkey "^[[3~" delete-char

