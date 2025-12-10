import userModel from "./models/userModel.js";
import bcrypt from "bcrypt";

// Define your Chiefs here (or load from a config file)
const initialChiefs = [
    {
        fullName: "Shikhar",
        email: "chief.cse@college.edu",
        password: process.env.CHIEF_PASSWORD,
        role: "CHIEF"
    },
    {
        fullName: "KP",
        email: "chief.ece@college.edu",
        password: process.env.CHIEF_PASSWORD,
        role: "CHIEF"
    }
];

const seedChief = async () => {
    try {
        for (const chief of initialChiefs) {
            const chiefExists = await userModel.findOne({ email: chief.email });
            if (!chiefExists) {
                const hashedPassword = await bcrypt.hash(chief.password, 10);
                await userModel.create({ ...chief, password: hashedPassword });
                console.log(`[SEED] Created default Chief: ${chief.email}`);
            }
        }
    } catch (error) {
        console.error("Seeding error --->", error);
    }
}

export default seedChief;