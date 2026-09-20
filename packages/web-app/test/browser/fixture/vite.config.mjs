import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(root, "../../..");
const config = {
  root,
  define: {
    "process.env.BETTER_AUTH_URL": JSON.stringify("http://localhost:3000"),
  },
  resolve: {
    alias: [
      {
        find: "@/lib/pro/plan-document-actions",
        replacement: path.join(root, "plan-document-actions.ts"),
      },
      {
        find: "@/lib/pro/profile-actions",
        replacement: path.join(root, "telegram-actions.ts"),
      },
      {
        find: "@/lib/telegram/actions",
        replacement: path.join(root, "telegram-actions.ts"),
      },
      {
        find: "@/lib/auth/actions",
        replacement: path.join(root, "telegram-actions.ts"),
      },
      {
        find: "@/lib/i18n/actions",
        replacement: path.join(root, "telegram-actions.ts"),
      },
      {
        find: "next/navigation",
        replacement: path.join(root, "navigation.jsx"),
      },
      {
        find: "@/lib/pro/agenda-actions",
        replacement: path.join(root, "actions.ts"),
      },
      {
        find: "@/lib/pro/plan-actions",
        replacement: path.join(root, "actions.ts"),
      },
      { find: "next/link", replacement: path.join(root, "link.jsx") },
      { find: "@", replacement: web },
    ],
  },
  esbuild: { jsx: "automatic" },
  server: {
    host: "127.0.0.1",
    port: 4180,
    strictPort: true,
    fs: { allow: [path.resolve(web, "../..")] },
  },
};

export default config;
