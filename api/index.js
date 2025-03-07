const { google } = require("googleapis");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const port =3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

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

// Fetch dropdown data
app.get("/get-data", async (req, res) => {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Data base'!A:F", // Fetch relevant columns for dropdowns from 'getdata'
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

// Process QR data
app.post("/process-qr", async (req, res) => {
  const { qrId, operation, data } = req.body;
  const requiredFields = {
    "Production Details": ["operator", "boxType", "productionDateTime"],
    "Moved to Assembly": ["movedToAssembly"],
    "Accessory": { start: ["accessoryStart"], end: ["accessoryEnd"] },
    "Assembly": { start: ["assemblyWorker", "assemblyStart"], end: ["assemblyEnd"] },
    "QC": { start: ["qcInspector", "qcStart"], end: ["qcEnd", "qcResult", "rework"] },
    "Rework": { start: ["reworkerName", "reworkStart"], end: ["reworkEnd"] },
    "Final QC": { start: ["finalQcInspector", "finalQcStart"], end: ["finalQcEnd", "finalQcResult"] },
    "Packing": ["packing"],
    "Order ID": ["orderId"],
    "Screen Print and Flamming": ["screenPrintFlamming"],
  };

  const operationStage = data.status?.toLowerCase();
  let requiredForOperation;

  if (typeof requiredFields[operation] === "object" && operationStage) {
    requiredForOperation = requiredFields[operation][operationStage];
    if (!requiredForOperation) {
      console.error(`Invalid stage: ${operationStage} for operation: ${operation}`);
      return res.status(400).json({ message: `Invalid stage: ${operationStage} for operation: ${operation}` });
    }
  } else {
    requiredForOperation = requiredFields[operation];
  }

  if (!Array.isArray(requiredForOperation)) {
    console.error(`Invalid operation: ${operation}`);
    return res.status(400).json({ message: "Invalid operation or stage." });
  }

  const missingFields = requiredForOperation.filter((field) => {
    if (field === "rework" && data.qcResult !== "Rework") return false;
    return !data[field];
  });

  if (missingFields.length > 0) {
    console.error(`Missing fields: ${missingFields.join(", ")}`);
    return res.status(400).json({
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'getdata'!A:Y", // Explicitly target the "getdata" sheet
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0] === qrId);

    if (rowIndex === -1) {
      const newRow = createInitialRow(qrId, operation, data);
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'getdata'!A:Y", // Append to the "getdata" sheet
        valueInputOption: "USER_ENTERED",
        resource: { values: [newRow] },
      });
      return res.status(200).json({ message: "New QR ID added successfully." });
    }

    const updateRange = getUpdateRange(operation, rowIndex + 1, operationStage);
    const updateValues = getUpdateValues(operation, data, operationStage);

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

// Utility function to create an initial row
const createInitialRow = (qrId, operation, data) => {
  const row = Array(25).fill(""); // Create an empty row with 25 columns
  row[0] = qrId; // QR ID

  const operationValues = getUpdateValues(operation, data);
  if (operationValues) {
    for (let i = 0; i < operationValues.length; i++) {
      row[i + 1] = operationValues[i]; // Adjust index based on the actual column layout
    }
  }

  return row;
};

// Utility function to get the update range for an operation
const getUpdateRange = (operation, rowIndex, stage) => {
  const ranges = {
    "Production Details": `'getdata'!B${rowIndex}:D${rowIndex}`,
    "Moved to Assembly": `'getdata'!E${rowIndex}`,
    "Accessory": stage === "start" ? `'getdata'!G${rowIndex}` : `'getdata'!H${rowIndex}`,
    "Assembly": stage === "start" ? `'getdata'!I${rowIndex}:J${rowIndex}` : `'getdata'!K${rowIndex}`,
    "QC": stage === "start" ? `'getdata'!L${rowIndex}:M${rowIndex}` : `'getdata'!N${rowIndex}:P${rowIndex}`,
    "Rework": stage === "start" ? `'getdata'!Q${rowIndex}:R${rowIndex}` : `'getdata'!S${rowIndex}`,
    "Final QC": stage === "start" ? `'getdata'!T${rowIndex}:U${rowIndex}` : `'getdata'!V${rowIndex}:W${rowIndex}`,
    "Packing": `'getdata'!Y${rowIndex}`,
    "Order ID": `'getdata'!F${rowIndex}`,
    "Screen Print and Flamming": `'getdata'!X${rowIndex}`,
  };
  
  return ranges[operation] || "";
};


app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Accessible over the network at http://localhost:${port}`);
});

// Utility function to get local IP address
function getLocalIP() {
  const os = require("os");
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const iface = interfaces[interfaceName];
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) {
        return alias.address;
      }
    }
  }
  return "127.0.0.1";
}
// Utility function to get update values for an operation
const getUpdateValues = (operation, data, stage = null) => {
  const values = {
    "Production Details": [data.operator, data.boxType, data.productionDateTime],
    "Moved to Assembly": [data.movedToAssembly ? "Yes" : "No"],
    "Accessory": stage === "start" ? [data.accessoryStart] : [data.accessoryEnd],
    "Assembly":
      stage === "start"
        ? [data.assemblyWorker, data.assemblyStart]
        : [data.assemblyEnd],
    "QC":
      stage === "start"
        ? [data.qcInspector, data.qcStart]
        : [data.qcEnd, data.qcResult, data.rework],
    "Rework":
      stage === "start"
        ? [data.reworkerName, data.reworkStart]
        : [data.reworkEnd],
    "Final QC":
      stage === "start"
        ? [data.finalQcInspector, data.finalQcStart]
        : [data.finalQcEnd, data.finalQcResult],
    "Packing": [data.packing],
    "Order ID": [data.orderId],
    "Screen Print and Flamming": [data.screenPrintFlamming ? "Yes" : "No"],
  };

  return values[operation] || [];
};

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
