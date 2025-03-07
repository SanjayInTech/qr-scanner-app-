// ✅ Backend server configuration
const backendUrl = "http://192.168.251.23:3000"; // Update with your actual server IP

// ✅ Initialize on page load
window.onload = async function () {
    try {
        console.log("Initializing page...");

        // ✅ Load URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const uniqueID = urlParams.get("uniqueID") || "N/A";
        const boxType = urlParams.get("boxType") || "N/A";
        const operator = urlParams.get("operator") || "N/A";
        const timestamp = urlParams.get("timestamp") || new Date().toISOString();

        // ✅ Populate display fields (ensure they are visible)
        document.getElementById("qrIdDisplay").textContent = uniqueID;
        document.getElementById("boxTypeDisplay").textContent = boxType;
        document.getElementById("operatorDisplay").textContent = operator;

        // ✅ Ensure API connectivity
        await fetchDropdownOptions();

    } catch (error) {
        console.error("Initialization Error:", error);
        alert("Failed to initialize page. Please try again.");
    }
};

// ✅ Fetch dropdown options from API
async function fetchDropdownOptions() {
    try {
        console.log("Fetching dropdown data...");
        const response = await fetch(`${backendUrl}/get-data`);

        if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Dropdown Data Loaded:", data);

        // ✅ Populate operation dropdown
        populateDropdown("operationSelect", [
            "Production Details", "Moved to Assembly", "Accessory",
            "Assembly", "QC", "Rework", "Final QC", "Packing",
            "Order ID", "Screen Print and Flamming"
        ], "Select an operation");

    } catch (error) {
        console.error("Dropdown Fetch Error:", error);
        showError("Failed to load dropdown options. Please reload the page.");
    }
}

// ✅ Show Error Messages
function showError(message) {
    alert(message);
}

// ✅ Populate a dropdown dynamically
function populateDropdown(dropdownId, options, placeholder) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;

    options.forEach(optionValue => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        dropdown.appendChild(option);
    });
}

// ✅ Handle operation selection and generate relevant fields
function handleOperationSelection() {
    const selectedOperation = document.getElementById("operationSelect").value;
    const dynamicFieldsContainer = document.getElementById("dynamicFields");
    dynamicFieldsContainer.innerHTML = ""; // Clear existing fields

    // Get current timestamp
    const timestamp = new Date().toISOString().slice(0, 16);

    // ✅ Retrieve scanned values from display
    const boxType = document.getElementById("boxTypeDisplay").textContent;
    const operator = document.getElementById("operatorDisplay").textContent;

    // ✅ Define operation-specific field templates
    const operations = {
        "Production Details": `
            <label for="operator">Operator:</label>
            <input type="text" id="operator" name="operator" value="${operator}" readonly>

            <label for="productionDateTime">Production Date/Time:</label>
            <input type="datetime-local" id="productionDateTime" name="productionDateTime" value="${timestamp}" readonly>

            <label for="boxType">Box Type:</label>
            <input type="text" id="boxType" name="boxType" value="${boxType}" readonly>
        `,
        "Moved to Assembly": `
            <label for="movedToAssembly">Moved to Assembly:</label>
            <input type="checkbox" id="movedToAssembly" name="movedToAssembly">
        `,
        "Accessory": `
            <label for="accessoryStatus">Accessory Status:</label>
            <select id="accessoryStatus" name="accessoryStatus">
                <option value="" disabled selected>Select Status</option>
                <option value="start">Start</option>
                <option value="end">End</option>
            </select>
        `,
        "Assembly": `
            <label for="assemblyStatus">Assembly Status:</label>
            <select id="assemblyStatus" name="assemblyStatus">
                <option value="" disabled selected>Select Status</option>
                <option value="start">Start</option>
                <option value="end">End</option>
            </select>
        `,
        "QC": `
            <label for="qcStatus">QC Status:</label>
            <select id="qcStatus" name="qcStatus">
                <option value="" disabled selected>Select Status</option>
                <option value="start">Start</option>
                <option value="end">End</option>
            </select>
        `,
        "Final QC": `
            <label for="finalQCStatus">Final QC Status:</label>
            <select id="finalQCStatus" name="finalQCStatus">
                <option value="" disabled selected>Select Status</option>
                <option value="start">Start</option>
                <option value="end">End</option>
            </select>
        `,
        "Packing": `
            <label for="packingCompleted">Packing Completed:</label>
            <input type="checkbox" id="packing" name="packingCompleted">
        `,
        "Order ID": `
            <label for="orderId">Order ID:</label>
            <input type="text" id="orderId" name="orderId" placeholder="Enter Order ID">
        `,
        "Screen Print and Flamming": `
            <label for="screenPrintFlamming">Screen Print and Flamming:</label>
            <input type="checkbox" id="screenPrintFlamming" name="screenPrintFlamming">
        `,
    };

    // ✅ Populate the dynamic fields container
    if (operations[selectedOperation]) {
        dynamicFieldsContainer.innerHTML = operations[selectedOperation];
        console.log("Fields rendered for operation:", selectedOperation);
    } else {
        dynamicFieldsContainer.innerHTML = `<p>Please select a valid operation.</p>`;
        console.error("Invalid operation selected");
    }
}

// ✅ Handle form submission
async function handleSubmit(event) {
    event.preventDefault();

    const qrId = document.getElementById("qrIdDisplay").textContent;
    const operation = document.getElementById("operationSelect").value.trim();

    // ✅ Validate required fields
    if (!qrId || !operation) {
        alert("QR ID or Operation is missing. Please scan a valid QR code and select an operation.");
        return;
    }

    // ✅ Show loading indicator
    document.getElementById("loading").style.display = "block";

    const data = {};
    const dynamicFields = document.querySelectorAll("#dynamicFields input, #dynamicFields select");

    try {
        dynamicFields.forEach((field) => {
            const { id, value, type, checked, disabled } = field;

            if (disabled) return;
            if (value.trim() === "") throw new Error(`Please fill out the required field: ${field.name || id}`);

            data[id] = type === "checkbox" ? checked : value.trim();
        });

        console.log("Payload to Submit:", { qrId, operation, data });

        const response = await fetch(`${backendUrl}/process-qr`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qrId, operation, data }),
        });

        if (response.ok) {
            alert("Data submitted successfully.");
            window.location.href = "index.html";
        } else {
            const errorMessage = await response.text();
            console.error("Submission Error:", errorMessage);
            alert(`Failed to submit data: ${errorMessage}`);
        }
    } catch (error) {
        console.error("Error:", error.message);
        alert(`Validation Error: ${error.message}`);
    } finally {
        document.getElementById("loading").style.display = "none";
    }
}
