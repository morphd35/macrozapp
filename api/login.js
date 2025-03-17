module.exports = (req, res) => {
    console.log(`Received ${req.method} request to /api/login with body:`, req.body);
    if (req.method === 'POST') {
        res.status(200).json({ message: 'POST to /api/login works' });
    } else {
        res.status(405).json({ error: 'Method Not Allowed' });
    }
};