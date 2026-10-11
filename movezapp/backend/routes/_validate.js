const isNumber = (value) => Number.isFinite(Number(value));

const requireBody = (req, res, fields) => {
    const missing = fields.filter((field) => req.body?.[field] === undefined || req.body?.[field] === null || req.body?.[field] === "");
    if (missing.length) {
        res.status(400).json({ ok: false, error: `Missing fields: ${missing.join(", ")}` });
        return false;
    }
    return true;
};

const requireNumber = (req, res, field) => {
    if (!isNumber(req.body?.[field])) {
        res.status(400).json({ ok: false, error: `${field} must be a number` });
        return false;
    }
    return true;
};

const requireArray = (req, res, field) => {
    if (!Array.isArray(req.body?.[field])) {
        res.status(400).json({ ok: false, error: `${field} must be an array` });
        return false;
    }
    return true;
};

module.exports = {
    isNumber,
    requireBody,
    requireNumber,
    requireArray,
};
