const http = require('http');

const data = JSON.stringify({
    userId: 1,
    subjectId: 1,
    quizSessionId: 'test-session-123',
    results: [
        { question_id: 1, selected_option: 'A', is_correct: true }
    ]
});

const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/submit-quiz',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, (res) => {
    let output = '';
    res.on('data', chunk => output += chunk);
    res.on('end', () => console.log('STATUS:', res.statusCode, output));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
