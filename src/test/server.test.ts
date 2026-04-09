import express from "express";
import rateLimit from "express-rate-limit";

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let trafficHits = 0;

// Traffic logger middleware
app.use((req, _res, next) => {
  trafficHits += 1;
  console.log(
    `[TRAFFIC] #${trafficHits} ${req.method} ${req.originalUrl} from ${req.ip}`,
  );
  next();
});

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    console.error(
      `[RATE_LIMIT] ${req.method} ${req.originalUrl} from ${req.ip} -> ${options.statusCode}`,
    );
    res.status(options.statusCode).send(options.message);
  },
});

app.use(limiter);

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Express + Tailwind</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen flex flex-col items-center justify-center p-6">

      <h1 class="text-3xl font-bold mb-6">🚀 Express Test Page</h1>

      <div class="bg-white shadow-lg rounded-2xl p-6 w-full max-w-sm mb-6">
        <p class="mb-4 font-semibold text-gray-700">Navigation</p>
        <div class="flex flex-col gap-2">
          <a href="/about" class="bg-blue-500 text-white py-2 rounded-lg text-center hover:bg-blue-600">About</a>
          <a href="/api" class="bg-green-500 text-white py-2 rounded-lg text-center hover:bg-green-600">API Route</a>
          <a href="/" class="bg-gray-500 text-white py-2 rounded-lg text-center hover:bg-gray-600">Reload</a>
        </div>
      </div>

      <div class="bg-white shadow-lg rounded-2xl p-6 w-full max-w-sm">
        <h2 class="text-xl font-semibold mb-4">Sample Form</h2>

        <form method="POST" action="/submit" class="flex flex-col gap-3">
          <input
            type="text"
            name="name"
            placeholder="Enter your name"
            required
            class="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            required
            class="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <button
            type="submit"
            class="bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Submit
          </button>
        </form>
      </div>

      <p class="mt-6 text-gray-600 text-sm">Limit: 5 requests per minute</p>

    </body>
    </html>
  `);
});

app.post("/submit", (req, res) => {
  const { name, email } = req.body;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 flex items-center justify-center min-h-screen">

      <div class="bg-white p-6 rounded-2xl shadow-lg text-center">
        <h1 class="text-2xl font-bold mb-4">✅ Form Submitted</h1>
        <p class="mb-2"><strong>Name:</strong> ${name}</p>
        <p class="mb-4"><strong>Email:</strong> ${email}</p>
        <a href="/" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
          Go Back
        </a>
      </div>

    </body>
    </html>
  `);
});

app.get("/about", (req, res) => {
  res.send(`
    <script src="https://cdn.tailwindcss.com"></script>
    <div class="flex items-center justify-center min-h-screen bg-gray-100">
      <div class="bg-white p-6 rounded-2xl shadow-lg text-center">
        <h1 class="text-xl font-bold mb-2">About Page</h1>
        <p class="mb-4">This is a simple Express app with Tailwind.</p>
        <a href="/" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Go Back</a>
      </div>
    </div>
  `);
});

app.get("/api", (req, res) => {
  res.json({ message: "Hello from API!" });
});

// Error logger middleware
app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[ERROR] ${req.method} ${req.originalUrl} from ${req.ip} -> ${message}`,
    );
    res.status(500).json({ error: "Internal server error" });
  },
);

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
