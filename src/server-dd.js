const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const axios = require("axios");

const app = express();
const port = 5000;

app.use(bodyParser.json());
app.use(cors());

const jwtSecret = "21345_jwt_secret_sample";
const registerUserUrl = "http://localhost/directdeal/user/insert_database.php"; 
const authenticateUser = "http://localhost/directdeal/user/authenticate.php";
const userDataUrl = "http://localhost/directdeal/user/retrieve_database.php";
const logoutUser = "http://localhost/directdeal/user/logout_database.php";

// recieve post
const receivePostData = ""

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers["x-access-token"];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Authentication token is required" });
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    req.user = decoded;
    next();
  });
};

// Register endpoint
app.post("/api/register", (req, res) => {
  const { customerID, mobileno, email, username, password } = req.body;

  // Send registration data to PHP script
  const dataInput = {
    customerID: customerID,
    mobileno: mobileno,
    email: email,
    username:username,
    password:password,
  }
  const jsonInput = JSON.stringify(dataInput)
  axios
    .post(registerUserUrl,jsonInput)
    .then((response) => {
      // Assuming PHP returns some success message or data upon successful registration
      const { message, loginUsername } = response.data;

      // If registration was successful, generate JWT token for auto-login
      if (message === "User registered successfully") {
        res.json({ message: message });
      } else {
        res.status(500).json({ message: "Registration failed"  });
      }
    })
    .catch((error) => {
      console.error("Error in registration:", error.response.data.error);
      res.status(500).json({ message: "Internal server error" });
    });
});

// Login endpoint
app.post("/api/login", (req, res) => {
  const { loginUsername, loginPassword } = req.body;

  // Send login credentials to PHP authentication script
  axios
    .post(authenticateUser, {
      username: loginUsername,
      password: loginPassword,
    })
    .then((response) => {
      if (response.data.message === "Login successful") {
        // Generate JWT token for the user
        const authToken = jwt.sign({ loginUsername }, jwtSecret, {
          expiresIn: "7d",
        });

        res.json({ token: authToken });
      } else {
        res.status(500).json({ message: "Login failed" });
      }
    })
    .catch((error) => {
      console.error("Error in authentication:", error.response.data.error);
      res.status(500).json({ message: error.response.data.error });
    });
});

// Protected route to fetch user data
app.get("/api/user-login-access-token", authenticateToken, (req, res) => {
  axios
    .get(userDataUrl)
    .then((response) => {
      const usersData = response.data;
      const userData = usersData.find(
        (u) => u.username === req.user.loginUsername
      );

      if (!userData) {
        return res.status(404).json({ message: "User data not found" });
      }

      const jsonDatapassed = [userData.customerID, userData.loginSession];
      res.json(jsonDatapassed);
    })
    .catch((error) => {
      console.error("Error fetching users data:", error);
      res.status(500).json({ message: "Internal server error" });
    });
});

// Logout endpoint
app.post("/api/logout", authenticateToken, (req, res) => {
  const { loginUsername } = req.user;

  axios
    .post(logoutUser, {
      username: loginUsername,
    })
    .then((response) => {
      if (response.data.message === "Logout successful") {
        res.json({ message: "Logout successful" });
      } else {
        res.status(500).json({ message: "Error during logout" });
      }
    })
    .catch((error) => {
      console.error(
        "Error in logout:",
        error.response ? error.response.data.error : error.message
      );
      const errorMessage = error.response
        ? error.response.data.error
        : "Internal server error";
      res.status(500).json({ message: errorMessage });
    });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
