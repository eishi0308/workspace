import * as esbuild from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";

await esbuild.build({
  entryPoints: ["src/app.js", "src/app.scss"],
  outdir: "public",
  allowOverwrite: true,
  plugins: [sassPlugin()],
  bundle: true,
});
