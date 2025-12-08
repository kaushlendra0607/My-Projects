import mongoose from "mongoose";

const regSchema = new mongoose.Schema({
    event:{type:mongoose.Schema.Types.ObjectId,ref:'Event'},
    user:{type:mongoose.Schema.Types.ObjectId,ref:'User'},
    registeredAt:{type:Date,default:Date.now(),}
});
// Compound index to ensure one user can't register twice for the same event
regSchema.index({ event: 1, user: 1 }, { unique: true });

const registrationModel = mongoose.models.Register || mongoose.model('Register',regSchema);

export default registrationModel;