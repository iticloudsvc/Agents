const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config();

// Bypass puppeteer download issues completely
process.env.PUPPETEER_EXECUTABLE_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// 1. Load System Prompt & Inventory from files
const systemPromptBase = fs.readFileSync('prompt.txt', 'utf8');
let inventoryData = '';
if (fs.existsSync('inventory.txt')) {
    inventoryData = fs.readFileSync('inventory.txt', 'utf8');
}
const systemPrompt = systemPromptBase + "\n\n=== ADDITIONAL BUSINESS INVENTORY ===\n" + inventoryData;

// 2. Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-flash-lite-latest",
    systemInstruction: systemPrompt 
});

// 3. Store Chat Sessions (Memory) for each user
// Isse AI har customer ki chat history, naam, aur missing documents yaad rakhega
const userChats = new Map();
const leadsSent = new Set();

// 4. Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});

// 5. Generate and Display QR Code
client.on('qr', (qr) => {
    console.log('\n==================================================');
    console.log('👇 Neeche diye gaye QR Code ko WhatsApp se scan karein 👇');
    console.log('==================================================\n');
    qrcode.generate(qr, { small: true });
});

let isBotReady = false;

client.on('ready', () => {
    isBotReady = true;
    console.log('\n✅ Badhai ho! Aapka Axis Bank AI Bot (Ritu) ab LIVE hai!\n');
});

