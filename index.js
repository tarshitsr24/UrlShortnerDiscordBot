const express = require("express");
const path = require("path");
const { connectToMongoDB } = require("./connect");
const cookieParser = require("cookie-parser");
const userRoute = require("./routes/user");
const urlRoute = require("./routes/url");
const URL = require("./models/url");
const staticRouter = require("./routes/staticRouter");
const { restrictToLoggedInUserOnly, checkAuth } = require("./middleware/auth");
const app = express();
const port = 8001;

app.set("view engine", "ejs"); // set a view instance
app.set("views", path.resolve("./views")); // path of ejs files

app.get("/test/page", async (req, res) => {
  return res.render("home");
});

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // middleware to get form data

app.use("/url", restrictToLoggedInUserOnly, urlRoute);
app.use("/user", userRoute);
app.use("/", checkAuth, staticRouter);

// ✅ Safe for production
if (!process.env.MONGO_URL) {
  console.error("MONGO_URL is missing in environment variables!");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Atlas connected successfully!"))
  .catch((err) => console.log("MongoDB connection error:", err));

// this runs when we use the short url, this looks up for the shortid in db, then adds the timestamp after that res.redirect pulls out the og url instantly bounces the user's browser to that destination
app.get("/:shortId", async (req, res) => {
  const shortId = req.params.shortId;
  const entry = await URL.findOneAndUpdate(
    {
      shortId,
    },
    {
      $push: {
        visitHistory: {
          timeStamps: Date.now(),
        },
      },
    },
  );
  res.redirect(entry.redirectURL);
});

// only for discord bot, In your backend server (e.g., routes/url.js or index.js)
app.post("/api/url", async (req, res) => {
  const body = req.body;
  if (!body.url) return res.status(400).json({ error: "URL is required" });

  const shortId = shortid.generate(); // or whatever short ID generator you use

  await URL.create({
    shortId: shortId,
    redirectURL: body.url,
    // createdBy: req.user._id // Optional: you can associate it with a "Discord Bot" user ID in DB
  });

  return res.json({ id: shortId });
});

app.listen(port, () => {
  console.log(`Server started at ${port}`);
});
