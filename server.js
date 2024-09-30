import { join } from "node:path";

import Express from "express";
import session from "express-session";
import sassMiddleware from "express-dart-sass";

import { sessionSecret, port } from "./lib/config.js";
import routes from "./lib/routes.js";

const app = Express();

// Middleware
app.set("trust proxy", 1);
app.use(
  session({
    secret: sessionSecret,
    cookie: { secure: "auto", sameSite: true, httpOnly: true },
    saveUninitialized: true,
    resave: false,
  })
);
app.use(Express.json());
app.use(
  sassMiddleware({
    src: join(import.meta.dirname, "sass"),
    dest: join(import.meta.dirname, "public"),
    debug: false,
    outputStyle: "compressed",
  })
);
app.use(Express.static("public"));

app.use("/", routes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
