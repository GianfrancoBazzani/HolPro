import { defineConfig } from "vitest/config";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [
    {
      // next/image static imports resolve to { src, width, height } in Next.
      name: "next-static-images",
      enforce: "pre",
      load(id) {
        if (/\.(png|jpe?g|webp|avif|gif|svg)$/.test(id))
          return `export default { src: "/${basename(id)}", width: 1, height: 1 };`;
      },
    },
  ],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { environment: "node" },
});
