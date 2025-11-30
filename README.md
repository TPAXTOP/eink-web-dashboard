# Express.js on Vercel

Basic Express.js + Vercel example that serves html content, JSON data and simulates an api route.

## How to Use

You can choose from one of the following two methods to use this repository:

### One-Click Deploy

Deploy the example using [Vercel](https://vercel.com?utm_source=github&utm_medium=readme&utm_campaign=vercel-examples):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/vercel/examples/tree/main/solutions/express&project-name=express&repository-name=express)

### Clone and Deploy

```bash
git clone https://github.com/vercel/examples/tree/main/solutions/express
```

Install the Vercel CLI:

```bash
npm i -g vercel
```

Then run the app at the root of the repository:

```bash
vercel dev
```

## Environment variables

The USD → UAH exchange rate endpoint now requires an API key.

1. Copy `.env.example` to `.env`.
2. Set `EXCHANGERATE_API_KEY` to your exchangerate.host key (or configure the same variable in Vercel project settings).
3. Restart the dev server so the new key is picked up.

The client never sees this key—`/api/fx` runs server-side and proxies the request securely.
