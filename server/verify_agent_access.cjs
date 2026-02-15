const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

async function verifyAgentAccess() {
    let log = '';
    const addLog = (msg) => {
        console.log(msg);
        log += msg + '\n';
    };

    try {
        const loginUrl = 'http://localhost:5000/api/auth/login';
        const statsUrl = 'http://localhost:5000/api/agent/dashboard-stats';

        addLog('Logging in as kenil@gmail.com...');
        // Note: Password for kenil was set during his initial creation or I promoted him?
        // Wait, kenil was an existing user. I don't know his password.
        // But I know admin_test@print24.com's password.

        // Let's use the verify_role_api.cjs logic but for stats check.
        // I'll promote a user I CONTROL to agent and check their stats.

        addLog('Logging in as test admin to check user state...');
        // ...

        // Actually, I'll just check if the FEATURE is now available for the segment via a direct DB check script 
        // to avoid password guessing. 
        // But the user test is the most important.

        // I created 'test_agent@print24.com' with 'password123' in setup_test_agent.cjs.
        // Let's use that one.

        addLog('Logging in as super_agent@print24.com...');
        const loginRes = await axios.post(loginUrl, {
            email: 'super_agent@print24.com',
            password: 'password123'
        });

        const token = loginRes.data.token;
        addLog('Login successful. Token obtained.');

        addLog('Checking dashboard stats access...');
        const statsRes = await axios.get(statsUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });

        addLog('Stats result: ' + JSON.stringify(statsRes.data, null, 2));

        if (statsRes.data.success) {
            addLog('✅ API Verification SUCCESS: Dashboard stats accessible');
        } else {
            addLog('❌ API Verification FAILED');
        }

    } catch (err) {
        addLog('API Verification error: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
    } finally {
        fs.writeFileSync('final_verify_log.txt', log);
    }
}

verifyAgentAccess();
