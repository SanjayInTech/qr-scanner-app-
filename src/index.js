let html5QrCode;
let scanTimestamp = ""; // Timestamp for scanned QR code

// ✅ Updated API BASE URL with your correct IPv4
const API_BASE_URL = "http://localhost:3000"; // Change if the IP updates

// 🔹 Show QR Scanner
function showScanner() {
    document.getElementById("qr-scanner-section").style.display = "block";
    document.getElementById("qr-generator-section").style.display = "none";
    document.getElementById("result").innerHTML = "Scan a QR code to see the result here.";
    startScanner();
}

// 🔹 Start the QR Scanner
function startScanner() {
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qr-reader");
    }

    const config = { fps: 10, qrbox: 250 };

    html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        console.error("Unable to start QR scanner:", err);
        alert("Failed to start QR scanner. Please check your camera permissions.");
    });
}

// 🔹 Stop QR Scanner
function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById("result").innerHTML = "Scanner stopped.";
        }).catch(err => console.error("Failed to stop scanning:", err));
    }
}

// 🔹 Show QR Code Generator
function showGenerator() {
    document.getElementById("qr-scanner-section").style.display = "none";
    document.getElementById("qr-generator-section").style.display = "block";
    stopScanner();
    populateDropdowns();
}

// 🔹 Fetch & Populate Dropdowns
async function populateDropdowns() {
    try {
        console.log("Fetching dropdown data from API...");
        const response = await fetch(`${API_BASE_URL}/get-data`);

        if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Dropdown Data Loaded:", data);

        if (!data.boxTypes || !data.operators) {
            throw new Error("Invalid API response format.");
        }

        populateDropdown("boxTypeSelect", data.boxTypes, "Select Box Type");
        populateDropdown("operatorNameSelect", data.operators, "Select Operator Name");

    } catch (error) {
        console.error("Error fetching dropdown data:", error);
        alert("Failed to load dropdown data. Check your API and Wi-Fi connection.");
    }
}

// 🔹 Populate a Dropdown
function populateDropdown(dropdownId, options, placeholder) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.innerHTML = "";

    // Placeholder Option
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    placeholderOption.disabled = true;
    dropdown.appendChild(placeholderOption);

    // Add API Data Options
    options.forEach(optionValue => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        dropdown.appendChild(option);
    });

    dropdown.selectedIndex = 0; // Ensure placeholder is selected by default
}

// 🔹 QR Code Scan Success Handler
function onScanSuccess(decodedText) {
    scanTimestamp = new Date().toISOString();
    document.getElementById("result").innerHTML = `Scanned QR Code: ${decodedText}`;
    console.log(`QR Code scanned: ${decodedText}`);

    const qrData = parseQRCodeData(decodedText);
    const uniqueID = qrData["QR ID"];
    const boxType = qrData["Box Type"];
    const operator = qrData["Operator"];

    console.log(`Parsed Data - QR ID: ${uniqueID}, Box Type: ${boxType}, Operator: ${operator}`);

    if (uniqueID && boxType && operator) {
        window.location.href = `getdata.html?uniqueID=${encodeURIComponent(uniqueID)}&boxType=${encodeURIComponent(boxType)}&operator=${encodeURIComponent(operator)}&timestamp=${encodeURIComponent(scanTimestamp)}`;
    } else {
        alert("Error: Missing data in the scanned QR code.");
    }
}

// 🔹 QR Code Scan Failure Handler
function onScanFailure(error) {
    console.warn("QR Code scan failed:", error);
    document.getElementById("result").innerText = "Failed to scan QR Code. Please try again.";
}

// 🔹 Parse QR Code Data
function parseQRCodeData(decodedText) {
    try {
        return decodedText.split(", ").reduce((acc, item) => {
            const [key, value] = item.split(": ");
            acc[key?.trim()] = value?.trim();
            return acc;
        }, {});
    } catch (error) {
        console.error("Error parsing QR Code data:", error);
        return {};
    }
}

// 🔹 Generate QR Code
function generateQRCode() {
    const qrId = document.getElementById("qrIdInput").value;
    const boxType = document.getElementById("boxTypeSelect").value;
    const operatorName = document.getElementById("operatorNameSelect").value;

    if (!qrId || !boxType || !operatorName) {
        alert("Please fill out all fields: QR ID, Box Type, and Operator Name.");
        return;
    }

    const qrData = `QR ID: ${qrId}, Box Type: ${boxType}, Operator: ${operatorName}`;

    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), {
        text: qrData,
        width: 200,
        height: 200,
    });
}
