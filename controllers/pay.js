const { BakongKHQR, khqrData, IndividualInfo } = require("bakong-khqr");

// Define optional transaction data
const optionalData = {
  currency: khqrData.currency.khr, // Use KHR currency
  amount: 100, // Amount in cents/smallest unit (e.g., 100,000 for 1000 KHR depending on library version/spec)
  billNumber: "#0001",
  mobileNumber: "85251742",
  storeLabel: "smartmove",
  terminalLabel: "Vichet",
};

// Create an individual information object
const individualInfo = new IndividualInfo(
  "vichet_choub@bkrt", // Bakong Account ID
  khqrData.currency.khr,
  "Vichet Choub", // Merchant Name
  "Phnom Penh", // Merchant City
  optionalData
);

// Instantiate the BakongKHQR generator
const khqr = new BakongKHQR();

// Generate the KHQR response string
const response = khqr.generateIndividual(individualInfo);
console.log(response);