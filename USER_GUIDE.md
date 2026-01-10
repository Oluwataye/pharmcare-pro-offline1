# PharmCare Pro Offline - Official Operations Manual

Welcome to **PharmCare Pro Offline**. This manual provides comprehensive instructions for the installation, configuration, and daily operation of your local pharmacy management system.

---

## 1. System Overview & Requirements

PharmCare Pro Offline is designed to operate locally on your computer, ensuring continuous business operations regardless of internet connectivity.

### Minimum System Requirements:
- **Operating System**: Windows 10 or 11 (64-bit).
- **Runtime**: Node.js v18.0.0 or higher (LTS recommended).
- **Database**: MySQL Server 8.0 or higher.
- **Web Browser**: Latest version of Google Chrome or Microsoft Edge.

---

## 2. Setup & Installation Guide (Technicians Only)

Follow these steps precisely when deploying the system on a new workstation.

### 2.1 Prerequisite Installation
1. **Node.js**: Download and install the [LTS Version of Node.js](https://nodejs.org/).
2. **MySQL Server**: Download the **MySQL Installer for Windows** from [the official downloads page](https://dev.mysql.com/downloads/installer/).

### 2.2 MySQL Configuration Walkthrough
Run the MySQL Installer and follow these specific configuration steps:
1. **Setup Type**: Select **"Server Only"** for optimal performance.
2. **Requirements**: If prompted for missing components, click **Execute** to install them before proceeding.
3. **Type & Networking**: Keep defaults (**Port: 3306**). 
   - *Note: If a red exclamation mark appears, change Port to `3307` and X Protocol Port to `33061`.*
4. **Authentication**: Select **"Use Strong Password Encryption"**.
5. **Accounts & Roles**: Set a secure **MySQL Root Password** (e.g., `Admin@123`). **Important: Document this password for Section 2.3.**
6. **Windows Service**: Set Service Name to `MySQL80` and ensure **"Start at System Startup"** is enabled.
7. **Apply Configuration**: Click **Execute** and wait for completion.

### 2.3 Application Environment Setup
1. Navigate to the `server` directory within the project folder.
2. Locate the `.env` file and update the following parameters:
   ```env
   DB_HOST=localhost
   DB_PORT=3306       # Use 3307 if changed during installation
   DB_USER=root
   DB_PASSWORD=YourRootPasswordHere
   PORT=80
   ```

### 2.4 Initialization & Build
Execute the following commands in order from a **Command Prompt** at the project root:
```bash
# Install core application dependencies
npm install

# Generate production frontend assets
npm run build

# Configure backend services
cd server
npm install
npm run init-db
```

### 2.5 Default Application Login
Once the installation script finishes, use these credentials for the **first login**:
*   **Email**: `admin@pharmcarepro.com`
*   **Password**: `Admin@123!`

---

## 3. Daily Operations Guide (Staff Instructions)

These steps should be performed by pharmacy staff at the start of each business day.

### 3.1 Application Startup
1. **Launch**: Locate the **"PharmCare Pro"** icon on your Desktop.
2. **Action**: Double-click the file named `Launch_PharmCare_Silent.vbs` (or your Desktop Shortcut).
3. **Wait**: Allow approximately 10 seconds for the system services to initialize.

### 3.2 Accessing the Interface
- Your default web browser will open automatically to the login screen.
- If it does not open, manually enter `http://localhost:80` into your browser's address bar.
- Use your assigned credentials to log in.

### 3.3 Manual Amount Discount
PharmCare Pro allows administrators to apply a fixed manual discount (between ₦500 and ₦1,000) to a sale.

1. **How to Enable**: 
   - Log in as an **Admin**.
   - Navigate to **Settings > Discount > Advanced**.
   - Toggle **"Manual Amount Discount"** to **ON** and click **Save Changes**.
2. **How to Use**:
   - On the **New Sale** screen, after adding items, look for the **"Manual Discount (₦)"** field in the totals section.
   - Enter an amount between `500` and `1000`.
   - The system will automatically calculate the new total.
3. **Receipts**: The manual discount will appear as a separate line item on the customer's receipt for transparency.

---

---

## 4. Multi-Computer Access (Network Setup)

You can access PharmCare Pro from any computer, tablet, or phone connected to the same Wi-Fi or Local Network.

### 4.1 Server Information
The computer running the main application is the **Server**.
*   **Server IP Address**: `10.14.122.32`
*   **Port**: `80` (Default Web Port)

### 4.2 Connecting Clients (Other Computers)
1.  Connect the device to the **same Wi-Fi network** as this server.
2.  Open a web browser (Chrome, Edge, or Safari).
3.  Enter the following address:
    **`http://10.14.122.32`**
4.  You will see the login screen. Use your staff credentials to log in.

### 4.3 Troubleshooting Connections
*   **"Site cannot be reached"**:
    *   Ensure the **Server** computer is turned ON and `Launch_PharmCare_Silent.vbs` has been run.
    *   Check that both computers are on the same Wi-Fi network.
    *   **Firewall**: Ensure Windows Firewall on the Server allows "Node.js JavaScript Runtime" to communicate on Private Networks.
*   **IP Address Changes**:
    *   If the router restarts, the Server IP (`10.14.122.32`) might change.
    *   To check the new IP: Open Command Prompt on Server and type `ipconfig`. Look for "IPv4 Address".

### 4.4 Advanced: Using the Custom Domain Name
To use `http://pharmcarepro` instead of the IP address on other computers, you must edit the **hosts file** on **EACH** client computer:

1.  Open **Notepad** as Administrator (Right-click > Run as administrator).
2.  Go to **File > Open** and navigate to: `C:\Windows\System32\drivers\etc`
3.  Change the file filter from "Text Documents (*.txt)" to **"All Files (*.*)"**.
4.  Select the file named `hosts` and open it.
5.  Add this line at the very bottom:
    ```
    10.14.122.32 pharmcarepro
    ```
6.  Save the file (`Ctrl + S`).
7.  Now you can access `http://pharmcarepro` on that computer!

---

## 5. Maintenance & Troubleshooting

### 5.1 Data Security & Backups
- **Local Storage**: All data is stored locally on this workstation's MySQL database.
- **Backup Frequency**: We recommend a full database export once per week to an external storage device.
- **Security**: Regularly update your MySQL root and staff passwords to maintain system integrity.

### 5.2 Troubleshooting Common Issues

| Issue | Potential Cause | Resolution |
| :--- | :--- | :--- |
| **"Site cannot be reached"** | Database Service Stopped | Open Windows Services and ensure "MySQL80" is Running. |
| **"Access Denied"** | Incorrect Credentials | Verify staff email and password. Admins can reset staff passwords in settings. |
| **Login Page Hangs** | Server Not Initialized | Close the browser and relaunch using the Desktop Shortcut. |

---
*Developed by T-Tech Solutions*
