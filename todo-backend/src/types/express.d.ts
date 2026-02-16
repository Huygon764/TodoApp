import type { JwtPayload } from "./auth.types.js";
import type { IUserDocument } from "./models/user.model.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      userDoc?: IUserDocument;
    }
  }
}

export {};
