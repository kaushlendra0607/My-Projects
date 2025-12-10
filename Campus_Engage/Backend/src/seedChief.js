import userModel from "./models/userModel.js";
import bcrypt from "bcrypt";

const initialChiefs = [
    {
        fullName: "Shikhar",
        email: "chief.cse@college.edu",
        role: "CHIEF",
        userName: "shikhar"
    },
    {
        fullName: "KP",
        email: "chief.ece@college.edu",
        role: "CHIEF",
        userName: "kp"
    }
];

const seedChief = async () => {
    try {
        const defaultPassword = process.env.CHIEF_PASSWORD;
        if (!defaultPassword) {
            console.warn("[SEED] CHIEF_PASSWORD not set in env — skipping seed.");
            return;
        }

        const hashedDefault = await bcrypt.hash(defaultPassword, 10);

        for (const chief of initialChiefs) {
            const chiefExists = await userModel.findOne({ email: chief.email });
            if (!chiefExists) {
                await userModel.create({
                    ...chief,
                    password: hashedDefault,
                    isDefaultPassword: true // flag to force change on first login
                });
                console.log(`[SEED] Created default Chief: ${chief.email}`);
            }
        }
    } catch (error) {
        console.error("Seeding error --->", error);
    }
};

export default seedChief;
