const express = require("express");
const stripe = require("stripe")('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'); 
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const nodemailer = require('nodemailer');

const base = "https://api-m.sandbox.paypal.com";

const app = express();

app.use(express.static("client"));
app.use(express.json());
app.use(bodyParser.json());
app.use(cors());

app.use('/proxy', (req, res) => {
  const url = 'https://gw.fraud.elavon.com' + req.url; // Forward to the Elavon server
  req.pipe(request(url)).pipe(res); // Pipe the request and response
});
// PayPal
const REACT_APP_PAYPAL_CLIENT_ID = 'AbG0MUcovhrxJlymwu3xTjHje2b6skTcrGtfNOot0gDsNdw6aBBkuwqs5M_OD-XbQ0DE6kafCGslYOVd'
const REACT_APP_PAYPAL_CLIENT_SECRET = 'ECaISBNP9EsDLDIpzVXsaiAcZQNm14o0JNQ021g0NsW15II41qXIrk1oDPL53M89VnbDG_VsdHYeegyL'

const retrieveUsers = "https://engeenx.com/agUserList.php"

const generateAccessToken = async () => {
  try {
    if (!REACT_APP_PAYPAL_CLIENT_ID || !REACT_APP_PAYPAL_CLIENT_SECRET) {
      throw new Error("MISSING_API_CREDENTIALS");
    }
    const auth = Buffer.from(
      `${REACT_APP_PAYPAL_CLIENT_ID}:${REACT_APP_PAYPAL_CLIENT_SECRET}`
    ).toString("base64");
    const response = await axios.post(`${base}/v1/oauth2/token`, 
      "grant_type=client_credentials", 
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error("Failed to generate Access Token:", error);
    throw error;
  }
};

const createOrder = async (cart) => {
  console.log("Shopping cart information:", cart);

  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders`;

  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: "100",
        },
      },
    ],
  };

  const response = await axios.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return handleResponse(response);
};

const handleResponse = (response) => {
  const jsonResponse = response.data;
  const httpStatusCode = response.status;
  if (!response.status) {
    throw new Error(`HTTP ${httpStatusCode}: ${JSON.stringify(jsonResponse)}`);
  }
  return { jsonResponse, httpStatusCode };
};

app.post("/api/orders", async (req, res) => {
  try {
    const { cart } = req.body;
    const { jsonResponse, httpStatusCode } = await createOrder(cart);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to create order." });
  }
});

const captureOrder = async (orderID) => {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders/${orderID}/capture`;

  const response = await axios.post(url, {}, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return handleResponse(response);
};

app.post("/api/orders/:orderID/capture", async (req, res) => {
  try {
    const { orderID } = req.params;
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to capture order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.resolve("./checkout.html"));
});

// Stripe

const calculateTotalUnitAmount = (lineItems) => {
  return lineItems.reduce((total, item) => total + item.price_data.unit_amount, 0);
};

app.post("/create-check-out-session", async (req, res) => {
  const { product } = req.body;

  const line_items = product.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.ag_product_name,
        images: [item.productData.game_cover],
      },
      unit_amount: Math.round(item.totalPrice * 100), // Convert to cents
    },
    quantity: item.numberOfOrder,
  }));

  const totalUnitAmount = calculateTotalUnitAmount(line_items);
  const agChargeFee = (4.5 / 100) * totalUnitAmount;
  const agTaxFee = (3 / 100) * totalUnitAmount;
  const totalPayable = totalUnitAmount + agChargeFee + agTaxFee;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalPayable),
      currency: "usd",
    });
    res.send({
      paymentIntentID: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      line_items,
    });
  } catch (error) {
    console.error("Failed to create payment intent:", error);
    res.status(500).json({ error: "Failed to create payment intent." });
  }
});

app.post("/cancel-payment-intent", async (req, res) => {
  const { paymentIntentId } = req.body;

  try {
    const canceledPaymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    res.status(200).send(canceledPaymentIntent);
  } catch (error) {
    console.error("Failed to cancel payment intent:", error);
    res.status(500).send({ error: error.message });
  }
});

// Link Preview

app.get("/link-preview", async (req, res) => {
  const { url } = req.query;
  try {
    const response = await axios.get(url);
    const html = response.data;

    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    const title = titleMatch ? titleMatch[1] : "No title found";
    const descriptionMatch = html.match(/<meta name="description" content="([^"]*)"/);
    const description = descriptionMatch ? descriptionMatch[1] : "No description found";
    const imageMatch = html.match(/<meta property="og:image" content="([^"]*)"/);
    const image = imageMatch ? imageMatch[1] : "No image found";

    res.json({ title, description, image });
  } catch (error) {
    console.error("Error fetching metadata:", error);
    res.status(500).json({ error: "Error fetching metadata" });
  }
});

app.get("/success", (req, res) => {
  res.send("Payment successful");
});



const forgotPassCode = (length) => {
  const charset = "1234567890";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset.charAt(randomIndex);
  }
  return result;
};

app.post("/forgot-acc-search", async (req, res) => {
  const { email } = req.body;
  try {
    axios.get("https://engeenx.com/agUserEmails.php").then((response => {
      const data = response.data
      const user = data.filter(user => user.email === email)

      const codePass = forgotPassCode(10)
      const recoveryLink = "https://attractgame.com/forgot-password/recovery-code=" + codePass
      const subject = "Forgot Password";
      const text = "Your Recovery Link here: " + recoveryLink;

      let transporter = nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: 'info@attractgame.com',
          pass: 'Korea@2101',
        },
        tls: {
          ciphers: 'SSLv3'
        }
      });

      if (user.length > 0) {
        try {
          let info = transporter.sendMail({
            from: '"Attract Game" <info@attractgame.com>', // sender address
            to: email,
            subject: subject,
            text: text,
          });

          res.status(200).json({ message: 'Email sent successfully', codePass: codePass});
        } catch (error) {
          console.error('Error sending email:', error);
          res.status(500).send('Error sending email');
        }
      }
    }))
  } catch (error) {
    res.json(error)
  }
});


  
const codeConfirmationGenerator = (length) => {
  const charset = "1234567890";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset.charAt(randomIndex);
  }
  return result;
};



app.post('/verify-email', async (req, res) => {
  const { to } = req.body;
  const code = codeConfirmationGenerator(6);
  const subject = "Confirmation Code";
  const text = "Your Confirmation Code is " + code;

  let transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'socialattractgame@gmail.com',
      pass: 'Albert!!2713',
    },
    tls: {
      ciphers: 'SSLv3'
    }
  });

  try {
    let info = await transporter.sendMail({
      from: '"Attract Game" <info@attractgame.com>', // sender address
      to: to,
      subject: subject,
      text: text,
    });

    console.log('Message sent: %s', info.messageId);
    res.status(200).json({ message: 'Email sent successfully', code: code });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).send('Error sending email');
  }
});


// Increase timeout settings
const server = app.listen(4242, () => console.log("Node server listening on port 4242!"));
server.setTimeout(10 * 60 * 1000); // 10 minutes
