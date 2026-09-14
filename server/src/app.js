import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import pinoHttp from "pino-http";

import env from "./config/env.js";
import logger from "./config/logger.js";
import sanitize from "./middleware/sanitize.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/error.js";
import routes from "./routes/index.js";

/**
 * Assembles and EXPORTS the app. It never calls listen() — server.js does that
 * (ARCHITECTURE §23). Supertest imports this module and drives it in-process,
 * so a listen() here would leak a port on every test run.
 */
const app = express();

// Behind Render/Railway/Vercel the platform proxy is the peer, so without this
// the rate limiter sees one IP for every user and throttles them as one (§18).
if (env.isProduction) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");

// Middleware order is fixed by §23 and is not a matter of taste:
// helmet → cors → json → cookies → sanitize → compression → logging → rateLimit
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header: same-origin, curl, or a server-to-server caller.
      if (!origin || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      // `false` omits the CORS headers and lets the browser block it, rather
      // than throwing and logging a 500 for what is a routine rejection.
      return callback(null, false);
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(sanitize);
app.use(compression());

app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === "/api/v1/health" },
  }),
);

app.use(globalLimiter);

app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