// Helper function to retry AI calls if Google Server is overloaded or history is corrupted
async function sendMessageWithRetry(userId, chat, messageBody, retries = 3) {
    const enrichedMessage = `[System Note: Current Date & Time is ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}] Customer: ${messageBody}`;
    for (let i = 0; i < retries; i++) {
        try {
            const result = await chat.sendMessage(enrichedMessage);
            return result.response.text();
        } catch (error) {
            if (error.status === 503 && i < retries - 1) {
                console.log(`⏳ Google Server busy (503). Retrying in 3 seconds... (Attempt ${i + 1})`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            } else if (error.message && (error.message.includes('400') || error.message.includes('model turn'))) {
                console.log(`⚠️ Chat session for ${userId} got corrupted (400). Resetting chat history...`);
                // Clear the corrupted chat by starting a new one
                chat = model.startChat();
                userChats.set(userId, chat);
                // Retry with the new chat session
                const result = await chat.sendMessage(enrichedMessage);
                return result.response.text();
            } else {
                throw error;
            }
        }
    }
}

// Global Queue System for Free Tier Concurrency Limits
const messageQueue = [];
let isProcessingQueue = false;

async function processQueue() {
    if (isProcessingQueue || messageQueue.length === 0) return;
    
    isProcessingQueue = true;
    while (messageQueue.length > 0) {
        const { message, chat } = messageQueue.shift();
        
        try {
            console.log(`⏳ Processing queued message from ${message.from}...`);
            
            // AI ko customer ka message bhejo (with Auto-Retry)
            let responseText = await sendMessageWithRetry(message.from, chat, message.body);

            // --- EMAIL SENDING LOGIC (XML BASED) ---
            const emailMatch = responseText.match(/<EMAIL>[\s\S]*?<TO>\s*(.*?)\s*<\/TO>[\s\S]*?<SUBJECT>\s*(.*?)\s*<\/SUBJECT>[\s\S]*?<BODY>\s*([\s\S]*?)\s*<\/BODY>[\s\S]*?<\/EMAIL>/i);
            
            if (emailMatch) {
                const customerEmail = emailMatch[1].trim();
                const emailSubject = emailMatch[2].trim();
                const emailBody = emailMatch[3].trim();

                console.log(`📧 Sending professional email to ${customerEmail}...`);
                
                // Remove the entire XML block from the WhatsApp reply so the customer only sees the conversation!
                responseText = responseText.replace(/<EMAIL>[\s\S]*?<\/EMAIL>/i, '').trim();

                const nodemailer = require('nodemailer');
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'iti.cloudsvc@gmail.com',
                        pass: process.env.EMAIL_PASSWORD
                    }
                });

                let formattedBody = emailBody.trim();
                if (!formattedBody.toLowerCase().includes('warm regards')) {
                    formattedBody += '\n\nWarm regards,\nRitu\nSales Manager, Axis Bank';
                }

                const mailOptions = {
                    from: 'iti.cloudsvc@gmail.com',
                    to: customerEmail,
                    subject: emailSubject,
                    text: formattedBody
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log('❌ Error sending email:', error.message);
                    } else {
                        console.log('✅ Professional Email sent successfully:', info.response);
                    }
                });
            }
            // ---------------------------

            // --- PHOTO SENDING LOGIC ---
            const photoMatch = responseText.match(/\[SEND_PHOTO:\s*(.*?)\]/i);
            if (photoMatch) {
                const folderPath = photoMatch[1].trim();
                console.log(`📸 Customer requested photo from: ${folderPath}`);
                responseText = responseText.replace(photoMatch[0], '').trim();

                const path = require('path');
                const fs = require('fs');
                const { MessageMedia } = require('whatsapp-web.js');

                const absolutePath = path.join(__dirname, 'properties', folderPath);
                
                if (fs.existsSync(absolutePath)) {
                    const files = fs.readdirSync(absolutePath);
                    const imageFiles = files.filter(f => f.match(/\.(jpg|jpeg|png)$/i));
                    if (imageFiles.length > 0) {
                        const imagePath = path.join(absolutePath, imageFiles[0]);
                        const media = MessageMedia.fromFilePath(imagePath);
                        setTimeout(() => {
                            message.reply(media);
                        }, 4000);
                        console.log(`✅ Photo sent: ${imageFiles[0]}`);
                    } else {
                        console.log(`❌ No images found in folder: ${absolutePath}`);
                    }
                } else {
                    console.log(`❌ Folder does not exist: ${absolutePath}`);
                }
            }
            // ---------------------------

            // --- LEAD TO COMPANY LOGIC (XML BASED) ---
            const meetingMatch = responseText.match(/<BOOK_MEETING>[\s\S]*?<NAME>\s*(.*?)\s*<\/NAME>[\s\S]*?<MOBILE>\s*(.*?)\s*<\/MOBILE>[\s\S]*?<EMAIL>\s*(.*?)\s*<\/EMAIL>[\s\S]*?<PRODUCT>\s*(.*?)\s*<\/PRODUCT>[\s\S]*?<TIME>\s*(.*?)\s*<\/TIME>[\s\S]*?(?:<CALENDAR_DATES>\s*(.*?)\s*<\/CALENDAR_DATES>)?[\s\S]*?<\/BOOK_MEETING>/i);
            
            if (meetingMatch) {
                const name = meetingMatch[1].trim();
                const mobile = meetingMatch[2].trim();
                const email = meetingMatch[3].trim();
                const product = meetingMatch[4].trim();
                const time = meetingMatch[5].trim();
                const calendarDates = meetingMatch[6] ? meetingMatch[6].trim() : '';
                
                console.log(`📅 Lead/Meeting Booked: ${name} at ${time}`);
                responseText = responseText.replace(/<BOOK_MEETING>[\s\S]*?<\/BOOK_MEETING>/i, '').trim();
                
                const nodemailer = require('nodemailer');
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'iti.cloudsvc@gmail.com',
                        pass: process.env.EMAIL_PASSWORD
                    }
                });

                // 1. Email to the Company (Lead Alert)
                const mailOptionsCompany = {
                    from: '"Axis Bank AI (Ritu)" <iti.cloudsvc@gmail.com>',
                    to: 'iti.cloudsvc@gmail.com',
                    subject: `🚨 NEW LEAD & MEETING: ${name} at ${time}`,
                    text: `Hello Axis Bank Team,\n\nA new customer just booked an appointment via the WhatsApp Bot:\n\nName: ${name}\nMobile: ${mobile}\nEmail: ${email}\nRequirement: ${product}\nMeeting Time: ${time}`
                };

                transporter.sendMail(mailOptionsCompany, (error, info) => {
                    if (error) {
                        console.log('❌ Error sending lead email to company:', error.message);
                    } else {
                        console.log('✅ Lead details emailed to company successfully!');
                    }
                });

                // 2. Email to the Customer (Meeting Invitation / Confirmation)
                if (email && email.toLowerCase() !== 'n/a' && email.includes('@')) {
                    let calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Meeting+with+Axis+Bank&details=Discussion+regarding+${encodeURIComponent(product)}`;
                    if (calendarDates) {
                        calendarLink += `&dates=${calendarDates}`;
                    }
                    
                    const mailOptionsCustomer = {
                        from: '"Axis Bank (Ritu)" <iti.cloudsvc@gmail.com>',
                        to: email,
                        subject: `Meeting Invitation: Axis Bank`,
                        text: `Hello ${name},\n\nYour meeting regarding '${product}' has been successfully scheduled for ${time}.\n\nOur executive will connect with you on your mobile (${mobile}) shortly before the meeting.\n\nTo add this meeting to your calendar and receive reminders, please click the link below:\n${calendarLink}\n\nWe look forward to speaking with you!\n\nBest Regards,\nRitu\nSales Manager, Axis Bank`
                    };

                    transporter.sendMail(mailOptionsCustomer, (error, info) => {
                        if (error) {
                            console.log('❌ Error sending meeting invite to customer:', error.message);
                        } else {
                            console.log('✅ Meeting invitation emailed to customer successfully!');
                        }
                    });
                }
            }
            
            // Check for Lead Tag [SEND_LEAD_TO_COMPANY]
            const leadMatch = responseText.match(/\[SEND_LEAD_TO_COMPANY:\s*([\s\S]*?)\]/i);
            if (leadMatch) {
                const leadDetails = leadMatch[1].trim();
                responseText = responseText.replace(leadMatch[0], '').trim();
                
                if (!leadsSent.has(message.from)) {
                    leadsSent.add(message.from);
                    console.log(`📅 Lead details captured: ${leadDetails}`);
                    
                    const nodemailer = require('nodemailer');
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: { user: 'iti.cloudsvc@gmail.com', pass: process.env.EMAIL_PASSWORD }
                    });

                    transporter.sendMail({
                        from: 'iti.cloudsvc@gmail.com',
                        to: 'iti.cloudsvc@gmail.com',
                        subject: '🚨 NEW LEAD DETAILS CAPTURED',
                        text: `Hello Axis Bank Team,\n\nA customer shared contact details:\n\n${leadDetails}`
                    }, (err) => {
                        if (err) console.log('❌ Error sending lead email:', err.message);
                        else console.log('✅ Lead email sent to company successfully!');
                    });
                } else {
                    console.log(`ℹ️ Lead alert already sent previously for ${message.from}. Skipping duplicate lead email.`);
                }
            }
            // ---------------------------

            // Reply directly (text part)
            message.reply(responseText);
            console.log(`🤖 AI Reply to ${message.from}: ${responseText}`);

        } catch (error) {
            console.error(`❌ Error in generating AI reply for ${message.from}:`, error);
        }

        // Add a small 1-second delay between processing customers to keep Google API happy
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    isProcessingQueue = false;
}

// Save the bot's start time to ignore old unread messages flooding in on startup
// 6. Listen for incoming messages
client.on('message', async (message) => {
    console.log(`\n[DEBUG] Ping Check! Message detected from: ${message.from} | Type: ${message.type} | Body: ${message.body}`);
    try {
        // FIX 1: Strict Sync Lock - Ignore all messages received while the bot is still booting up and syncing history
        if (!isBotReady) {
            return;
        }

        // FIX 3: Ignore non-chat messages (like system notifications, security code changes, pure media without text)
        if (message.type !== 'chat') {
            // Uncomment the line below if you want to see when non-text messages are ignored
            // console.log(`[System] Ignored non-text message type: ${message.type} from ${message.from}`);
            return;
        }

        // FIX 4: Ignore completely empty messages
        if (!message.body || message.body.trim() === '') {
            return;
        }

        // Ignore status updates, Broadcasts, & Self messages
        if (message.from === 'status@broadcast') return;
        if (message.from.includes('@broadcast')) return;
        if (message.fromMe) return;

        // FIX 5: Safer Group Check (Avoids Puppeteer crash on @lid contacts)
        // Since we already block non-chat types above, we don't need getChat() to check for system group events anymore.
        if (message.from.includes('@g.us')) {
            return;
        }

        // Safely check for Verified Companies (Green Tick accounts)
        // We wrap this in a try-catch because getContact() crashes WhatsApp Web JS for certain @lid (Linked Device) accounts.
        try {
            if (!message.from.includes('@lid')) {
                const contact = await message.getContact();
                if (contact.isVerified) {
                    // console.log(`🚫 Ignored automated message from Verified Bank/Company`);
                    return;
                }
            }
        } catch (err) {
            // Silently ignore contact fetch errors so the bot can still reply to the customer
            // console.log("Could not fetch contact details, proceeding to reply anyway.");
        }

        console.log(`📩 Message received from ${message.from}: ${message.body}`);

        // Customer ki purani chat history dhoondho, agar nahi hai toh naya session banao
        let chat = userChats.get(message.from);
        if (!chat) {
            chat = model.startChat();
            userChats.set(message.from, chat);
            console.log(`🆕 Naya Customer add hua: ${message.from}`);
        }
        
        // Push to queue and trigger processing
        messageQueue.push({ message, chat });
        processQueue();

    } catch (error) {
        console.error('❌ Error handling incoming message:', error);
    }
});

console.log('Starting WhatsApp Client...');
client.initialize();
