# shopy

Install shopping skills for AI agents from the command line.

The CLI for [shopy.sh](https://shopy.sh) — the open standard for agentic commerce.

## Quick Start

```bash
npx shopy add amazon
npx shopy search "office supplies"
npx shopy list
npx shopy update
```

## What is shopy?

shopy installs SKILL.md files — instruction packages that teach AI agents how to shop at specific stores. Each skill covers product search, cart management, checkout flow, and payment for a given merchant.

## Commands

| Command | Description |
|---|---|
| `shopy add <store>` | Install a shopping skill by store name |
| `shopy add --sector <sector>` | Install all skills in a sector |
| `shopy search <query>` | Search the skill registry |
| `shopy list` | List locally installed skills |
| `shopy update` | Update installed skills to latest versions |
| `shopy remove <store>` | Remove an installed skill |
| `shopy init` | Initialize a `.shopy` config in your project |

## Documentation

- [CLI Reference](https://shopy.sh/docs/shopy/cli/installation)
- [Skill Format](https://shopy.sh/docs/shopy/skill-format/structure)
- [The Standard](https://shopy.sh/standard)

## License

MIT
