# Invoice Generator

Invoice Generator is a full-stack invoice builder for creating, saving, and exporting professional invoices. It includes email/password authentication, Google OAuth, user profile data, drag-and-drop invoice sections, multilingual UI, and PDF/DOCX export.

## Features

- Secure user accounts with JWT cookies and bcrypt password hashing.
- Google OAuth sign-in support.
- Dashboard to create, edit, and delete saved invoices.
- Drag-and-drop invoice layout builder.
- Rich-text notes, terms, bank details, and custom text blocks.
- PDF and DOCX export.
- English and Spanish translations.
- Local SQLite database by default, with Turso/libSQL support for production.

## Tech Stack

- React 19, Vite, TypeScript, Tailwind CSS
- Express API routes
- SQLite/Turso via `@libsql/client`
- JWT, bcrypt, cookie-based sessions
- React Router, dnd-kit, React Quill, jsPDF, docx

## Requirements

- Node.js 20+
- npm
- Optional: Turso database for production or shared environments
- Optional: Google OAuth credentials for Google sign-in

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
cp .env.example .env
```

3. Configure at least `JWT_SECRET` in `.env`.

4. Start the development server:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

The development server runs the Express API and Vite middleware from `server.ts`. If `TURSO_DATABASE_URL` is not set, the app uses a local `database.sqlite` file.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `JWT_SECRET` | Yes | Secret used to sign authentication tokens. Use a long random value in production. |
| `APP_URL` | For Google OAuth | Public app URL used to build OAuth callback URLs. Example: `https://your-app.vercel.app`. |
| `GOOGLE_CLIENT_ID` | For Google OAuth | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | For Google OAuth | Google OAuth client secret. |
| `TURSO_DATABASE_URL` | Production optional | Turso/libSQL database URL. Falls back to local SQLite when omitted. |
| `TURSO_AUTH_TOKEN` | Production optional | Turso auth token. Required when using a protected Turso database. |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the local Express + Vite development server. |
| `npm run build` | Builds the client app for production. |
| `npm run preview` | Serves the Vite production build locally. |
| `npm run lint` | Runs TypeScript checks with `tsc --noEmit`. |

## Deployment

This project includes `vercel.json` for Vercel deployment:

- `api/index.ts` serves the Express API as a Vercel Node function.
- The Vite app is built as a static frontend.
- `/api/*` requests are routed to the API function.
- All other requests are routed to the SPA entry point.

Before deploying, set production environment variables in your hosting provider. Do not commit `.env` files, local databases, or secrets.

## Security Notes

- HTML produced by rich-text invoice fields is sanitized before rendering.
- Auth cookies are `httpOnly`, `sameSite=lax`, and `secure` in production.
- SQL queries use parameterized statements.
- `JWT_SECRET` is required in production.
- Run `npm audit` regularly and update dependencies when advisories are published.

## Project Structure

```text
api/                    Vercel API entry point
src/components/         Invoice builder UI components
src/context/            Auth and builder React contexts
src/pages/              Login, register, dashboard, and profile pages
src/server/             Database client and Express route modules
src/utils/              PDF, DOCX, and formatting utilities
server.ts               Local Express + Vite development server
```
