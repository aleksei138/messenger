module.exports = errorHandler;

function errorHandler(err, req, res, next) {
    if (typeof (err) === 'string') {
        // custom application error
        return res.status(400).json({ message: err });
    }

    // jwt authentication error
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ message: "invalid token"})
    }

    // default to 500 server error
    return res.status(500).json({ message: err.message });
}