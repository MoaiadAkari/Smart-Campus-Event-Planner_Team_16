const express = require('express');
const path = require('path');
const app = express();
const eventRoutes = require("./routes/eventRoutes");
const registrationRoutes = require("./routes/reg");

// port configuration -----------------the website will run on localhost:3000-------------
const PORT = 3000;

// -----------------------------middleware------------------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// let express serve the public folder and html files
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "views")));

// -----------------------------routes------------------------------------
//temporary route to test the server //////////////////////////////////////NEED TO REMOVE THIS ROUTE BEFORE submission 
app.get("/api/health", (req, res) => {
res.json({message: "Server is healthy"});
});
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);


// -----------------------------start server------------------------------------
app.listen(PORT,() => {
    console.log(`Server is running on http://localhost:${PORT}`);
});



//--------------------------------------------------to be done later (By Moaiad)--------------------------------------------
/*
1) Import real route files
2) Connect routes with app.use()
3) Add authentication/session middleware
4) Add role-based protection
5) Protect student/admin HTML pages
6) Change port to process.env.PORT || 3000
7) Add 404 handling
8) Add global error handling
9) Add database startup integration if needed
*/ 
