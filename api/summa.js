const fs = require("fs");
const https = require("https");
const { google } = require("googleapis");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const os = require("os");

const app = express();
const port = 3000;

// Load SSL Certificate & Key
const sslOptions = {
  key: fs.readFileSync("server.key"), // Private Key
  cert: fs.readFileSync("server.cert"), // Certificate
};

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve frontend files

// Google Sheets API Setup
const credentials = require("./credentials.json");
const client = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const spreadsheetId = "1bzydI0lEWDTLPy8Jy--rT1RlWEWaJerUd3dc40Glb2Y";

// Helper to get Sheets client
const getSheetsClient = async () =>
  google.sheets({ version: "v4", auth: await client.getClient() });

// Get local IP for network access
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const ifaceName in interfaces) {
    for (const iface of interfaces[ifaceName]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1"; // Fallback to localhost
}

const localIP = "192.168.145.23";

// Serve frontend (index.html)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Fetch dropdown data from Google Sheets
app.get("/get-data", async (req, res) => {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Data base'!A:F",
    });

    const rows = response.data.values || [];
    if (!rows.length) return res.status(404).json({ message: "No data found" });

    const boxTypes = [...new Set(rows.map((row) => row[0]).filter(Boolean))];
    const operators = [...new Set(rows.map((row) => row[1]).filter(Boolean))];
    const assemblyWorkers = [...new Set(rows.map((row) => row[2]).filter(Boolean))];
    const qcInspectors = [...new Set(rows.map((row) => row[3]).filter(Boolean))];
    const pendingItems = [...new Set(rows.map((row) => row[5]).filter(Boolean))];

    res.status(200).json({
      boxTypes,
      operators,
      assemblyWorkers,
      qcInspectors,
      pendingItems,
    });
  } catch (error) {
    console.error("Error fetching dropdown data:", error.message);
    res.status(500).json({ message: "Failed to fetch dropdown data" });
  }
});

// Process QR data and store it in Google Sheets
app.post("/process-qr", async (req, res) => {
  const { qrId, operation, data } = req.body;

  console.log("Received request data:", req.body);

  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'getdata'!A:Y",
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0] === qrId);

    if (rowIndex === -1) {
      const newRow = createInitialRow(qrId, operation, data);
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'getdata'!A:Y",
        valueInputOption: "USER_ENTERED",
        resource: { values: [newRow] },
      });
      return res.status(200).json({ message: "New QR ID added successfully." });
    }

    const updateRange = getUpdateRange(operation, rowIndex + 1,data);
    const updateValues = getUpdateValues(operation, data);

    if (!updateRange || !updateValues.length) {
      return res.status(400).json({ message: "Invalid operation or data." });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: "USER_ENTERED",
      resource: { values: [updateValues] },
    });

    res.status(200).json({ message: `${operation} updated for QR ID ${qrId}.` });
  } catch (error) {
    console.error("Error processing QR data:", error);
    res.status(500).json({ message: "Failed to process QR data." });
  }
});

// Utility functions
const createInitialRow = (qrId, operation, data) => {
  const row = Array(25).fill("");
  row[0] = qrId;
  const operationValues = getUpdateValues(operation, data);
  if (operationValues) {
    for (let i = 0; i < operationValues.length; i++) {
      row[i + 1] = operationValues[i];
    }
  }
  return row;
};

const getUpdateRange = (operation, rowIndex,data) => {
  const ranges = {
    "Production Details": `'getdata'!B${rowIndex}:D${rowIndex}`,
    "Moved to Assembly": `'getdata'!E${rowIndex}`,
    "Accessory": data.status == "start" ? `'getdata'!G${rowIndex}` : `'getdata'!H${rowIndex}`,
    "Assembly": data.status === "start" ? `'getdata'!I${rowIndex}:J${rowIndex}` : `'getdata'!K${rowIndex}`,
    "QC": data.status === "start" ? `'getdata'!L${rowIndex}:M${rowIndex}` : `'getdata'!N${rowIndex}:P${rowIndex}`,
    "Rework": data.status === "start" ? `'getdata'!Q${rowIndex}:R${rowIndex}` : `'getdata'!S${rowIndex}`,
    "Final QC": data.status === "start" ? `'getdata'!T${rowIndex}:U${rowIndex}` : `'getdata'!V${rowIndex}:W${rowIndex}`,
    "Packing": `'getdata'!Y${rowIndex}`,
    "Order ID": `'getdata'!F${rowIndex}`,
    "Screen Print and Flamming": `'getdata'!X${rowIndex}`,
};

return ranges[operation] || "";
};

const getUpdateValues = (operation, data) => {
  const values = {  
    "Production Details": [data.operator, data.boxType, data.productionDateTime],
    "Moved to Assembly": [data.movedToAssembly ? "Yes" : "No"],
    "Accessory": data.status === "start" ? [data.accessoryStart] : [data.accessoryEnd],
    "Assembly":
      data.status === "start"
        ? [data.assemblyWorker, data.assemblyStart]
        : [data.assemblyEnd],
    "QC":
      data.status === "start"
        ? [data.qcInspector, data.qcStart]
        : [data.qcEnd, data.qcResult, data.rework],
    "Rework":
      data.status === "start"
        ? [data.reworkerName, data.reworkStart]
        : [data.reworkEnd],
    "Final QC":
      data.status === "start"
        ? [data.finalQcInspector, data.finalQcStart]
        : [data.finalQcEnd, data.finalQcResult],
    "Packing": [data.packing],
    "Order ID": [data.orderId],
    "Screen Print and Flamming": [data.screenPrintFlamming ? "Yes" : "No"],
  };

  return values[operation] || [];
};

// Start HTTPS server
https.createServer(sslOptions, app).listen(port, localIP, () => {
  console.log(`Server running at https://${localIP}:${port}`);
});
