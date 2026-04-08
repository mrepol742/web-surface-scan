# web-surface-scan

A lightweight developer-focused tool for analyzing a website’s **technology stack, integrations, and potential security flaws** using automated browser inspection.

Built with **TypeScript + Playwright**, this project helps developers quickly understand what technologies a site uses and identify possible misconfigurations early.

## Installation

You can install and run the tool in two ways:

### Run via NPX

```sh
npx web-surface-scan <target-website-url>
```

or using the alias:

```sh
npx wss <target-website-url>
```

### Run locally (development)

```sh
git clone https://github.com/yourusername/web-surface-scan.git
cd web-surface-scan

npm install
npx playwright install

npm run build
node dist/index.js <target-website-url>
```

## Usage

```sh
web-surface-scan <target-website-url>
```

Or if using NPX:

```sh
npx web-surface-scan <target-website-url>
```

## Disclaimer

This tool is intended for educational and ethical use only. Always obtain proper authorization before scanning any website or application. The developers are not responsible for any misuse of this tool.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your improvements.
