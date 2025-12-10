class ApiError extends Error {
    //A class is a blueprint for creating objects that share the same properties and methods.
    //The constructor is a special function inside a class that runs automatically whenever you create a new instance of that class using new.
    //"extends" is used to inherit another class.
    constructor(//these are the parameters of this constructor
        statusCode,
        message = "Somethiing went wrong",
        errors = [],
        stack = ""
    ) {//this is the body of this constructor
        //super() is used inside a subclass constructor to call the parent class’s constructor.
        // When you extend another class, you must call super() before using this.
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.success = false
        this.errors = errors
        if (stack) {
            this.stack = stack;
            /* The .stack property shows where the error happened (file, line number, etc.)
                If a stack trace is manually provided → use that.
                Otherwise, Error.captureStackTrace() automatically generates one. */
        }
        else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };