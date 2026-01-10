# 🏥 PharmCare Offline: Easy Start Guide!

Hi there! This guide helps you set up your pharmacy software so it works even without the internet. 🌐❌

Think of your main computer as the **"Big Brain"** and your other computers as **"Helpers."**

---

## � What you need (on the Big Brain computer)
1. **Node.js**: This is the engine that makes the software run. [Download it here](https://nodejs.org/) (click the one that says "LTS").
2. **XAMPP**: This is the "Closet" where the software stores all its information. [Download it here](https://www.apachefriends.org/).

---

## 🛠️ Step 1: Wake up the "Closet" (Database)
1. Open **XAMPP** on your computer.
2. Click the **Start** button next to **MySQL**. (It should turn green! ✅)

---

## 🛠️ Step 2: Set up the software
1. Open the folder named `pharmcare-pro offline`.
2. Inside, open the `server` folder.
3. Open a "black screen" (Terminal/CMD) in that folder and type these two magic spells:
   - Type `npm install` and press Enter. (Wait for it to finish)
   - Type `npm run init-db` and press Enter.
   *(The computer will now create the space it needs to remember your medicine and sales!)*

---

## 🛠️ Step 3: Start the program
1. In that same black screen (Run as Administrator!), type one more spell:
   - Type `npm start` and press Enter.
2. You will see some text that tells you the address. 

## 📛 Step 4: Use the Friendly Name
To use the name **http://pharmcarepro/** instead of numbers:
1. Open **Notepad** as Administrator.
2. Open `C:\Windows\System32\drivers\etc\hosts`.
3. At the bottom, add: `127.0.0.1  pharmcarepro`
4. Save it!

## 🌐 How to use it on other computers
1. Make sure the other computers are on the same Wi-Fi.
2. Update the **hosts** file on the other computer too, but use the Big Brain's IP:
   - Example: `169.254.140.26  pharmcarepro`
3. Open Chrome and type: `http://pharmcarepro/` 🎉

---

## 🆘 Troubleshooting (The "Super Fix")

If `http://pharmcarepro/` is not working, try these 3 things:

### 1. The Firewall Fix (Very Important!) ⚔️
Windows often blocks other computers for safety. You need to tell it "It's okay!":
1. Open the **Start Menu** and type **"Windows Defender Firewall with Advanced Security"**.
2. Click **Inbound Rules** on the left.
3. Click **New Rule...** on the right.
4. Choose **Port** -> **TCP** -> type **80** in "Specific local ports".
5. Click **Allow the connection** and keep clicking "Next" until you give it a name like **"Pharmacy App"**.

### 2. Check your "Real" IP Number 🔢
If you see a number starting with `169.254...`, your computers might not be talking correctly.
- Try to connect both computers to the **same Wi-Fi router** or a **Mobile Hotspot**.
- Look for a number that starts with **`192.168...`**. 
- If the number changes, update your **hosts** file with the new number!

### 3. Check the "Magic Spell" screen (Terminal)
- Did you run the terminal as **Administrator**? (Right-click "Command Prompt" -> Run as Admin).
- Is the screen still open? If you close the black screen, the store "closes" too!

---

## 🔑 Your Login Credentials
The system was set up with these **specific** details:
- **Email:** `admin@pharmcare.local`
- **Password:** `Admin@123!`

*(Make sure to type the capital **A** and the **!** at the end!)*
