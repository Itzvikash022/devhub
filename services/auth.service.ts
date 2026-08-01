import bcrypt from "bcryptjs";
import { UserRepository } from "@/repositories/user.repository";
import { RegisterInput, LoginInput } from "@/schemas/auth.schema";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth/jwt";
import type { Session } from "@/types/auth.types";

export class AuthService {
  /**
   * Registers a new user. Throws if the email is already registered.
   */
  static async register(input: RegisterInput): Promise<Session> {
    const existingUser = await UserRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error("EMAIL_TAKEN");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await UserRepository.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });

    return {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    };
  }

  /**
   * Authenticates a user. Returns a session and signed access/refresh tokens.
   */
  static async login(
    input: LoginInput
  ): Promise<{ session: Session; accessToken: string; refreshToken: string }> {
    const user = await UserRepository.findByEmail(input.email);
    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const session: Session = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    const accessToken = signAccessToken(session);
    const refreshToken = signRefreshToken(session);

    return { session, accessToken, refreshToken };
  }

  /**
   * Refreshes JWT credentials using an active refresh token.
   */
  static async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = verifyRefreshToken(token);

    const user = await UserRepository.findById(payload.userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const session: Session = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    const accessToken = signAccessToken(session);
    const refreshToken = signRefreshToken(session);

    return { accessToken, refreshToken };
  }
}
