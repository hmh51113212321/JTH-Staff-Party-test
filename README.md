# React + Vite

## Use the draw on two computers

The Vite development server shares the selected number and used-entry status between connected browsers.

1. Connect both computers to the same local network.
2. On the computer hosting the draw, run `npm run dev` and keep it running.
3. Find that computer's local IP address (on Linux, run `hostname -I`).
4. Open `http://<host-ip>:5173/` on the display computer and `http://<host-ip>:5173/admin` on the admin computer. Replace `<host-ip>` with the host's local IP address.

Allow port `5173` through the host computer's firewall if prompted. The shared state is kept in the running server's memory and resets when the server restarts. This live-sync API is for the Vite development server; a static production build does not provide shared state.

## Enable shared draw state on Vercel

Vercel runs each API route as a serverless function, so the development server's in-memory state is not available in production. Create an Upstash Redis database (or connect a Vercel KV store), then add its `KV_REST_API_URL` and `KV_REST_API_TOKEN` values under **Project → Settings → Environment Variables**. Redeploy after adding them. The `/api/lucky-draw/state` and `/api/lucky-draw/action` functions use Redis to share state across browsers and function instances.

## Upload prize photos and videos

Each Admin card has an **Edit name** button to rename its prize; names are shared with the home display and other connected browsers. Each card also has an **Upload media / Edit media** button. Supported formats are JPEG, PNG, WebP, GIF, AVIF, MP4, WebM, and MOV; files must be under 100 MB.

- **Local development:** uploads are saved under `src/assets/images/` with the lucky number in the filename. They persist in the project folder and can be committed and deployed with the app.
- **Vercel:** uploads are saved in Cloudinary and served from the latest uploaded URL for each lucky number. They are not written into the deployed `src/assets/images/` folder.

To enable Cloudinary uploads on Vercel:

1. In your Cloudinary dashboard, find the cloud name, API key, and API secret.
2. Generate a private upload password in a terminal, for example with `openssl rand -hex 32`. This value is your `ADMIN_UPLOAD_TOKEN`; it is not your Cloudinary API secret.
3. Copy `.env.example` to `.env.local` for local server development and fill in the values. Keep `.env.local` private and do not commit it.
4. Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `ADMIN_UPLOAD_TOKEN` in Vercel under **Project → Settings → Environment Variables**. Use the same generated token for `ADMIN_UPLOAD_TOKEN`.
5. Redeploy after setting the Vercel variables. In the Admin page, choose **Upload media / Edit media** and enter that exact `ADMIN_UPLOAD_TOKEN` when prompted. The app keeps it only for the current browser session.

The API secret and upload token must stay private. If the Cloudinary API secret was exposed, rotate it in Cloudinary and update the environment variables before redeploying.

## Vite template notes

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
