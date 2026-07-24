import bcrypt from "bcrypt";
import "dotenv/config";

export class BcryptUtils {
    static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 12);
    }
    static async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword);
    }
}