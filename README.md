# MAX BNB Storybook Website

## Fastest deployment
1. Create a free Vercel account.
2. Import this folder through GitHub, or install Vercel CLI and run `vercel` here.
3. In Vercel → Project → Settings → Domains, add `maxbnb.meme` and `www.maxbnb.meme`.
4. Vercel will show the exact DNS records to add in Namecheap Advanced DNS.
5. Deploy the project. The server-side donation function is already configured with the supplied API key as a fallback. For better security, add a replacement key in Vercel as `BSCSCAN_API_KEY`; the environment variable automatically overrides the fallback.

The live processor balance works through BNB Chain RPC. Historical donation transfers use the key inside the server-side `/api/donations.js` function.

Before launch, replace the placeholder Buy and Telegram buttons in `script.js` / `index.html` when those URLs are confirmed.


## Favicon and social-sharing package

This release includes browser favicons, Apple and Android home-screen icons, a web manifest, and a 1200×630 Open Graph image for X, Telegram, Discord, and other link previews.
