# What Is This? – AI Object Identifier

Files:
- `index.html`      the website
- `api/identify.js` serverless function that calls the Claude API (keeps your key secret)
- `package.json`    project info

## Deploy on Vercel (free)
1. Get an API key at https://console.anthropic.com (add billing, and set a monthly spend limit).
2. Put this folder in a GitHub repository.
3. Go to https://vercel.com, sign up, click "Add New > Project", and import the repository.
4. Before deploying, open "Environment Variables" and add:
      ANTHROPIC_API_KEY = your key
   (Optional: CLAUDE_MODEL to change the model; default is claude-haiku-5-5.)
5. Click Deploy. You get a free address like yourname.vercel.app.

## Custom domain
1. Buy a domain (Cloudflare Registrar, Namecheap, Porkbun, ...).
2. In Vercel: Project > Settings > Domains > add your domain.
3. Copy the DNS records Vercel shows into your registrar's DNS settings.
4. Wait a few minutes to a few hours. HTTPS is automatic.

## Test locally (optional)
    npm i -g vercel
    vercel dev      # asks you to log in, then serves at http://localhost:3000
Create a file named .env.local containing: ANTHROPIC_API_KEY=your key
