import { connectToDatabase } from "@/lib/db";
import { User, IUserDocument } from "@/models/User";
import { objectIdSchema } from "@/schemas/common.schema";

export class UserRepository {
  /**
   * Finds a user by email address.
   */
  static async findByEmail(email: string): Promise<IUserDocument | null> {
    await connectToDatabase();
    return User.findOne({ email }).exec();
  }

  /**
   * Finds a user by their MongoDB ObjectId.
   */
  static async findById(id: string): Promise<IUserDocument | null> {
    const parseResult = objectIdSchema.safeParse(id);
    if (!parseResult.success) return null;

    await connectToDatabase();
    return User.findById(id).exec();
  }

  /**
   * Creates a new user record.
   */
  static async create(userData: {
    email: string;
    passwordHash: string;
    name: string;
  }): Promise<IUserDocument> {
    await connectToDatabase();
    const user = new User(userData);
    return user.save();
  }
}
