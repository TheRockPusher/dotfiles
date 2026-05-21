# AGENTS.md

- Environment: Linux machine accessed/managed over SSH from a Windows host.
- User interaction: If information is needed from the user, always use the `ask_user_question` extension.
- Python operations: Always use `uv` and `uvx` for Python package management, virtual environments, running tools, scripts, tests, and one-off commands. Do not use `pip`, `python -m pip`, or directly invoke globally installed Python tools when a `uv`/`uvx` equivalent is available.

## Source Code Reference

Source code for dependencies is cached at `~/.opensrc/`.

Use `opensrc path` inside other commands to read source. In general, packages are fetched from npm. To fetch packages from other repositories, prefix the package name with the repository type, such as `pypi:package_name` for PyPI packages or `crate:package_name` for Rust crates.

\`\`\`bash
rg "pattern" $(opensrc path <package>)
cat $(opensrc path <package>)/path/to/file
rg "pattern" $(opensrc path pypi:package_name)
rg "pattern" $(opensrc path crate:package_name)
\`\`\`
