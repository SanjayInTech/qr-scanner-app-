// ✅ Backend server configuration
const backendUrl = "https://192.168.145.23:3000"; // Update with your actual server IP

// ✅ Initialize on page load
window.onload = async function () {
    try {
        console.log("Initializing page...");
        

        // ✅ Load URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const uniqueID = urlParams.get("uniqueID") || "N/A";
        const boxType = urlParams.get("boxType") || "N/A";
        const operator = urlParams.get("operator") || "N/A";
        const timestamp = urlParams.get("timestamp") || getISTTimestamp();

        // ✅ Check if elements exist before assigning values
        if (!document.getElementById("qrIdDisplay") ||
            !document.getElementById("boxTypeDisplay") ||
            !document.getElementById("operatorDisplay")) {
            throw new Error("Required elements missing in the HTML");
        }

        // ✅ Populate display fields (ensure they are visible)
        document.getElementById("qrIdDisplay").textContent = uniqueID;
        document.getElementById("boxTypeDisplay").textContent = boxType;
        document.getElementById("operatorDisplay").textContent = operator;

        console.log("Loaded Parameters:", { uniqueID, boxType, operator, timestamp });

        // ✅ Ensure API connectivity
        await fetchDropdownOptions();

    } catch (error) {
        console.error("Initialization Error:", error);
        alert("Failed to initialize page. Please try again.");
    }
};
function getISTTimestamp() {
  const now = new Date();
  
  // Convert to IST (Indian Standard Time)
  const ISTTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));

  // Format as YYYY-MM-DDTHH:MM (for datetime-local input)
  const year = ISTTime.getFullYear();
  const month = String(ISTTime.getMonth() + 1).padStart(2, "0");
  const day = String(ISTTime.getDate()).padStart(2, "0");
  const hours = String(ISTTime.getHours()).padStart(2, "0");
  const minutes = String(ISTTime.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
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
        populateDropdown("operationSelect", [" ",
            "Production Details","Order ID", "Moved to Assembly", "Accessory",
            "Assembly", "QC", "Rework", "Final QC", "Packing",
             "Screen Print and Flamming"
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
  
  // Populate a dropdown dynamically
  function populateDropdown(dropdownId, options, placeholder, defaultValue = null) {

    
    const dropdown = document.getElementById(dropdownId);
    dropdown.innerHTML = "";

    // Add a placeholder option
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    placeholderOption.disabled = true;
    dropdown.appendChild(placeholderOption);

    // Add options to dropdown
    options.forEach(optionValue => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        if (optionValue === defaultValue) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    });

   
}

  // Handle operation selection and generate relevant fields
 // Handle operation selection and generate relevant fields
function handleOperationSelection() {
    const selectedOperation = document.getElementById("operationSelect").value;
    const dynamicFieldsContainer = document.getElementById("dynamicFields");
    dynamicFieldsContainer.innerHTML = ""; // Clear existing fields
    // ✅ Retrieve scanned values from display
    const boxType = document.getElementById("boxTypeDisplay").textContent;
    const operator = document.getElementById("operatorDisplay").textContent;
    const now = new Date();
        
        const istOffset = 5.5 * 60 * 60 * 1000; // +5:30 hours in milliseconds
        const istDate = new Date(now.getTime() + istOffset);
    
        // Format for `datetime-local` (YYYY-MM-DDTHH:MM)
        const timestamp = istDate.toISOString().split("Z")[0].slice(0, 16);
  
    // Define operation-specific field templates
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
        <select id="accessoryStatus" name="accessoryStatus" onchange="handleAccessoryStatus()">
          <option value="" disabled selected>Select Status</option>
          <option value="start">Start</option>
          <option value="end">End</option>
        </select>
        <div id="accessoryFields"></div>
      `,
      "Assembly": `
        <label for="assemblyStatus">Assembly Status:</label>
        <select id="assemblyStatus" name="assemblyStatus" onchange="handleAssemblyStatus()">
          <option value="" disabled selected>Select Status</option>
          <option value="start">Start</option>
          <option value="end">End</option>
        </select>
        <div id="assemblyFields"></div>
      `,
      "QC": `
        <label for="qcStatus">QC Status:</label>
        <select id="qcStatus" name="qcStatus" onchange="handleQCStatus()">
          <option value="" disabled selected>Select Status</option>
          <option value="start">Start</option>
          <option value="end">End</option>
        </select>
        <div id="qcFields"></div>
      `,
      "Rework": `
        <label for="reworkStatus">Rework Status:</label>
        <select id="reworkStatus" name="reworkStatus" onchange="handleReworkStatus()">
          <option value="" disabled selected>Select Status</option>
          <option value="start">Start</option>
          <option value="end">End</option>
        </select>
        <div id="reworkFields"></div>
      `,
      "Final QC": `
        <label for="finalQCStatus">Final QC Status:</label>
        <select id="finalQCStatus" name="finalQCStatus" onchange="handleFinalQCStatus()">
          <option value="" disabled selected>Select Status</option>
          <option value="start">Start</option>
          <option value="end">End</option>
        </select>
        <div id="finalQCFields"></div>
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
  
    // Populate the dynamic fields container
    if (operations[selectedOperation]) {
        dynamicFieldsContainer.innerHTML = operations[selectedOperation];
        console.log("Fields rendered for operation:", selectedOperation);
      } else {
        dynamicFieldsContainer.innerHTML = `<p>Please select a valid operation.</p>`;
        console.error("Invalid operation selected");
      }
  }
  
  

  function handleQCStatus() {
    const status = document.getElementById("qcStatus").value;
    const qcFields = document.getElementById("qcFields");
    const now = new Date();
        
        const istOffset = 5.5 * 60 * 60 * 1000; // +5:30 hours in milliseconds
        const istDate = new Date(now.getTime() + istOffset);
    
        // Format for `datetime-local` (YYYY-MM-DDTHH:MM)
        const timestamp = istDate.toISOString().split("Z")[0].slice(0, 16);
  
    qcFields.innerHTML =
      status === "start"
        ? `
        <label for="qcInspector">QC Inspector Name:</label>
        <input type="text" id="qcInspector" placeholder="Enter Inspector Name" required>
  
        <label for="qcStart">QC Start Date/Time:</label>
        <input type="datetime-local" id="qcStart" value="${timestamp}" readonly>
      `
        : `
        <label for="qcEnd">QC End Date/Time:</label>
        <input type="datetime-local" id="qcEnd" value="${timestamp}" readonly>
  
        <label for="qcResult">QC Result:</label>
        <select id="qcResult" onchange="handleQCResultChange()">
          <option value="" disabled selected>Select Result</option>
          <option value="good">Good</option>
          <option value="rework">Rework</option>
          <option value="waste">Waste</option>
        </select>
        
        <div id="reworkField" class="hidden"></div>
      `;
  }
  
  // Dynamically handle the QC Result selection
  function handleQCResultChange() {
    const qcResult = document.getElementById("qcResult").value;
    const reworkField = document.getElementById("reworkField");
  
    if (qcResult === "rework") {
      reworkField.classList.remove("hidden"); 
      reworkField.innerHTML = `
        <label for="reworkDetails">Rework Details:</label>
        <input type="text" id="reworkDetails" name="reworkDetails" placeholder="Enter Rework Details" required>
      `;
    } else {
      reworkField.classList.add("hidden");
      reworkField.innerHTML = ""; // Clear content when not rework
    }
  }
   
  
  function handleAssemblyStatus() {
    const status = document.getElementById("assemblyStatus").value;
    const assemblyFields = document.getElementById("assemblyFields");
    const now = new Date();
        
        const istOffset = 5.5 * 60 * 60 * 1000; // +5:30 hours in milliseconds
        const istDate = new Date(now.getTime() + istOffset);
    
        // Format for `datetime-local` (YYYY-MM-DDTHH:MM)
        const timestamp = istDate.toISOString().split("Z")[0].slice(0, 16);

   
    
    assemblyFields.innerHTML =
      status === "start"
        ? `
        <label for="assemblyWorker">Assembly Worker Name:</label>
        <input type="text" id="assemblyWorker" placeholder="Enter Worker Name" required>
  
        <label for="assemblyStart">Assembly Start Date/Time:</label>
        <input type="datetime-local" id="assemblyStart" value="${timestamp}" readonly>
      `
        : `
        <label for="assemblyEnd">Assembly End Date/Time:</label>
        <input type="datetime-local" id="assemblyEnd" value="${timestamp}" readonly>
      `;
  }
  
  
  
  function handleReworkStatus() {
    const status = document.getElementById("reworkStatus").value;
    const reworkFields = document.getElementById("reworkFields");
    const now = new Date();
        
        const istOffset = 5.5 * 60 * 60 * 1000; // +5:30 hours in milliseconds
        const istDate = new Date(now.getTime() + istOffset);
    
        // Format for `datetime-local` (YYYY-MM-DDTHH:MM)
        const timestamp = istDate.toISOString().split("Z")[0].slice(0, 16);
  
    reworkFields.innerHTML =
      status === "start"
        ? `
        <label for="reworkWorker">Rework Worker Name:</label>
        <input type="text" id="reworkerName" placeholder="Enter Worker Name">
  
        <label for="reworkStart">Rework Start Date/Time:</label>
        <input type="datetime-local" id="reworkStart" value="${timestamp}" readonly>
      `
        : `
        <label for="reworkEnd">Rework End Date/Time:</label>
        <input type="datetime-local" id="reworkEnd" value="${timestamp}" readonly>
      `;
  }
  
  
  
  function handleFinalQCStatus() {
    const status = document.getElementById("finalQCStatus").value;
    const finalQCFields = document.getElementById("finalQCFields");
    const now = new Date();
        
        const istOffset = 5.5 * 60 * 60 * 1000; // +5:30 hours in milliseconds
        const istDate = new Date(now.getTime() + istOffset);
    
        // Format for `datetime-local` (YYYY-MM-DDTHH:MM)
        const timestamp = istDate.toISOString().split("Z")[0].slice(0, 16);
  
    finalQCFields.innerHTML =
      status === "start"
        ? `
        <label for="finalQCInspector">Final QC Inspector Name:</label>
        <input type="text" id="finalQcInspector" placeholder="Enter Inspector Name">
  
        <label for="finalQCStart">Final QC Start Date/Time:</label>
        <input type="datetime-local" id="finalQcStart" value="${timestamp}" readonly>
      `
        : `
        <label for="finalQCEnd">Final QC End Date/Time:</label>
        <input type="datetime-local" id="finalQcEnd" value="${timestamp}" readonly>
  
        <label for="finalQCResult">Final QC Result:</label>
        <select id="finalQcResult">
          <option value="good">Good</option>
          <option value="waste">Waste</option>
        </select>
      `;
  }
  
  
  
  
      function handleAccessoryStatus() {
        const status = document.getElementById("accessoryStatus").value;
        const accessoryFields = document.getElementById("accessoryFields");
        const now = new Date();
        
        const istOffset = 5.5 * 60 * 60 * 1000; // +5:30 hours in milliseconds
        const istDate = new Date(now.getTime() + istOffset);
    
        // Format for `datetime-local` (YYYY-MM-DDTHH:MM)
        const timestamp = istDate.toISOString().split("Z")[0].slice(0, 16);
  
        accessoryFields.innerHTML = status === "start"
          ? `<label for="accessoryStart">Accessory Start Date/Time:</label>
             <input type="datetime-local" id="accessoryStart" value="${timestamp}" readonly>`
          : `<label for="accessoryEnd">Accessory End Date/Time:</label>
             <input type="datetime-local" id="accessoryEnd" value="${timestamp}" readonly>`;
      }
  
  // Handle form submission
 // Handle form submission
 async function handleSubmit(event) {
  event.preventDefault();

  const qrId = document.getElementById("qrIdDisplay").textContent;
    const operation = document.getElementById("operationSelect").value.trim();

  // Validate QR ID and operation
  if (!qrId || !operation) {
      alert("QR ID or Operation is missing. Please scan a valid QR code and select an operation.");
      return;
  }

  // Show loading indicator
  document.getElementById("loading").style.display = "block";

  const data = {};
  const dynamicFields = document.querySelectorAll("#dynamicFields input, #dynamicFields select");

  try {
      dynamicFields.forEach((field) => {
          const { id, value, type, checked, disabled } = field;

          // Skip disabled fields
          if (disabled) return;

          // Validate required fields
          if (value.trim() === "" && !field.hasAttribute("optional")) {
              throw new Error(`Please fill out the required field: ${field.name || id}`);
          }

          // Capture specific status fields for operations with staged logic
          if (["accessoryStatus", "assemblyStatus", "qcStatus", "finalQCStatus", "reworkStatus"].includes(id)) {
              data["status"] = value;
          }

          // Add other fields to `data`
          data[id] = type === "checkbox" ? checked : value.trim();
      });

      // Debugging: Log the payload before submission
      console.log("Payload to Submit:", { qrId, operation, data });

      // Send data to the server
      const response = await fetch(`${backendUrl}/process-qr`, { // ✅ Using IPv4 address
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrId, operation, data }),
      });

      // Handle the server response
      if (response.ok) {
          const result = await response.json();
          alert("Data submitted successfully.");
          console.log("Submission Success:", result);
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
      // Hide loading indicator after submission attempt
      document.getElementById("loading").style.display = "none";
  }
}

