# Montrose Run Club

Marketing site for Montrose Run Club — a Saturday-morning run club in Montrose,
Houston, TX. Single page, static, no build step.

Live: https://montroserunclub.com

## Structure

```
index.html      # all markup, one page
styles.css      # all styles (design tokens at top of file)
app.js          # mission-clock countdown, contact form, scroll reveals
assets/         # logo variants (SVG/PNG) + favicon
```

## Local preview

It's a static site — open `index.html`, or serve the folder:

```
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Contact form

The form posts (AJAX) to [Formsubmit.co](https://formsubmit.co), which emails
the message to the club organizer. No backend or API key.

**One-time activation:** the first time the form is submitted after going live,
Formsubmit sends a confirmation email to the recipient address. Click that link
once and submissions start flowing. The endpoint is set in `app.js`
(`FORM_ENDPOINT`).

## Deploy

Hosted on Cloudflare Pages (direct upload), custom domain `montroserunclub.com`.

```
npx wrangler pages deploy . --project-name=montroserunclub
```

Requires a Cloudflare API token in the environment (`CLOUDFLARE_API_TOKEN`).
