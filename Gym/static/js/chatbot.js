// AI Chatbot Logic
document.addEventListener('DOMContentLoaded', () => {
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotBody = document.getElementById('chatbot-body');
    const chatbotInput = document.querySelector('.chatbot-input');
    const chatInputField = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send');

    // Toggle chatbot visibility
    chatbotToggle.addEventListener('click', () => {
        const isCollapsed = chatbotBody.classList.contains('collapsed');
        if (isCollapsed) {
            chatbotBody.classList.remove('collapsed');
            chatbotInput.classList.remove('collapsed');
            chatbotToggle.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
        } else {
            chatbotBody.classList.add('collapsed');
            chatbotInput.classList.add('collapsed');
            chatbotToggle.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
        }
    });

    // Handle sending messages
    const sendMessage = () => {
        const message = chatInputField.value.trim();
        if (message === '') return;

        // Add user message
        appendMessage('user', message);
        chatInputField.value = '';

        // Simulate typing delay
        setTimeout(() => {
            const response = generateResponse(message.toLowerCase());
            appendMessage('bot', response);
        }, 600 + Math.random() * 500);
    };

    chatSendBtn.addEventListener('click', sendMessage);
    chatInputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${sender}`;
        msgDiv.textContent = text;
        chatbotBody.appendChild(msgDiv);
        
        // Scroll to bottom
        chatbotBody.scrollTop = chatbotBody.scrollHeight;
    }

    // Simple keyword-based response generator
    function generateResponse(msg) {
        if (msg.includes('price') || msg.includes('cost') || msg.includes('membership') || msg.includes('how much')) {
            return "Our memberships start at $49/mo for the Base plan. We also offer Pro ($79/mo) and Elite ($129/mo) tiers. You can check the Memberships page for full details!";
        } else if (msg.includes('hour') || msg.includes('time') || msg.includes('open') || msg.includes('close')) {
            return "We are open Monday to Friday from 5:00 AM to 11:00 PM, and on weekends from 6:00 AM to 9:00 PM.";
        } else if (msg.includes('class') || msg.includes('yoga') || msg.includes('hiit') || msg.includes('spin')) {
            return "We offer a variety of classes including HIIT Forge, Zenith Yoga, Apex Spin, and Titan Strength. Check out our Classes and Schedule pages to see when they run!";
        } else if (msg.includes('location') || msg.includes('where') || msg.includes('address')) {
            return "We are located at 1042 Ironclad Blvd, Metro City, NY 10001.";
        } else if (msg.includes('personal training') || msg.includes('trainer') || msg.includes('coach') || msg.includes('pt')) {
            return "Yes! Our elite trainers, including Marcus, Elena, and David, are available for personal training. The Elite membership includes 2 PT sessions per month.";
        } else if (msg.includes('hello') || msg.includes('hi ') || msg.includes('hey')) {
            return "Hello! How can I help you forge your legacy today?";
        } else if (msg.includes('free trial') || msg.includes('guest') || msg.includes('try')) {
            return "Our Pro plan includes 1 guest pass per month, and Elite includes 4. Drop by the front desk if you'd like to arrange a 1-day free trial!";
        } else {
            return "I'm not entirely sure about that. Could you try rephrasing, or visit our Contact page to send us a direct message?";
        }
    }
});
