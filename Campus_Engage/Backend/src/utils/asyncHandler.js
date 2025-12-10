const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))//do gpt for more for this code
            .catch((err) => next(err));
    }
}

export { asyncHandler }