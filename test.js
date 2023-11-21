async function sendMessage(message) {
    try {
        const body = new URLSearchParams({
            'grant_type': 'refresh_token',
            'refresh_token': 'rlj2gb6m0xnbapr22me89wf72mpkjz6m7pp1l5v2il7igm8mtx',
            'client_id': '3qycbnwtdxdotr3q02dfyc737rpyly',
            'client_secret': 'iujyuoestmm6rbec07cc5vlmf9vl8e'
        });
        
        const response = await fetch("https://id.twitch.tv/oauth2/token", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json(); // Assuming the response is in JSON format
        return data;
    } catch (error) {
        console.error('Error refreshing token:', error.message);
        // Handle the error, e.g., log it or take appropriate action
    }
}

// Usage
(async () => {
    try {
        const result = await sendMessage("test");
        console.log(result);
    } catch (error) {
        console.error('Error:', error);
    }
})();
